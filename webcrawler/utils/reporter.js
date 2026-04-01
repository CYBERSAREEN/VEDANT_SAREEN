/**
 * Report Generator — CSV + JSON reports
 */

const fs = require('fs');
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');

const REPORTS_DIR = path.join(__dirname, '..', 'reports');

async function generateReports(results, sessionId) {
  const dir = path.join(REPORTS_DIR, sessionId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const files = [];

  // 1. Summary JSON
  const summaryPath = path.join(dir, 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({
    target: results.target,
    maxDepth: results.maxDepth,
    summary: results.summary,
    startTime: results.startTime,
    endTime: results.endTime,
    duration: results.duration,
    generatedAt: new Date().toISOString()
  }, null, 2));
  files.push({ name: 'summary.json', path: summaryPath, label: 'Summary JSON' });

  // 2. Full results JSON
  const fullPath = path.join(dir, 'full_results.json');
  // Convert sets/maps to serializable form
  fs.writeFileSync(fullPath, JSON.stringify(results, null, 2));
  files.push({ name: 'full_results.json', path: fullPath, label: 'Full Results JSON' });

  // 3. Emails CSV
  const emailData = Object.entries(results.emails || {}).map(([email, data]) => ({
    email,
    confidence: data.confidence === 3 ? 'HIGH' : data.confidence === 2 ? 'MEDIUM' : 'LOW',
    confidence_score: data.confidence,
    found_on: (data.sources || []).join(' | '),
    source_count: (data.sources || []).length
  }));

  if (emailData.length > 0) {
    const emailPath = path.join(dir, 'emails.csv');
    const emailWriter = createObjectCsvWriter({
      path: emailPath,
      header: [
        { id: 'email', title: 'Email Address' },
        { id: 'confidence', title: 'Confidence' },
        { id: 'confidence_score', title: 'Score' },
        { id: 'source_count', title: 'Found On (pages)' },
        { id: 'found_on', title: 'Source URLs' }
      ]
    });
    await emailWriter.writeRecords(emailData);
    files.push({ name: 'emails.csv', path: emailPath, label: 'Emails CSV' });
  }

  // 4. Phones CSV
  const phoneData = Object.entries(results.phones || {}).map(([phone, data]) => ({
    phone,
    confidence: data.confidence === 3 ? 'HIGH' : data.confidence === 2 ? 'MEDIUM' : 'LOW',
    confidence_score: data.confidence,
    found_on: (data.sources || []).join(' | '),
    source_count: (data.sources || []).length
  }));

  if (phoneData.length > 0) {
    const phonePath = path.join(dir, 'phones.csv');
    const phoneWriter = createObjectCsvWriter({
      path: phonePath,
      header: [
        { id: 'phone', title: 'Phone Number' },
        { id: 'confidence', title: 'Confidence' },
        { id: 'confidence_score', title: 'Score' },
        { id: 'source_count', title: 'Found On (pages)' },
        { id: 'found_on', title: 'Source URLs' }
      ]
    });
    await phoneWriter.writeRecords(phoneData);
    files.push({ name: 'phones.csv', path: phonePath, label: 'Phone Numbers CSV' });
  }

  // 5. Links CSV
  const linkData = Object.entries(results.links || {}).map(([url, data]) => ({
    url,
    domain: data.domain,
    type: data.internal ? 'INTERNAL' : 'EXTERNAL',
    depth: data.depth,
    found_on: data.foundOn
  }));

  if (linkData.length > 0) {
    const linksPath = path.join(dir, 'links.csv');
    const linksWriter = createObjectCsvWriter({
      path: linksPath,
      header: [
        { id: 'url', title: 'URL' },
        { id: 'domain', title: 'Domain' },
        { id: 'type', title: 'Type' },
        { id: 'depth', title: 'Depth Found' },
        { id: 'found_on', title: 'Found On' }
      ]
    });
    await linksWriter.writeRecords(linkData);
    files.push({ name: 'links.csv', path: linksPath, label: 'Links CSV' });
  }

  // 6. Forms CSV
  if (results.forms && results.forms.length > 0) {
    const formsPath = path.join(dir, 'forms.csv');
    const formsWriter = createObjectCsvWriter({
      path: formsPath,
      header: [
        { id: 'page', title: 'Page URL' },
        { id: 'type', title: 'Form Type' },
        { id: 'method', title: 'Method' },
        { id: 'action', title: 'Action' },
        { id: 'inputCount', title: 'Input Fields' },
        { id: 'hasPassword', title: 'Has Password' },
        { id: 'hasFileUpload', title: 'Has File Upload' }
      ]
    });
    await formsWriter.writeRecords(results.forms.map(f => ({
      ...f,
      hasPassword: f.hasPassword ? 'YES' : 'NO',
      hasFileUpload: f.hasFileUpload ? 'YES' : 'NO'
    })));
    files.push({ name: 'forms.csv', path: formsPath, label: 'Forms CSV' });
  }

  // 7. Pages crawled CSV
  if (results.pages && results.pages.length > 0) {
    const pagesPath = path.join(dir, 'pages_crawled.csv');
    const pagesWriter = createObjectCsvWriter({
      path: pagesPath,
      header: [
        { id: 'url', title: 'URL' },
        { id: 'depth', title: 'Depth' },
        { id: 'status', title: 'HTTP Status' },
        { id: 'title', title: 'Page Title' },
        { id: 'framework', title: 'Framework Detected' },
        { id: 'emailsFound', title: 'Emails Found' },
        { id: 'phonesFound', title: 'Phones Found' },
        { id: 'linksFound', title: 'Links Found' },
        { id: 'formsFound', title: 'Forms Found' }
      ]
    });
    await pagesWriter.writeRecords(results.pages);
    files.push({ name: 'pages_crawled.csv', path: pagesPath, label: 'Pages Crawled CSV' });
  }

  // 8. Errors CSV
  if (results.errors && results.errors.length > 0) {
    const errorsPath = path.join(dir, 'errors.csv');
    const errorsWriter = createObjectCsvWriter({
      path: errorsPath,
      header: [
        { id: 'url', title: 'URL' },
        { id: 'error', title: 'Error' }
      ]
    });
    await errorsWriter.writeRecords(results.errors);
    files.push({ name: 'errors.csv', path: errorsPath, label: 'Errors CSV' });
  }

  return { dir, files };
}

module.exports = { generateReports, REPORTS_DIR };
