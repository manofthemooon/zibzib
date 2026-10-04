// Real alien bust photo that "talks" - a dark mouth overlay grows/shrinks over
// the photo's own mouth position in sync with the gibberish blips from
// useAlienSpeech, since the static photo can't open its mouth on its own.
export default function AlienSpeaker({ active, mouthOpen, big }) {
  return (
    <div
      className={`alien-speaker${active ? ' active' : ''}${big ? ' alien-speaker--big' : ''}`}
    >
      <img src="/alien-photo.png" alt="" className="alien-photo" />
      <div className={`alien-mouth${mouthOpen ? ' alien-mouth-open' : ''}`} />
    </div>
  );
}
