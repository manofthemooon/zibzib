// Small line-art alien that pops up and "talks" (mouth toggles open/closed)
// in sync with the gibberish blips from useAlienSpeech.
export default function AlienSpeaker({ active, mouthOpen }) {
  return (
    <div className={`alien-speaker${active ? ' active' : ''}`}>
      <svg viewBox="0 0 100 120" className="alien-svg">
        <path d="M38 70 C28 86 28 97 40 106 L60 106 C72 97 72 86 62 70 Z" />
        <circle cx="50" cy="40" r="33" />
        <ellipse cx="36" cy="36" rx="11" ry="7" transform="rotate(-12 36 36)" />
        <ellipse cx="64" cy="36" rx="11" ry="7" transform="rotate(12 64 36)" />
        {mouthOpen ? (
          <ellipse cx="50" cy="57" rx="6" ry="5" className="mouth mouth-open" />
        ) : (
          <path d="M43 57 Q50 53 57 57" className="mouth" />
        )}
      </svg>
    </div>
  );
}
