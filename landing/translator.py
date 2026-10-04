"""
Parses projects/zibzib-twitter/alien-dictionary.md into a lookup table and
translates between English and the "zib zib" alien meme language, in both
directions.

The dictionary file is the single source of truth for known words - this
module reads it at import time, so updating the .md file updates the
translator too.

Unknown words are handled differently depending on direction:
- English -> Alien: a new alien-sounding word is coined out of real syllables
  taken from the dictionary, and permanently cached in auto-dictionary.json so
  the same English word always produces the same alien word.
- Alien -> English: we never invent fake English. Unrecognized alien tokens
  are wrapped in brackets, e.g. [zorblik], so it's obvious what wasn't decoded.
"""
import hashlib
import json
import re
import unicodedata
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
DICT_PATH = PROJECT_DIR / "alien-dictionary.md"
AUTO_DICT_PATH = PROJECT_DIR / "auto-dictionary.json"

_PAREN_RE = re.compile(r"\([^)]*\)")
_STRIP_RE = re.compile(r"^[^a-z0-9']+|[^a-z0-9']+$")
_PREFIX_RE = re.compile(r"^[^a-z0-9']+", re.IGNORECASE)
_SUFFIX_RE = re.compile(r"[^a-z0-9']+$", re.IGNORECASE)

# Max identical consecutive combining marks (accents etc.) kept on a single
# base character before the rest are dropped. Blocks "zalgo" text, where
# hundreds of combining marks are stacked on one letter to visually wreck
# whatever renders it.
_MAX_COMBINING_PER_CHAR = 2


def _sanitize_text(text: str) -> str:
    """Strips characters whose only purpose is to break parsing/rendering
    rather than carry real words: Unicode control/format characters (null
    bytes, zero-width joiners, right-to-left/left-to-right override tricks),
    and zalgo-style stacks of combining marks. Normal letters, digits and
    punctuation in any language pass through untouched."""
    text = unicodedata.normalize("NFC", text)
    out = []
    combining_run = 0
    for ch in text:
        if ch in ("\n", "\t"):
            out.append(ch)
            combining_run = 0
            continue
        category = unicodedata.category(ch)
        if category in ("Cc", "Cf"):
            # Control chars (incl. NUL) and format chars (bidi overrides,
            # zero-width space/joiner/non-joiner, etc.) carry no visible
            # word meaning - drop them silently.
            continue
        if category in ("Mn", "Mc", "Me"):
            combining_run += 1
            if combining_run > _MAX_COMBINING_PER_CHAR:
                continue
        else:
            combining_run = 0
        out.append(ch)
    return "".join(out)


class InvalidInputError(ValueError):
    """Raised when input text fails the English-only validation, so the
    whole request is rejected up front instead of silently mangling or
    coining a word out of something that was never a real word."""


# English letters, digits (as standalone numbers, e.g. a year), whitespace,
# and the punctuation that actually shows up in English sentences/tweets.
# Anything outside this set (other alphabets, homoglyphs, emoji, exotic
# symbols) is rejected rather than silently passed through or translated.
_DISALLOWED_CHAR_RE = re.compile(r"[^A-Za-z0-9\s.,!?;:'\"()\-@#&%*+=/\[\]~]")
_HAS_LETTER_RE = re.compile(r"[A-Za-z]")
_HAS_DIGIT_RE = re.compile(r"[0-9]")


def _validate_english_only(text: str) -> None:
    """Rejects text containing non-English characters (other alphabets,
    homoglyphs, emoji) or words that mix letters and digits (e.g. "l33t",
    "test123") - these aren't real words and have no sane translation, so we
    fail the whole request instead of coining nonsense for them."""
    bad_char = _DISALLOWED_CHAR_RE.search(text)
    if bad_char:
        raise InvalidInputError(
            f"English text only. Disallowed character: {bad_char.group()!r}"
        )

    for raw_word in text.split():
        _, core, _ = _split_affixes(raw_word)
        if _HAS_LETTER_RE.search(core) and _HAS_DIGIT_RE.search(core):
            raise InvalidInputError(
                f"This doesn't look like a real English word: {raw_word!r} "
                "(mixes letters and digits)"
            )


def _clean_key(raw_key: str):
    """Returns a list of normalized lookup keys for a raw dictionary key."""
    key = _PAREN_RE.sub("", raw_key).strip()
    if not key:
        return []
    # some entries list alternatives like "Watch/Clock"
    alternatives = [k.strip() for k in key.split("/") if k.strip()]
    cleaned = []
    for alt in alternatives:
        alt = alt.rstrip("?").strip().lower()
        if alt:
            cleaned.append(alt)
    return cleaned


