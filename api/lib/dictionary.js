// Parses /alien-dictionary.md into a lookup table and translates between
// English and the "zib zib" alien language, in both directions.
//
// Port of landing/translator_plain.py (the "plain" variant actually used by
// the frontend: no word-coining, unknown words are left exactly as typed).
// The dictionary file is the single source of truth for known words - this
// module reads it once at cold start.

const fs = require('fs');
const path = require('path');

const DICT_PATH = path.join(__dirname, '..', '..', 'alien-dictionary.md');

const PAREN_RE = /\([^)]*\)/g;
const STRIP_RE = /^[^a-z0-9']+|[^a-z0-9']+$/g;
const PREFIX_RE = /^[^a-z0-9']+/i;
const SUFFIX_RE = /[^a-z0-9']+$/i;

// Max identical consecutive combining marks (accents etc.) kept on a single
// base character before the rest are dropped. Blocks "zalgo" text.
const MAX_COMBINING_PER_CHAR = 2;

class InvalidInputError extends Error {}
class ValueError extends Error {}

function sanitizeText(text) {
  text = text.normalize('NFC');
  let out = '';
  let combiningRun = 0;
  for (const ch of text) {
    if (ch === '\n' || ch === '\t') {
      out += ch;
      combiningRun = 0;
      continue;
    }
    if (/\p{Cc}/u.test(ch) || /\p{Cf}/u.test(ch)) {
      // Control chars (incl. NUL) and format chars (bidi overrides,
      // zero-width space/joiner/non-joiner, etc.) - drop silently.
      continue;
    }
    if (/\p{M}/u.test(ch)) {
      combiningRun += 1;
      if (combiningRun > MAX_COMBINING_PER_CHAR) continue;
    } else {
      combiningRun = 0;
    }
    out += ch;
  }
  return out;
}

// English letters, digits, whitespace, and punctuation that actually shows
// up in English sentences/tweets. Anything else (other alphabets,
// homoglyphs, emoji, exotic symbols) is rejected.
const DISALLOWED_CHAR_RE = /[^A-Za-z0-9\s.,!?;:'"()\-@#&%*+=/[\]~]/;
const HAS_LETTER_RE = /[A-Za-z]/;
const HAS_DIGIT_RE = /[0-9]/;

function splitAffixes(rawWord) {
  const prefixMatch = rawWord.match(PREFIX_RE);
  const suffixMatch = rawWord.match(SUFFIX_RE);
  const prefixStr = prefixMatch ? prefixMatch[0] : '';
  const suffixStr = suffixMatch ? suffixMatch[0] : '';
  const core = suffixStr
    ? rawWord.slice(prefixStr.length, rawWord.length - suffixStr.length)
    : rawWord.slice(prefixStr.length);
  return [prefixStr, core, suffixStr];
}

function validateEnglishOnly(text) {
  const badChar = text.match(DISALLOWED_CHAR_RE);
  if (badChar) {
    throw new InvalidInputError(`English text only. Disallowed character: '${badChar[0]}'`);
  }
  for (const rawWord of text.split(/\s+/).filter(Boolean)) {
    const [, core] = splitAffixes(rawWord);
    if (HAS_LETTER_RE.test(core) && HAS_DIGIT_RE.test(core)) {
      throw new InvalidInputError(
        `This doesn't look like a real English word: '${rawWord}' (mixes letters and digits)`
      );
    }
  }
}

function cleanWord(word) {
  return word.toLowerCase().replace(STRIP_RE, '');
}

function cleanKey(rawKey) {
  const key = rawKey.replace(PAREN_RE, '').trim();
  if (!key) return [];
  const alternatives = key.split('/').map((k) => k.trim()).filter(Boolean);
  const cleaned = [];
  for (let alt of alternatives) {
    alt = alt.replace(/\?+$/, '').trim().toLowerCase();
    if (alt) cleaned.push(alt);
  }
  return cleaned;
}

function loadDictionary(mdText) {
  const dictionary = {};
  for (let line of mdText.split(/\r?\n/)) {
    line = line.trim();
    if (!line) continue;
    if (
      line.startsWith('#') ||
      line.startsWith('-') ||
      line.startsWith('Source:') ||
      line.startsWith('No single')
    ) {
      continue;
    }
    if (line.toLowerCase().includes('unclear')) continue;
    const sepIdx = line.indexOf(' = ');
    if (sepIdx === -1) continue;
    const rawKey = line.slice(0, sepIdx);
    const rawValue = line.slice(sepIdx + 3);
    let value = rawValue.replace(PAREN_RE, '').trim();
    value = value.replace(/\?+$/, '').trim();
    if (!value) continue;
    for (const key of cleanKey(rawKey)) {
      if (!(key in dictionary)) dictionary[key] = value;
    }
  }
  return dictionary;
}

function buildReverse(dictionary) {
  const reverse = {};
  for (const [english, alien] of Object.entries(dictionary)) {
    const alienKey = alien.toLowerCase().trim();
    if (!(alienKey in reverse)) reverse[alienKey] = english;
  }
  return reverse;
}

function wordCount(s) {
  return s.split(/\s+/).filter(Boolean).length;
}

const DICT_TEXT = fs.readFileSync(DICT_PATH, 'utf-8');
const DICTIONARY = loadDictionary(DICT_TEXT);
const REVERSE_DICTIONARY = buildReverse(DICTIONARY);
const MAX_PHRASE_WORDS = Math.max(1, ...Object.keys(DICTIONARY).map(wordCount));
const MAX_ALIEN_PHRASE_WORDS = Math.max(1, ...Object.values(DICTIONARY).map(wordCount));

function toAlienLine(line) {
  if (!line.trim()) return line;
  const words = line.split(' ');
  const out = [];
  let i = 0;
  const n = words.length;
  while (i < n) {
    let matched = false;
    const maxLen = Math.min(MAX_PHRASE_WORDS, n - i);
    for (let length = maxLen; length > 1; length--) {
      const chunk = words.slice(i, i + length);
      const cleaned = chunk.map(cleanWord).join(' ').trim();
      if (cleaned && Object.prototype.hasOwnProperty.call(DICTIONARY, cleaned)) {
        const [prefix] = splitAffixes(chunk[0]);
        const suffix = splitAffixes(chunk[chunk.length - 1])[2];
        out.push(`${prefix}${DICTIONARY[cleaned]}${suffix}`);
        i += length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    const raw = words[i];
    const [prefix, core, suffix] = splitAffixes(raw);
    const cleanedCore = core.toLowerCase();
    if (!cleanedCore) {
      out.push(raw);
    } else if (Object.prototype.hasOwnProperty.call(DICTIONARY, cleanedCore)) {
      out.push(`${prefix}${DICTIONARY[cleanedCore]}${suffix}`);
    } else {
      // Unknown word: leave it exactly as typed, in English.
      out.push(raw);
    }
    i += 1;
  }
  return out.join(' ');
}

function toEnglishLine(line) {
  if (!line.trim()) return line;
  const words = line.split(' ');
  const out = [];
  let i = 0;
  const n = words.length;
  while (i < n) {
    let matched = false;
    const maxLen = Math.min(MAX_ALIEN_PHRASE_WORDS, n - i);
    for (let length = maxLen; length > 1; length--) {
      const chunk = words.slice(i, i + length);
      const cleaned = chunk.map(cleanWord).join(' ').trim();
      if (cleaned && Object.prototype.hasOwnProperty.call(REVERSE_DICTIONARY, cleaned)) {
        const [prefix] = splitAffixes(chunk[0]);
        const suffix = splitAffixes(chunk[chunk.length - 1])[2];
        out.push(`${prefix}${REVERSE_DICTIONARY[cleaned]}${suffix}`);
        i += length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    const raw = words[i];
    const [prefix, core, suffix] = splitAffixes(raw);
    const cleanedCore = core.toLowerCase();
    if (!cleanedCore) {
      out.push(raw);
    } else if (Object.prototype.hasOwnProperty.call(REVERSE_DICTIONARY, cleanedCore)) {
      out.push(`${prefix}${REVERSE_DICTIONARY[cleanedCore]}${suffix}`);
    } else {
      // Unrecognized alien token: leave it exactly as typed.
      out.push(raw);
    }
    i += 1;
  }
  return out.join(' ');
}

function translateToAlien(text) {
  text = sanitizeText(text);
  validateEnglishOnly(text);
  return text.split('\n').map(toAlienLine).join('\n');
}

function translateToEnglish(text) {
  text = sanitizeText(text);
  validateEnglishOnly(text);
  return text.split('\n').map(toEnglishLine).join('\n');
}

module.exports = {
  translateToAlien,
  translateToEnglish,
  InvalidInputError,
  ValueError,
  DICTIONARY,
  REVERSE_DICTIONARY,
};
