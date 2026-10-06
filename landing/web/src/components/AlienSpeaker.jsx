import { useEffect, useRef, useState } from 'react';

// The alien is now a single video (no more static photo): idle state shows
// its own first frame via the `poster` image, and on click/translate it
// plays through once - the clip itself has the mouth opening, eyes glowing
// and glitch bursts baked in, so no CSS mouth overlay is needed anymore.
// Its last frame matches the first (mouth closed), so whenever playback
// stops the box already looks like the calm idle pose again.
//
// If the spoken text is long (80+ chars), the clip plays twice in a row
// instead of once, since a single ~3s loop would end well before the
// gibberish audio/caption finishes.
export default function AlienSpeaker({ active, big, caption, captionPosition, glitchKey, replay }) {
  const videoRef = useRef(null);
  const isFirstRender = useRef(true);
  const replaysLeft = useRef(0);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    replaysLeft.current = replay ? 1 : 0;
    video.currentTime = 0;
    video.play().catch(() => {});
  }, [glitchKey]);

  function handleEnded() {
    const video = videoRef.current;
    if (!video) return;
    if (replaysLeft.current > 0) {
      replaysLeft.current -= 1;
      video.currentTime = 0;
      video.play().catch(() => {});
    }
  }

  return (
    <div className={`alien-speaker${active ? ' active' : ''}${big ? ' alien-speaker--big' : ''}`}>
      <video
        ref={videoRef}
        className="alien-video"
        src="/alien-main.mp4"
        poster="/alien-poster.jpg"
        muted
        playsInline
        preload="auto"
        onEnded={handleEnded}
      />
      {caption && (
        <div className={`alien-caption alien-caption--${captionPosition || 'top'}`}>
          {caption}
        </div>
      )}
    </div>
  );
}
