const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const { IntelligentCrawler } = require('../utils/crawler');
const { generateReports, REPORTS_DIR } = require('../utils/reporter');

// In-memory session store
const sessions = {};
// SSE client store
const sseClients = {};

// ─── HOME ─────────────────────────────────────────────────────────────────────

router.get('/', (req, res) => {
  res.render('index');
});

// ─── START CRAWL ─────────────────────────────────────────────────────────────

router.post('/crawl/start', async (req, res) => {
  let { url, depth, delay, stayOnDomain } = req.body;

  if (!url || !url.trim()) {
    return res.status(400).json({ error: 'URL is required' });
  }

  url = url.trim();
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  const sessionId = uuidv4();
  sessions[sessionId] = {
    id: sessionId,
    status: 'running',
    url,
    depth: parseInt(depth) || 2,
    startTime: Date.now(),
    events: [],
    results: null,
    crawler: null
  };

  sseClients[sessionId] = new Set();

  const broadcast = (event) => {
    const session = sessions[sessionId];
    if (!session) return;
    session.events.push(event);
    // Keep only last 500 events in memory
    if (session.events.length > 500) session.events = session.events.slice(-500);
    
    for (const client of sseClients[sessionId] || []) {
      try {
        client.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch (_) {}
    }
  };

  const crawler = new IntelligentCrawler({
    url,
    depth: parseInt(depth) || 2,
    delay: parseFloat(delay) || 0.5,
    stayOnDomain: stayOnDomain !== 'false',
    sessionId,
    onEvent: broadcast
  });

  sessions[sessionId].crawler = crawler;

  // Run async
  crawler.crawl().then(async (results) => {
    sessions[sessionId].status = 'complete';
    sessions[sessionId].results = results;
    sessions[sessionId].crawler = null;

    try {
      const reportInfo = await generateReports(results, sessionId);
      sessions[sessionId].reportDir = reportInfo.dir;
      sessions[sessionId].reportFiles = reportInfo.files;
      broadcast({ type: 'reports_ready', payload: { sessionId, files: reportInfo.files.map(f => f.name) } });
    } catch (e) {
      broadcast({ type: 'report_error', payload: { error: e.message } });
    }
  }).catch(err => {
    sessions[sessionId].status = 'error';
    broadcast({ type: 'error', payload: { error: err.message } });
  });

  res.json({ sessionId, status: 'started' });
});

// ─── SSE STREAM ──────────────────────────────────────────────────────────────

router.get('/crawl/stream/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessions[sessionId];

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Send existing events to catch up
  for (const event of session.events) {
    try {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch (_) {}
  }

  // If already complete, send terminal event and close
  if (session.status === 'complete' || session.status === 'error') {
    res.end();
    return;
  }

  // Register live client
  if (!sseClients[sessionId]) sseClients[sessionId] = new Set();
  sseClients[sessionId].add(res);

  // Heartbeat
  const hb = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch (_) { clearInterval(hb); }
  }, 15000);

  req.on('close', () => {
    clearInterval(hb);
    if (sseClients[sessionId]) sseClients[sessionId].delete(res);
  });
});

// ─── STOP CRAWL ──────────────────────────────────────────────────────────────

router.post('/crawl/stop/:sessionId', (req, res) => {
  const session = sessions[req.params.sessionId];
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (session.crawler) {
    session.crawler.stop();
    session.status = 'stopped';
  }
  res.json({ status: 'stopped' });
});

// ─── RESULTS PAGE ─────────────────────────────────────────────────────────────

router.get('/results/:sessionId', (req, res) => {
  const session = sessions[req.params.sessionId];
  if (!session) return res.status(404).send('Session not found');
  res.render('results', { session });
});

// ─── DOWNLOAD SINGLE FILE ─────────────────────────────────────────────────────

router.get('/download/:sessionId/:filename', (req, res) => {
  const { sessionId, filename } = req.params;
  const session = sessions[sessionId];

  if (!session || !session.reportDir) {
    return res.status(404).send('Report not found');
  }

  // Security: ensure filename is safe
  const safe = path.basename(filename);
  const filePath = path.join(session.reportDir, safe);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  res.download(filePath, safe);
});

// ─── DOWNLOAD ALL AS ZIP ─────────────────────────────────────────────────────

router.get('/download/:sessionId', (req, res) => {
  const session = sessions[req.params.sessionId];

  if (!session || !session.reportDir) {
    return res.status(404).send('Reports not ready');
  }

  const hostname = (() => {
    try { return new URL(session.url).hostname.replace(/[^a-z0-9]/gi, '_'); } catch (_) { return 'crawl'; }
  })();

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename=crawlerx_${hostname}_${req.params.sessionId.slice(0, 8)}.zip`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', err => { console.error(err); res.end(); });
  archive.pipe(res);
  archive.directory(session.reportDir, false);
  archive.finalize();
});

// ─── SESSION STATUS ───────────────────────────────────────────────────────────

router.get('/status/:sessionId', (req, res) => {
  const session = sessions[req.params.sessionId];
  if (!session) return res.status(404).json({ error: 'Not found' });
  res.json({
    status: session.status,
    url: session.url,
    startTime: session.startTime,
    results: session.results ? session.results.summary : null,
    hasReports: !!session.reportDir
  });
});

module.exports = router;
