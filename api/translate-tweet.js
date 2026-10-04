const { translateToEnglish, ValueError, InvalidInputError } = require('./lib/dictionary');

const MAX_TEXT_LENGTH = 4000;

const ALLOWED_HOSTS = new Set([
  'twitter.com',
  'www.twitter.com',
  'x.com',
  'www.x.com',
  'mobile.twitter.com',
]);

const TAG_RE = /<[^>]+>/g;
const PIC_LINK_RE = /\s*pic\.twitter\.com\/\S+/g;

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
};

function unescapeHtml(str) {
  return str.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, ent) => {
    if (ent[0] === '#') {
      const isHex = ent[1] === 'x' || ent[1] === 'X';
      const codePoint = isHex ? parseInt(ent.slice(2), 16) : parseInt(ent.slice(1), 10);
      if (Number.isNaN(codePoint)) return match;
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return match;
      }
    }
    return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, ent) ? NAMED_ENTITIES[ent] : match;
  });
}

async function extractTweetText(tweetUrl) {
  let parsed;
  try {
    parsed = new URL(tweetUrl);
  } catch {
    throw new ValueError('Link must point to x.com');
  }
  if (!ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new ValueError('Link must point to x.com');
  }

  const apiUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(tweetUrl)}&omit_script=true`;
  const resp = await fetch(apiUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ZibZibTranslator/1.0)' },
  });
  if (!resp.ok) {
    throw new ValueError(`Couldn't fetch the post (status ${resp.status}). It may be private or deleted.`);
  }

  const data = await resp.json();
  const embedHtml = data.html || '';
  const match = embedHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/);
  if (!match) {
    throw new ValueError("Couldn't find post text in the response.");
  }

  let inner = match[1];
  inner = inner.replace(TAG_RE, '');
  inner = unescapeHtml(inner);
  inner = inner.replace(PIC_LINK_RE, '').trim();
  return inner;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const body = req.body || {};
    const { url } = body;
    if (typeof url !== 'string') {
      res.status(400).json({ error: 'Field url must be a string' });
      return;
    }
    const trimmed = url.trim();
    if (!trimmed) {
      res.status(400).json({ error: 'Empty link' });
      return;
    }
    const original = await extractTweetText(trimmed);
    if (original.length > MAX_TEXT_LENGTH) {
      res.status(400).json({
        error: `Post text longer than ${MAX_TEXT_LENGTH} characters, translation skipped`,
      });
      return;
    }
    const translated = translateToEnglish(original);
    res.status(200).json({ original, translated });
  } catch (e) {
    if (e instanceof ValueError || e instanceof InvalidInputError) {
      res.status(400).json({ error: e.message });
    } else {
      res.status(500).json({ error: `Internal error: ${e.message}` });
    }
  }
};
