// Mirrors the server-side whitelist in translator.py - catches bad input
// before it's even sent, so the server-side check is the real gate but the
// user gets instant feedback instead of a round trip.
const ALLOWED_CHARS_RE = /^[A-Za-z0-9\s.,!?;:'"()\-@#&%*+=/\[\]~]*$/;
const MIXED_ALNUM_RE = /^(?=.*[A-Za-z])(?=.*[0-9])[A-Za-z0-9']+$/;

function validateEnglishOnly(text) {
  if (!ALLOWED_CHARS_RE.test(text)) {
    return 'English text only (Latin letters, numbers, standard punctuation).';
  }
  for (const word of text.split(/\s+/)) {
    const core = word.replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, '');
    if (MIXED_ALNUM_RE.test(core)) {
      return `This doesn't look like a real English word: "${word}" (mixes letters and digits).`;
    }
  }
  return null;
}

function typeText(el, text, speed) {
  speed = speed || 10;
  el.textContent = '';
  let i = 0;
  (function step() {
    if (i <= text.length) {
      el.textContent = text.slice(0, i);
      i++;
      setTimeout(step, speed);
    }
  })();
}

// ---- segmented direction toggle ----
let currentDirection = 'to_alien';
(function () {
  const toggle = document.getElementById('direction-toggle');
  const opts = toggle.querySelectorAll('.opt');
  opts.forEach(function (opt) {
    opt.addEventListener('click', function () {
      opts.forEach(function (o) { o.classList.remove('active'); });
      opt.classList.add('active');
      currentDirection = opt.dataset.value;
      toggle.classList.toggle('right', currentDirection === 'to_english');
    });
  });
})();

async function translateText() {
  const text = document.getElementById('text-input').value;
  const out = document.getElementById('text-output');

  const validationError = validateEnglishOnly(text);
  if (validationError) {
    out.textContent = validationError;
    out.classList.add('error');
    return;
  }

  out.textContent = '...';
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({text, direction: currentDirection})
    });
    const data = await res.json();
    out.classList.remove('error');
    typeText(out, data.translated || '');
  } catch (e) {
    out.textContent = 'error: ' + e;
    out.classList.add('error');
  }
}

async function translateTweet() {
  const url = document.getElementById('tweet-url').value;
  const original = document.getElementById('tweet-original');
  const out = document.getElementById('tweet-output');
  original.textContent = '';
  out.textContent = '...';
  try {
    const res = await fetch('/api/translate-tweet', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({url})
    });
    const data = await res.json();
    if (data.error) {
      out.textContent = data.error;
      out.classList.add('error');
      return;
    }
    out.classList.remove('error');
    original.textContent = data.original;
    typeText(out, data.translated);
  } catch (e) {
    out.textContent = 'error: ' + e;
    out.classList.add('error');
  }
}
