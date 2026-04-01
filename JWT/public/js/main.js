// ═══════════════════════════════════════════════════════════
//  XYBERJWT — Client-Side JavaScript
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initNavToggle();
  initAccordions();
  initCopyButtons();
  initScrollEffects();
});

// ─── Mobile Navigation ──────────────────────────────────
function initNavToggle() {
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    links.classList.toggle('open');
    toggle.classList.toggle('active');
  });

  // Close on link click
  links.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.classList.remove('active');
    });
  });
}

// ─── OWASP Accordion ────────────────────────────────────
function initAccordions() {
  document.querySelectorAll('.accordion__header').forEach(header => {
    header.addEventListener('click', () => {
      const item = header.parentElement;
      const isActive = item.classList.contains('active');

      // Close all
      item.closest('.accordion').querySelectorAll('.accordion__item').forEach(i => {
        i.classList.remove('active');
      });

      // Toggle current
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });
}

// ─── Copy to Clipboard ──────────────────────────────────
function initCopyButtons() {
  document.querySelectorAll('.code-block__copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.closest('.code-block').querySelector('pre').textContent;
      navigator.clipboard.writeText(code).then(() => {
        const originalText = btn.textContent;
        btn.textContent = '✓ Copied!';
        btn.style.color = 'var(--accent)';
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.color = '';
        }, 2000);
      });
    });
  });
}

// ─── Navbar Scroll Effect ───────────────────────────────
function initScrollEffects() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;

  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    if (currentScroll > 100) {
      nav.style.background = 'rgba(10, 14, 23, 0.95)';
      nav.style.boxShadow = '0 4px 30px rgba(0,0,0,0.3)';
    } else {
      nav.style.background = 'rgba(10, 14, 23, 0.85)';
      nav.style.boxShadow = 'none';
    }
    lastScroll = currentScroll;
  });
}

// ─── JWT Lab: Encode ────────────────────────────────────
async function encodeJWT() {
  const payload = document.getElementById('jwt-payload').value;
  const secret = document.getElementById('jwt-secret').value;
  const algorithm = document.getElementById('jwt-algorithm').value;
  const resultDiv = document.getElementById('jwt-encode-result');

  try {
    const res = await fetch('/jwt/api/jwt/encode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload, secret, algorithm })
    });
    const data = await res.json();

    if (data.success) {
      resultDiv.innerHTML = `
        <div class="lab__result-title">✅ Encoded JWT Token</div>
        <pre style="word-break:break-all;color:var(--accent-yellow);margin-bottom:16px;">${data.token}</pre>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
          <div style="padding:12px;background:rgba(255,51,102,0.05);border-radius:8px;border:1px solid rgba(255,51,102,0.2);">
            <div style="font-size:0.75rem;font-weight:700;color:var(--accent-red);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Header</div>
            <pre style="font-size:0.8rem;">${JSON.stringify(data.decoded.header, null, 2)}</pre>
          </div>
          <div style="padding:12px;background:rgba(168,85,247,0.05);border-radius:8px;border:1px solid rgba(168,85,247,0.2);">
            <div style="font-size:0.75rem;font-weight:700;color:var(--accent-purple);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Payload</div>
            <pre style="font-size:0.8rem;">${JSON.stringify(data.decoded.payload, null, 2)}</pre>
          </div>
          <div style="padding:12px;background:rgba(0,204,255,0.05);border-radius:8px;border:1px solid rgba(0,204,255,0.2);">
            <div style="font-size:0.75rem;font-weight:700;color:var(--accent-blue);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Signature</div>
            <pre style="font-size:0.8rem;word-break:break-all;">${data.parts.signature}</pre>
          </div>
        </div>`;
      resultDiv.classList.add('active');
    } else {
      showError(resultDiv, data.error);
    }
  } catch (err) {
    showError(resultDiv, err.message);
  }
}

// ─── JWT Lab: Decode ────────────────────────────────────
async function decodeJWT() {
  const token = document.getElementById('jwt-decode-token').value;
  const secret = document.getElementById('jwt-decode-secret').value;
  const resultDiv = document.getElementById('jwt-decode-result');

  try {
    const res = await fetch('/jwt/api/jwt/decode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, secret })
    });
    const data = await res.json();

    if (data.success) {
      const verifyBadge = data.verified
        ? '<span style="color:var(--accent);font-weight:700;">✅ Signature Valid</span>'
        : `<span style="color:var(--accent-red);font-weight:700;">❌ ${data.verifyError || 'Not Verified (no secret provided)'}</span>`;

      resultDiv.innerHTML = `
        <div class="lab__result-title">🔓 Decoded JWT</div>
        <div style="margin-bottom:12px;">${verifyBadge}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div style="padding:12px;background:rgba(255,51,102,0.05);border-radius:8px;border:1px solid rgba(255,51,102,0.2);">
            <div style="font-size:0.75rem;font-weight:700;color:var(--accent-red);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Header</div>
            <pre style="font-size:0.8rem;">${JSON.stringify(data.header, null, 2)}</pre>
          </div>
          <div style="padding:12px;background:rgba(168,85,247,0.05);border-radius:8px;border:1px solid rgba(168,85,247,0.2);">
            <div style="font-size:0.75rem;font-weight:700;color:var(--accent-purple);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Payload</div>
            <pre style="font-size:0.8rem;">${JSON.stringify(data.payload, null, 2)}</pre>
          </div>
        </div>`;
      resultDiv.classList.add('active');
    } else {
      showError(resultDiv, data.error);
    }
  } catch (err) {
    showError(resultDiv, err.message);
  }
}

