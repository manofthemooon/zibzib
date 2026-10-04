const { translateToAlien, translateToEnglish, InvalidInputError } = require('./lib/dictionary');

const MAX_TEXT_LENGTH = 4000; // X Premium (verified) post limit, used as the translation input cap

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const body = req.body || {};
    const { text, direction } = body;
    if (typeof text !== 'string') {
      res.status(400).json({ error: 'Field text must be a string' });
      return;
    }
    if (text.length > MAX_TEXT_LENGTH) {
      res.status(400).json({
        error: `Text too long (max ${MAX_TEXT_LENGTH} characters, same as a verified X post)`,
      });
      return;
    }
    const translated = direction === 'to_english' ? translateToEnglish(text) : translateToAlien(text);
    res.status(200).json({ translated });
  } catch (e) {
    if (e instanceof InvalidInputError) {
      res.status(400).json({ error: e.message });
    } else {
      res.status(500).json({ error: `Internal error: ${e.message}` });
    }
  }
};