def load_dictionary(path: Path = DICT_PATH):
    """English phrase (lowercase) -> alien phrase."""
    dictionary = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or line.startswith("-") or line.startswith("Source:") or line.startswith("No single"):
            continue
        if "unclear" in line.lower():
            continue
        if " = " not in line:
            continue
        raw_key, raw_value = line.split(" = ", 1)
        value = _PAREN_RE.sub("", raw_value).strip().rstrip("?").strip()
        if not value:
            continue
        for key in _clean_key(raw_key):
            if key not in dictionary:
                dictionary[key] = value
    return dictionary


def _build_reverse(dictionary):
    """Alien phrase (lowercase) -> English phrase. First entry wins on collision."""
    reverse = {}
    for english, alien in dictionary.items():
        alien_key = alien.lower().strip()
        if alien_key not in reverse:
            reverse[alien_key] = english
    return reverse


def _real_syllables(dictionary):
    syllables = set()
    for alien in dictionary.values():
        for token in alien.lower().split():
            token = token.strip("?")
            if token.isalpha():
                syllables.add(token)
    return syllables


# Dedicated syllable bank used ONLY for coining new words for unknown English
# terms. Deliberately disjoint from the real dictionary's syllables (see
# _build_filler_bank) so a coined word can never accidentally combine with a
# neighboring real word to spell out an unrelated real dictionary phrase when
# decoding back from alien to English.
_FILLER_CANDIDATES = [
    "zil", "vosh", "trin", "glox", "nuv", "ptar", "sem", "worn", "ixl", "quor",
    "fenz", "drol", "kesh", "targ", "unem", "blorn", "crix", "dax", "evok", "fyn",
    "grav", "hesk", "ivon", "jorx", "klim", "lune", "mirv", "noxx", "orek", "plin",
]


def _build_filler_bank(real_syllables):
    bank = [s for s in _FILLER_CANDIDATES if s not in real_syllables]
    return bank or _FILLER_CANDIDATES


DICTIONARY = load_dictionary()
REVERSE_DICTIONARY = _build_reverse(DICTIONARY)
_REAL_SYLLABLES = _real_syllables(DICTIONARY)
FILLER_SYLLABLES = _build_filler_bank(_REAL_SYLLABLES)
MAX_PHRASE_WORDS = max((len(k.split()) for k in DICTIONARY), default=1)
MAX_ALIEN_PHRASE_WORDS = max((len(v.split()) for v in DICTIONARY.values()), default=1)


