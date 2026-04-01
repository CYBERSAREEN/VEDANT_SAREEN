const express = require('express');
const path    = require('path');
const app     = express();
const PORT    = process.env.PORT || 3000;

/* ── VIEW ENGINE ── */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/* ── STATIC ASSETS (Portfolio) ── */
app.use(express.static(path.join(__dirname, 'public')));

/* ── BODY PARSERS ── */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ── RESUME DOWNLOADS ── */
app.get('/resume/Vedant_Cybersecurity_Resume.pdf', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'Vedant_Cybersecurity_Resume.pdf'));
});
app.get('/resume/Vedant_Musician_Resume.pdf', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'Resume - Professional Musician (1).pdf'));
});

/* ══════════════════════════════════════════════════════════════
   MOUNT SUB-APPS:  /jwt  and  /crawler
   Each sub-app is a self-contained Express app from its own folder
   one level up (../JWT and ../webcrawler).
   ══════════════════════════════════════════════════════════════ */

/* ── JWT Security Module ── */
const jwtApp = express();
jwtApp.set('view engine', 'ejs');
jwtApp.set('views', path.join(__dirname, 'JWT', 'views'));
jwtApp.use(express.json());
jwtApp.use(express.urlencoded({ extended: true }));
try { jwtApp.use(require('cookie-parser')()); } catch(e) {}
jwtApp.use('/public', express.static(path.join(__dirname, 'JWT', 'public')));

// Mount JWT routes — requiring from ./JWT
try {
  const jwtPageRoutes = require('./JWT/routes/pages');
  const jwtApiRoutes  = require('./JWT/routes/api');
  jwtApp.use('/', jwtPageRoutes);
  jwtApp.use('/api', jwtApiRoutes);
} catch(e) {
  jwtApp.get('/', (req, res) => res.send('JWT module routes not found: ' + e.message));
}
app.use('/jwt', jwtApp);

/* ── WebCrawler ── */
const crawlerApp = express();
crawlerApp.set('view engine', 'ejs');
crawlerApp.set('views', path.join(__dirname, 'webcrawler', 'views'));
crawlerApp.use(express.json());
crawlerApp.use(express.urlencoded({ extended: true }));
crawlerApp.use(express.static(path.join(__dirname, 'webcrawler', 'public')));

// Mount Crawler routes — requiring from ./webcrawler
try {
  const crawlerRouter = require('./webcrawler/routes/crawler');
  crawlerApp.use('/', crawlerRouter);
} catch(e) {
  crawlerApp.get('/', (req, res) => res.send('Crawler routes not found: ' + e.message));
}
app.use('/crawler', crawlerApp);

/* ── PORTFOLIO HOME ── */
app.get('/', (req, res) => res.render('index'));

/* ── START ── */
app.listen(PORT, () => {
  console.log(`\n  Portfolio live at http://localhost:${PORT}`);
  console.log(`  JWT Module   → http://localhost:${PORT}/jwt`);
  console.log(`  Web Crawler  → http://localhost:${PORT}/crawler\n`);
});
