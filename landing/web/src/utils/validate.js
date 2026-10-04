// Mirrors the server-side whitelist in translator.py - catches bad input
// before it's even sent, so the server-side check is the real gate but the
// user gets instant feedback instead of a round trip.
const ALLOWED_CHARS_RE = /^[A-Za-z0-9\s.,!?;:'"()\-@#&%*+=/\[\]~]*$/;
const MIXED_ALNUM_RE = /^(?=.*[A-Za-z])(?=.*[0-9])[A-Za-z0-9']+$/;

export function validateEnglishOnly(text) {
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