// ─── JWT Lab: Tamper (alg:none) ─────────────────────────
async function tamperJWT() {
  const payload = document.getElementById('jwt-tamper-payload').value;
  const resultDiv = document.getElementById('jwt-tamper-result');

  try {
    const res = await fetch('/jwt/api/jwt/tamper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload })
    });
    const data = await res.json();

    if (data.success) {
      resultDiv.innerHTML = `
        <div class="lab__result-title">⚠️ Tampered Token (alg:none Attack)</div>
        <pre style="word-break:break-all;color:var(--accent-orange);margin-bottom:16px;">${data.tamperedToken}</pre>
        <div class="info-box info-box--warning" style="margin:12px 0;">
          <div class="info-box__title">⚠️ Warning</div>
          <div class="info-box__content">${data.warning}</div>
        </div>
        <div style="padding:12px;background:rgba(255,102,0,0.05);border-radius:8px;border:1px solid rgba(255,102,0,0.2);margin-top:12px;">
          <div style="font-size:0.75rem;font-weight:700;color:var(--accent-orange);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Explanation</div>
          <pre style="font-size:0.85rem;white-space:pre-wrap;">${data.explanation}</pre>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
          <div style="padding:12px;background:rgba(255,51,102,0.05);border-radius:8px;border:1px solid rgba(255,51,102,0.2);">
            <div style="font-size:0.75rem;font-weight:700;color:var(--accent-red);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Header</div>
            <pre style="font-size:0.8rem;">${JSON.stringify(data.decoded.header, null, 2)}</pre>
          </div>
          <div style="padding:12px;background:rgba(168,85,247,0.05);border-radius:8px;border:1px solid rgba(168,85,247,0.2);">
            <div style="font-size:0.75rem;font-weight:700;color:var(--accent-purple);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Tampered Payload</div>
            <pre style="font-size:0.8rem;">${JSON.stringify(data.decoded.payload, null, 2)}</pre>
          </div>
        </div>`;
      resultDiv.classList.add('active');
    } else {
      showError(resultDiv, data.error);
    }
  } catch (err) {
    showError(resultDiv, err.message);
  }
}

// ─── Bcrypt: Hash ───────────────────────────────────────
async function hashPassword() {
  const password = document.getElementById('bcrypt-password').value;
  const rounds = document.getElementById('bcrypt-rounds').value;
  const resultDiv = document.getElementById('bcrypt-hash-result');

  try {
    const res = await fetch('/jwt/api/bcrypt/hash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, rounds: parseInt(rounds) })
    });
    const data = await res.json();

    if (data.success) {
      resultDiv.innerHTML = `
        <div class="lab__result-title">🔒 Bcrypt Hash Result</div>
        <pre style="margin-bottom:12px;"><strong style="color:var(--accent);">Hash:</strong> ${data.hash}</pre>
        <pre style="margin-bottom:12px;"><strong style="color:var(--accent-blue);">Salt:</strong> ${data.salt}</pre>
        <pre style="margin-bottom:12px;"><strong style="color:var(--accent-orange);">Rounds:</strong> ${data.rounds} (2^${data.rounds} = ${Math.pow(2, data.rounds)} iterations)</pre>
        <pre><strong style="color:var(--accent-purple);">Time:</strong> ${data.durationMs}ms</pre>
        <div class="info-box info-box--explain" style="margin-top:12px;">
          <div class="info-box__title">ℹ️ Info</div>
          <div class="info-box__content">${data.explanation}</div>
        </div>`;
      resultDiv.classList.add('active');
    } else {
      showError(resultDiv, data.error);
    }
  } catch (err) {
    showError(resultDiv, err.message);
  }
}

// ─── Bcrypt: Compare ────────────────────────────────────
async function comparePassword() {
  const password = document.getElementById('bcrypt-compare-password').value;
  const hash = document.getElementById('bcrypt-compare-hash').value;
  const resultDiv = document.getElementById('bcrypt-compare-result');

  try {
    const res = await fetch('/jwt/api/bcrypt/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, hash })
    });
    const data = await res.json();

    if (data.success) {
      const color = data.match ? 'var(--accent)' : 'var(--accent-red)';
      resultDiv.innerHTML = `
        <div class="lab__result-title" style="color:${color};">${data.explanation}</div>
        <pre><strong style="color:var(--accent-blue);">Time:</strong> ${data.durationMs}ms</pre>`;
      resultDiv.classList.add('active');
    } else {
      showError(resultDiv, data.error);
    }
  } catch (err) {
    showError(resultDiv, err.message);
  }
}

// ─── Helpers ────────────────────────────────────────────
function showError(div, msg) {
  div.innerHTML = `<div class="lab__result-title" style="color:var(--accent-red);">❌ Error</div><pre style="color:var(--accent-red);">${msg}</pre>`;
  div.classList.add('active');
}
