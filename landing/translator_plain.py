"""
"Plain" variant of the zib zib translator - same alien-dictionary.md source
and the same input sanitization / English-only validation as translator.py
(imported from there, not duplicated), but NO word-coining and NO
bracket-wrapping for unknown words.

If a word isn't in the dictionary, it's left exactly as typed, in English,
regardless of translation direction. This is the simple "just look it up,
otherwise leave it" behavior, as opposed to translator.py's coining engine.
"""
from translator import (
    DICTIONARY,
    REVERSE_DICTIONARY,
    MAX_PHRASE_WORDS,
    MAX_ALIEN_PHRASE_WORDS,
    _clean_word,
    _split_affixes,
    _sanitize_text,
    _validate_english_only,
)


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
        elif cleaned_core in DICTIONARY:
            out.append(f"{prefix}{DICTIONARY[cleaned_core]}{suffix}")
        else:
            # Unknown word: leave it exactly as typed, in English.
            out.append(raw)
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
        if matched:
            continue

        raw = words[i]
        prefix, core, suffix = _split_affixes(raw)
        cleaned_core = core.lower()
        if not cleaned_core:
            out.append(raw)
        elif cleaned_core in REVERSE_DICTIONARY:
            out.append(f"{prefix}{REVERSE_DICTIONARY[cleaned_core]}{suffix}")
        else:
            # Unrecognized alien token: leave it exactly as typed.
            out.append(raw)
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
    print(f"Loaded {len(DICTIONARY)} dictionary entries (plain mode - no coining).")
    sample = "Hello friend, I am happy. I want to continue tomorrow, see you at the spaceship."
    print("EN ->", sample)
    alien = translate_to_alien(sample)
    print("Alien ->", alien)
    print("EN <- ", translate_to_english(alien))
