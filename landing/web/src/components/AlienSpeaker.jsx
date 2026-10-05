import { useEffect, useRef, useState } from 'react';

// Real alien bust photo that "talks" - a dark mouth overlay grows/shrinks over
// the photo's own mouth position in sync with the gibberish blips from
// useAlienSpeech, since the static photo can't open its mouth on its own.
//
// On top of that, every interaction (click, or a real translation) fires a
// short "signal interference" video flash: the photo cross-fades to a short
// glitch/static clip, then fades back to the photo once the clip ends. This
// is independent of how long the alien keeps "talking" - the glitch is a
// brief decorative flash, not the mouth animation itself, so it works the
// same whether the reply is 2 words or the full 150 characters.
export default function AlienSpeaker({ active, mouthOpen, big, caption, captionPosition, glitchKey }) {
  const videoRef = useRef(null);
  const isFirstRender = useRef(true);
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    setIsGlitching(true);
    video.currentTime = 0;
    video.play().catch(() => {});
  }, [glitchKey]);

  return (
    <div
      className={`alien-speaker${active ? ' active' : ''}${big ? ' alien-speaker--big' : ''}${isGlitching ? ' alien-speaker--glitching' : ''}`}
    >
      <img src="/alien-photo.png" alt="" className="alien-photo" />
      <video
        ref={videoRef}
        className="alien-glitch-video"
        src="/alien-glitch.mp4"
        muted
        playsInline
        preload="none"
        onEnded={() => setIsGlitching(false)}
      />
      <div className={`alien-mouth${mouthOpen ? ' alien-mouth-open' : ''}`} />
      {caption && (
        <div className={`alien-caption alien-caption--${captionPosition || 'top'}`}>
          {caption}
        </div>
      )}
    </div>
  );
}