def _load_auto_dict():
    if AUTO_DICT_PATH.exists():
        try:
            return json.loads(AUTO_DICT_PATH.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return {}
    return {}


def _save_auto_dict():
    AUTO_DICT_PATH.write_text(
        json.dumps(AUTO_WORDS, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8",
    )


# Guards against unbounded growth of auto-dictionary.json:
# - MAX_WORD_LENGTH: a single "word" longer than this is almost certainly not
#   a real word (spam/garbage), so it's never written to disk as a dictionary
#   entry, and only a truncated form is used to coin a word for it.
# - MAX_AUTO_ENTRIES: once this many coined words have been persisted, further
#   unknown words are still translated (coined on the fly, so the translator
#   never breaks or echoes the raw word back), but stop being saved to disk.
MAX_WORD_LENGTH = 40
MAX_AUTO_ENTRIES = 3000

AUTO_WORDS = _load_auto_dict()  # english word -> coined alien word
AUTO_REVERSE = {v.lower(): k for k, v in AUTO_WORDS.items()}

_known_alien_values = set(REVERSE_DICTIONARY) | set(AUTO_REVERSE)


def _coin_alien_word(word: str) -> str:
    """Deterministically generates a new alien-sounding word for an unknown
    English word, using a syllable bank that is kept separate from the real
    dictionary's syllables. This guarantees a coined word can't blend with a
    neighboring real word and accidentally match an unrelated real phrase
    when decoding back from alien to English."""
    if not FILLER_SYLLABLES:
        return word

    if len(word) <= 3:
        n_syllables = 1
    elif len(word) <= 7:
        n_syllables = 2
    else:
        n_syllables = 3

    salt = 0
    while True:
        digest = hashlib.md5(f"{word}:{salt}".encode("utf-8")).digest()
        picks = []
        for i in range(n_syllables):
            idx = digest[i % len(digest)] % len(FILLER_SYLLABLES)
            picks.append(FILLER_SYLLABLES[idx])
        candidate = " ".join(picks)
        if candidate not in _known_alien_values:
            return candidate
        salt += 1


def _translate_word_to_alien(word: str) -> str:
    if word in DICTIONARY:
        return DICTIONARY[word]
    if word in AUTO_WORDS:
        return AUTO_WORDS[word]

    too_long = len(word) > MAX_WORD_LENGTH
    at_capacity = len(AUTO_WORDS) >= MAX_AUTO_ENTRIES
    coined = _coin_alien_word(word[:MAX_WORD_LENGTH] if too_long else word)

    if too_long or at_capacity:
        # Still a real, deterministic alien-sounding word (never the raw
        # word echoed back) - just not persisted, so the dictionary file
        # can't grow without bound from spam/garbage input.
        return coined

    AUTO_WORDS[word] = coined
    AUTO_REVERSE[coined.lower()] = word
    _known_alien_values.add(coined.lower())
    _save_auto_dict()
    return coined


def _clean_word(word: str) -> str:
    return _STRIP_RE.sub("", word.lower())


def _split_affixes(raw_word: str):
    prefix = _PREFIX_RE.match(raw_word)
    suffix = _SUFFIX_RE.search(raw_word)
    prefix_str = prefix.group(0) if prefix else ""
    suffix_str = suffix.group(0) if suffix else ""
    core = raw_word[len(prefix_str): len(raw_word) - len(suffix_str)] if suffix_str else raw_word[len(prefix_str):]
    return prefix_str, core, suffix_str


def to_alien_line(line: str) -> str:
    if not line.strip():
        return line
    words = line.split(" ")
    out = []
    i = 0
    n = len(words)
    while i < n:
        matched = False
        max_len = min(MAX_PHRASE_WORDS, n - i)
        for length in range(max_len, 1, -1):
            chunk = words[i:i + length]
            cleaned = " ".join(_clean_word(w) for w in chunk).strip()
            if cleaned and cleaned in DICTIONARY:
                prefix, _, _ = _split_affixes(chunk[0])
                _, _, suffix = _split_affixes(chunk[-1])
                out.append(f"{prefix}{DICTIONARY[cleaned]}{suffix}")
                i += length
                matched = True
                break
        if matched:
            continue

        raw = words[i]
        prefix, core, suffix = _split_affixes(raw)
        cleaned_core = core.lower()
        if not cleaned_core:
            out.append(raw)
        else:
            translated = _translate_word_to_alien(cleaned_core)
            out.append(f"{prefix}{translated}{suffix}")
        i += 1
    return " ".join(out)


def to_english_line(line: str) -> str:
    if not line.strip():
        return line
    words = line.split(" ")
    out = []
    i = 0
    n = len(words)
    while i < n:
        matched = False
        max_len = min(MAX_ALIEN_PHRASE_WORDS, n - i)
        for length in range(max_len, 1, -1):
            chunk = words[i:i + length]
            cleaned = " ".join(_clean_word(w) for w in chunk).strip()
            if cleaned and cleaned in REVERSE_DICTIONARY:
                prefix, _, _ = _split_affixes(chunk[0])
                _, _, suffix = _split_affixes(chunk[-1])
                out.append(f"{prefix}{REVERSE_DICTIONARY[cleaned]}{suffix}")
                i += length
                matched = True
                break
            if cleaned and cleaned in AUTO_REVERSE:
                prefix, _, _ = _split_affixes(chunk[0])
                _, _, suffix = _split_affixes(chunk[-1])
                out.append(f"{prefix}{AUTO_REVERSE[cleaned]}{suffix}")
                i += length
                matched = True
                break
        if matched:
            continue

        raw = words[i]
        prefix, core, suffix = _split_affixes(raw)
        cleaned_core = core.lower()
        if not cleaned_core:
            out.append(raw)
        elif cleaned_core in REVERSE_DICTIONARY:
            out.append(f"{prefix}{REVERSE_DICTIONARY[cleaned_core]}{suffix}")
        elif cleaned_core in AUTO_REVERSE:
            out.append(f"{prefix}{AUTO_REVERSE[cleaned_core]}{suffix}")
        else:
            out.append(f"[{raw}]")
        i += 1
    return " ".join(out)


def translate_to_alien(text: str) -> str:
    text = _sanitize_text(text)
    _validate_english_only(text)
    return "\n".join(to_alien_line(line) for line in text.split("\n"))


def translate_to_english(text: str) -> str:
    text = _sanitize_text(text)
    _validate_english_only(text)
    return "\n".join(to_english_line(line) for line in text.split("\n"))


if __name__ == "__main__":
    print(f"Loaded {len(DICTIONARY)} dictionary entries, {len(FILLER_SYLLABLES)} filler syllables available for coining new words.")
    sample = "Hello friend, I am happy. I want to continue tomorrow, see you at the spaceship."
    print("EN ->", sample)
    alien = translate_to_alien(sample)
    print("Alien ->", alien)
    print("EN <- ", translate_to_english(alien))
