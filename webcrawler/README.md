# CrawlerX — Elite Web Reconnaissance Engine

A cybersecurity-grade web crawler with intelligent validation, real-time live feed, and comprehensive CSV/JSON reports. Built on Node.js + Express + EJS, matching the Vedant Sareen cyberpunk portfolio aesthetic.

---

## Features

- **Smart Email Validation** — Rejects CSS values, template placeholders, fake domains, common examples
- **Smart Phone Validation** — Rejects CSS px/em values, port numbers, dates, version strings, ZIP codes
- **Confidence Scoring** — HIGH (from mailto:/tel: links) / MED (schema.org) / LOW (text pattern)
- **Deduplication** — Zero duplicate findings; tracks all source URLs per finding
- **Form Fingerprinting** — Classifies forms: LOGIN, REGISTER, CONTACT, PAYMENT, UPLOAD, etc.
- **Framework Detection** — WordPress, Next.js, React, Angular, Vue, Laravel, Django, Shopify, Wix, Ghost, Squarespace
- **HTML Comment Extraction** — Finds potentially sensitive developer comments
- **Live Terminal Feed** — Real-time SSE stream, terminal-style UI with color-coded events
- **7 Report Files** — Emails CSV, Phones CSV, Links CSV, Forms CSV, Pages CSV, Errors CSV, Full JSON
- **ZIP Download** — Download all reports in one click
- **Cyberpunk UI** — Matches portfolio theme: hex grid, glassmorphism, GSAP animations, custom cursor

---

## Setup

### Requirements
- Node.js v18+
- npm

### Install

```bash
cd webcrawler
npm install
node server.js
```

Visit: `http://localhost:3000`

---

## Project Structure

```
webcrawler/
├── server.js              # Express app entry
├── package.json
├── routes/
│   └── crawler.js         # API routes + SSE streaming
├── utils/
│   ├── crawler.js         # IntelligentCrawler engine
│   └── reporter.js        # CSV/JSON report generator
├── views/
│   └── index.ejs          # Main UI (cyberpunk theme)
├── public/                # Static assets
└── reports/               # Generated reports (auto-created)
    └── {sessionId}/
        ├── summary.json
        ├── full_results.json
        ├── emails.csv
        ├── phones.csv
        ├── links.csv
        ├── forms.csv
        ├── pages_crawled.csv
        └── errors.csv
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Main UI |
| POST | `/crawl/start` | Start a crawl session |
| GET | `/crawl/stream/:id` | SSE live event stream |
| POST | `/crawl/stop/:id` | Stop active crawl |
| GET | `/status/:id` | Get session status |
| GET | `/download/:id` | Download all reports as ZIP |
| GET | `/download/:id/:file` | Download single report file |

---

## POST /crawl/start — Parameters

```json
{
  "url": "https://target.com",
  "depth": 2,
  "delay": 0.5,
  "stayOnDomain": "true"
}
```

---

## Validation Logic

### Email False Positive Rejection
- File extensions as local-part (e.g. `style.css@example.com`)
- Common placeholder emails (`example@example.com`, `test@test.com` etc.)
- Template syntax (`${email}@domain.com`, `{{email}}`)
- Consecutive dots, invalid TLDs
- Too short / too long addresses

### Phone False Positive Rejection
- CSS context: `padding`, `margin`, `font-size`, `border`, `rgba(` etc.
- Port numbers: `port: 3000`
- Version strings: `v1.2.3`
- Date strings: `2024-01-15`, `15/01/2024`
- Timeout/delay values in code
- All-same-digit sequences (`0000000000`)
- Must match US or international phone patterns

---

## Legal Notice

**For authorized security testing and educational use only.**  
Only crawl systems you own or have explicit written permission to test.  
Unauthorized crawling may violate the Computer Fraud and Abuse Act (CFAA) and equivalent laws.

---

## Built By
Integrated into Vedant Sareen's Cybersecurity Project Stack
