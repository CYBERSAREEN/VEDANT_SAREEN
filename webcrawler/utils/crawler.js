/**
 * WebCrawler Engine — Intelligent Recon Crawler
 * Eliminates false positives, deduplicates, validates all findings
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

// ─── VALIDATION HELPERS ───────────────────────────────────────────────────────

const INVALID_EMAIL_EXTENSIONS = new Set([
  'png','jpg','jpeg','gif','svg','webp','ico','bmp','tiff',
  'css','js','jsx','ts','tsx','json','xml','csv','pdf','zip',
  'mp4','mp3','woff','woff2','ttf','eot','map','min'
]);

const COMMON_FAKE_EMAILS = new Set([
  'example@example.com','test@test.com','user@domain.com',
  'noreply@noreply.com','email@email.com','name@example.com',
  'info@example.com','admin@example.com','support@example.com',
  'contact@example.com','hello@example.com','your@email.com',
  'user@email.com','mail@mail.com','foo@bar.com'
]);

const INVALID_PHONE_CONTEXT_RE = [
  /version/i, /v\d+\.\d+/i,
  /rgba?\s*\(/i, /rgb/i, /opacity/i,
  /\d+px/i, /\d+em/i, /\d+rem/i, /\d+%\s/,
  /padding/i, /margin/i, /font-size/i, /border/i,
  /:\s*\d{3,}/, // CSS property values like "width: 1200"
  /port\s*[:=]\s*\d+/i,
  /timeout/i, /delay/i, /interval/i,
  /\d{4}-\d{2}-\d{2}/, // ISO dates
  /\d{2}\/\d{2}\/\d{4}/ // date formats
];

function isValidPhone(raw, contextAround) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return false;
  
  // Reject context that suggests it's NOT a phone
  for (const re of INVALID_PHONE_CONTEXT_RE) {
    if (re.test(contextAround)) return false;
  }
  
  // Reject sequences like all same digit
  if (/^(\d)\1{9,}$/.test(digits)) return false;
  
  // Reject obviously ascending/sequential
  if (digits === '1234567890' || digits === '0123456789') return false;
  
  // US phone patterns
  const usPatterns = [
    /^\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}$/,
    /^\+1[\s.\-]?\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}$/,
    /^1[\s.\-]?\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}$/,
  ];
  
  // International patterns
  const intlPatterns = [
    /^\+[2-9]\d{6,14}$/,
    /^\+\d{2}[\s.\-]\d{4,12}$/,
  ];
  
  const trimmed = raw.trim();
  for (const re of [...usPatterns, ...intlPatterns]) {
    if (re.test(trimmed)) return true;
  }
  
  return false;
}

function isValidEmail(email) {
  if (!email || email.length > 254 || email.length < 6) return false;
  
  const atIdx = email.lastIndexOf('@');
  if (atIdx < 1) return false;
  
  const local = email.slice(0, atIdx);
  const domain = email.slice(atIdx + 1);
  
  if (!local || !domain || local.length > 64 || domain.length > 253) return false;
  
  const ext = local.split('.').pop().toLowerCase();
  if (INVALID_EMAIL_EXTENSIONS.has(ext)) return false;
  
  const domainParts = domain.split('.');
  if (domainParts.length < 2) return false;
  const tld = domainParts.pop().toLowerCase();
  if (tld.length < 2 || INVALID_EMAIL_EXTENSIONS.has(tld)) return false;
  
  if (COMMON_FAKE_EMAILS.has(email.toLowerCase())) return false;
  
  // Reject obviously generated/template emails
  if (/^\$\{|^%\{|^{{|^#\{/.test(local)) return false;
  
  // No consecutive dots
  if (/\.{2,}/.test(email)) return false;
  
  // Standard regex validation
  return /^[a-zA-Z0-9][a-zA-Z0-9._%+\-]*[a-zA-Z0-9]@[a-zA-Z0-9][a-zA-Z0-9.\-]*\.[a-zA-Z]{2,}$/.test(email);
}

// ─── EXTRACTION FUNCTIONS ─────────────────────────────────────────────────────

function extractEmails($, html) {
  const found = new Map(); // email -> confidence score

  // From mailto: links (confidence 3 — highest)
  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const email = href.replace(/^mailto:/i, '').split('?')[0].trim().toLowerCase();
    if (isValidEmail(email)) {
      found.set(email, Math.max(found.get(email) || 0, 3));
    }
  });

  // From meta/schema
  $('[itemprop="email"], [property="email"]').each((_, el) => {
    const v = ($(el).attr('content') || $(el).text()).trim().toLowerCase();
    if (isValidEmail(v)) found.set(v, Math.max(found.get(v) || 0, 2));
  });

  // From text (confidence 1)
  const emailRe = /\b([a-zA-Z0-9][a-zA-Z0-9._%+\-]{0,62}@[a-zA-Z0-9][a-zA-Z0-9.\-]{0,251}\.[a-zA-Z]{2,})\b/g;
  for (const m of html.matchAll(emailRe)) {
    const email = m[1].toLowerCase();
    if (isValidEmail(email) && !found.has(email)) {
      found.set(email, 1);
    }
  }

  return [...found.entries()].map(([email, confidence]) => ({ email, confidence }));
}

function extractPhones($, html) {
  const found = new Map(); // phone -> confidence

  // From tel: links (confidence 3)
  $('a[href^="tel:"]').each((_, el) => {
    const raw = ($(el).attr('href') || '').replace(/^tel:/i, '').trim();
    const digits = raw.replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 15) {
      found.set(raw, Math.max(found.get(raw) || 0, 3));
    }
  });

  // Schema.org telephone
  $('[itemprop="telephone"]').each((_, el) => {
    const v = ($(el).attr('content') || $(el).text()).trim();
    if (/\d{7,}/.test(v)) found.set(v, Math.max(found.get(v) || 0, 2));
  });

  // Text extraction with context validation
  const phoneRe = /(?<!\d)(\+?1?\s*\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4})(?!\d)/g;
  const intlRe = /(?<!\d)(\+[2-9]\d[\s.\-]?\d{3,4}[\s.\-]?\d{4,6})(?!\d)/g;

  for (const re of [phoneRe, intlRe]) {
    for (const m of html.matchAll(re)) {
      const raw = m[1];
      const idx = m.index;
      const context = html.slice(Math.max(0, idx - 80), idx + raw.length + 80);
      if (isValidPhone(raw, context) && !found.has(raw)) {
        found.set(raw.trim(), 1);
      }
    }
  }

  return [...found.entries()].map(([phone, confidence]) => ({ phone, confidence }));
}

function extractLinks($, baseUrl) {
  const links = new Set();

  $('a[href]').each((_, el) => {
    try {
      const href = ($(el).attr('href') || '').trim();
      if (!href || href.startsWith('#') || /^(javascript|mailto|tel|data):/i.test(href)) return;
      const resolved = new URL(href, baseUrl);
      if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
        // Remove fragment
        resolved.hash = '';
        links.add(resolved.href);
      }
    } catch (_) {}
  });

  return [...links];
}

function extractForms($, pageUrl) {
  const forms = [];

  $('form').each((_, el) => {
    const action = $(el).attr('action') || '';
    const method = (($(el).attr('method') || 'GET')).toUpperCase();
    const enctype = $(el).attr('enctype') || '';

    const inputs = [];
    $(el).find('input, textarea, select, button[type="submit"]').each((_, inp) => {
      const tag = inp.tagName.toLowerCase();
      const type = $(inp).attr('type') || tag;
      const name = $(inp).attr('name') || '';
      const placeholder = $(inp).attr('placeholder') || '';
      const required = $(inp).attr('required') !== undefined;
      inputs.push({ type, name, placeholder, required });
    });

    const formHtml = $.html(el).toLowerCase();
    let formType = 'GENERIC';
    if (/password.*input|input.*password/.test(formHtml) && /email|user|login/.test(formHtml)) formType = '🔐 LOGIN';
    else if (/password/.test(formHtml) && /register|signup/.test(formHtml)) formType = '📝 REGISTER';
    else if (/search|query/.test(formHtml)) formType = '🔍 SEARCH';
    else if (/contact|message|subject/.test(formHtml)) formType = '📬 CONTACT';
    else if (/upload|file/.test(formHtml)) formType = '📤 UPLOAD';
    else if (/comment|reply/.test(formHtml)) formType = '💬 COMMENT';
    else if (/checkout|payment|card/.test(formHtml)) formType = '💳 PAYMENT';
    else if (inputs.length > 0) formType = '📋 FORM';

    forms.push({
      page: pageUrl,
      action: action || '(same page)',
      method,
      enctype,
      type: formType,
      inputCount: inputs.length,
      inputs: inputs.slice(0, 10),
      hasPassword: inputs.some(i => i.type === 'password'),
      hasFileUpload: inputs.some(i => i.type === 'file')
    });
  });

  return forms;
}

function extractMeta($) {
  const meta = {};
  meta.title = $('title').text().trim() || null;
  meta.description = $('meta[name="description"]').attr('content') || null;
  meta.keywords = $('meta[name="keywords"]').attr('content') || null;
  meta.robots = $('meta[name="robots"]').attr('content') || null;
  meta.generator = $('meta[name="generator"]').attr('content') || null;
  meta.author = $('meta[name="author"]').attr('content') || null;
  meta.framework = detectFramework($);

  const scripts = [];
  $('script[src]').each((_, el) => {
    const src = $(el).attr('src') || '';
    if (src) scripts.push(src);
  });
  meta.scripts = scripts.slice(0, 15);

  return meta;
}

function detectFramework($) {
  const html = $.html().toLowerCase();
  if (/wp-content|wp-includes|wordpress/i.test(html)) return 'WordPress';
  if (/joomla/i.test(html)) return 'Joomla';
  if (/drupal|sites\/default\/files/i.test(html)) return 'Drupal';
  if (/shopify/i.test(html)) return 'Shopify';
  if (/__next_data__|_next\/static/i.test(html)) return 'Next.js';
  if (/data-reactroot|__reactfiber|_reactroot/i.test(html)) return 'React';
  if (/ng-app|ng-controller|angular/i.test(html)) return 'Angular';
  if (/vue\.js|v-bind|v-model|nuxt/i.test(html)) return 'Vue/Nuxt';
  if (/laravel|csrf-token/i.test(html) && /<meta name="csrf-token"/.test(html)) return 'Laravel';
  if (/rails|csrf-param/i.test(html)) return 'Ruby on Rails';
  if (/django.*csrftoken|csrfmiddlewaretoken/i.test(html)) return 'Django';
  if (/flask/i.test(html)) return 'Flask';
  if (/ghost\.|ghost-blog/i.test(html)) return 'Ghost';
  if (/squarespace/i.test(html)) return 'Squarespace';
  if (/wix\.com|wixstatic/i.test(html)) return 'Wix';
  return null;
}

function extractComments(html) {
  const comments = [];
  const re = /<!--([\s\S]*?)-->/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const c = m[1].trim();
    if (c.length > 10 && c.length < 500 &&
        !/\[if\s/.test(c) &&
        /[a-zA-Z]{4,}/.test(c) &&
        !/^=+|-{10,}|</.test(c)) {
      comments.push(c);
    }
  }
  return [...new Set(comments)].slice(0, 30);
}

// ─── MAIN CRAWLER CLASS ───────────────────────────────────────────────────────

class IntelligentCrawler {
  constructor(options) {
    this.targetUrl = options.url;
    this.maxDepth = Math.min(parseInt(options.depth) || 2, 5);
    this.delay = Math.max(parseFloat(options.delay) || 0.5, 0.1);
    this.stayOnDomain = options.stayOnDomain !== false;
    this.onEvent = options.onEvent || (() => {});

    try {
      const u = new URL(this.targetUrl);
      this.baseDomain = u.hostname;
    } catch (e) {
      throw new Error('Invalid URL provided');
    }

    this.visited = new Set();
    this.queue = [{ url: this.targetUrl, depth: 0 }];
    this.stopped = false;

    this.data = {
      emails: new Map(),
      phones: new Map(),
      links: new Map(),
      forms: [],
      meta: {},
      comments: new Map(),
      pages: [],
      errors: [],
      startTime: Date.now(),
      stats: { pagesVisited: 0, pagesSkipped: 0, requestErrors: 0 }
    };
  }

  emit(type, payload) {
    try { this.onEvent({ type, payload, ts: Date.now() }); } catch (_) {}
  }

  async fetchPage(url) {
    try {
      const resp = await axios.get(url, {
        timeout: 12000,
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CrawlerX-SecurityResearch/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        },
        validateStatus: s => s < 400,
        maxContentLength: 5 * 1024 * 1024,
        responseType: 'text'
      });
      const ct = resp.headers['content-type'] || '';
      if (!ct.includes('text/html') && !ct.includes('text/plain')) return null;
      return { html: resp.data, status: resp.status, headers: resp.headers };
    } catch (e) {
      return { error: e.message };
    }
  }

  async crawl() {
    this.emit('start', { url: this.targetUrl, maxDepth: this.maxDepth });

    while (this.queue.length > 0 && !this.stopped) {
      const { url, depth } = this.queue.shift();

      if (this.visited.has(url) || depth > this.maxDepth) {
        this.data.stats.pagesSkipped++;
        continue;
      }

      this.visited.add(url);
      this.emit('crawling', { url, depth, queue: this.queue.length, visited: this.visited.size });

      const page = await this.fetchPage(url);

      if (!page || page.error) {
        this.data.errors.push({ url, error: page?.error || 'Fetch failed' });
        this.data.stats.requestErrors++;
        this.emit('pageError', { url, error: page?.error });
        continue;
      }

      this.data.stats.pagesVisited++;

      const $ = cheerio.load(page.html);

      const emails = extractEmails($, page.html);
      const phones = extractPhones($, page.html);
      const links = extractLinks($, url);
      const forms = extractForms($, url);
      const meta = extractMeta($);
      const comments = extractComments(page.html);

      // Deduplicated storage
      for (const { email, confidence } of emails) {
        if (!this.data.emails.has(email)) {
          this.data.emails.set(email, { sources: new Set(), confidence: 0 });
        }
        const e = this.data.emails.get(email);
        e.sources.add(url);
        e.confidence = Math.max(e.confidence, confidence);
        this.emit('found', { type: 'email', value: email, confidence });
      }

      for (const { phone, confidence } of phones) {
        if (!this.data.phones.has(phone)) {
          this.data.phones.set(phone, { sources: new Set(), confidence: 0 });
        }
        const p = this.data.phones.get(phone);
        p.sources.add(url);
        p.confidence = Math.max(p.confidence, confidence);
        this.emit('found', { type: 'phone', value: phone, confidence });
      }

      for (const link of links) {
        if (!this.data.links.has(link)) {
          try {
            const lu = new URL(link);
            this.data.links.set(link, {
              depth, domain: lu.hostname,
              internal: lu.hostname === this.baseDomain,
              foundOn: url
            });
          } catch (_) {}
        }
        if (depth < this.maxDepth && !this.visited.has(link)) {
          try {
            const lu = new URL(link);
            if (!this.stayOnDomain || lu.hostname === this.baseDomain) {
              if (!this.queue.find(q => q.url === link)) {
                this.queue.push({ url: link, depth: depth + 1 });
              }
            }
          } catch (_) {}
        }
      }

      for (const form of forms) this.data.forms.push(form);

      this.data.meta[url] = meta;

      for (const c of comments) {
        if (!this.data.comments.has(c)) this.data.comments.set(c, new Set());
        this.data.comments.get(c).add(url);
      }

      this.data.pages.push({
        url, depth, status: page.status,
        title: meta.title,
        framework: meta.framework,
        emailsFound: emails.length,
        phonesFound: phones.length,
        linksFound: links.length,
        formsFound: forms.length
      });

      this.emit('pageComplete', {
        url, depth,
        found: { emails: emails.length, phones: phones.length, links: links.length, forms: forms.length },
        title: meta.title,
        framework: meta.framework
      });

      if (this.delay > 0) {
        await new Promise(r => setTimeout(r, this.delay * 1000));
      }
    }

    this.data.endTime = Date.now();
    this.data.duration = this.data.endTime - this.data.startTime;

    const results = this.serialize();
    this.emit('complete', results.summary);
    return results;
  }

  stop() {
    this.stopped = true;
    this.emit('stopped', this.serialize().summary);
  }

  serialize() {
    const emails = {};
    this.data.emails.forEach((v, k) => {
      emails[k] = { ...v, sources: [...v.sources] };
    });
    const phones = {};
    this.data.phones.forEach((v, k) => {
      phones[k] = { ...v, sources: [...v.sources] };
    });
    const links = {};
    this.data.links.forEach((v, k) => { links[k] = v; });
    const comments = {};
    this.data.comments.forEach((v, k) => { comments[k] = [...v]; });

    const summary = {
      pagesVisited: this.data.stats.pagesVisited,
      emails: this.data.emails.size,
      phones: this.data.phones.size,
      links: this.data.links.size,
      forms: this.data.forms.length,
      errors: this.data.errors.length,
      duration: this.data.duration || (Date.now() - this.data.startTime)
    };

    return {
      target: this.targetUrl,
      maxDepth: this.maxDepth,
      emails, phones, links, comments,
      forms: this.data.forms,
      meta: this.data.meta,
      pages: this.data.pages,
      errors: this.data.errors,
      stats: this.data.stats,
      summary,
      startTime: this.data.startTime,
      endTime: this.data.endTime,
      duration: this.data.duration
    };
  }
}

module.exports = { IntelligentCrawler };
