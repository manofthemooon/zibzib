import { useCallback, useEffect, useRef, useState } from 'react';

// Pseudo-3D "drag to rotate" viewer, same trick ipodonchain.com uses under
// the hood (confirmed by inspecting their JS bundle - there's no WebGL/3D
// engine there either, just a pointer-drag angle tracker swapping between
// pre-rendered frames). Frames are the real rendered angle photos. The alien
// itself lives on the phone's own screen now (replaces the old standalone
// AlienSpeaker bust) - same video, same caption/glitch props, just displayed
// through the phone's organic screen cutout instead of as a free-floating box.
const MIN_ANGLE = -60;
const MAX_ANGLE = 60;
const STEP = 20;

const FRAMES = [
  { angle: -60, img: '/phone-frames/phone_-60.png' },
  { angle: -40, img: '/phone-frames/phone_-40.png' },
  { angle: -20, img: '/phone-frames/phone_-20.png' },
  { angle: 0, img: '/phone-frames/phone_0.png' },
  { angle: 20, img: '/phone-frames/phone_20.png' },
  { angle: 40, img: '/phone-frames/phone_40.png' },
  { angle: 60, img: '/phone-frames/phone_60.png' },
];

// how close to 0deg counts as "facing front" - only there does the real
// screen content (masked to the phone's own screen shape) show up; off to
// the side you just see whatever's baked into that angle's photo (a dark,
// powered-off screen).
const FRONT_ZONE = 8;

export default function PhoneViewer({ active, caption, captionPosition, glitchKey, replay }) {
  const [angle, setAngle] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [dragging, setDragging] = useState(false);
  const drag = useRef(null);
  const videoRef = useRef(null);
  const isFirstRender = useRef(true);
  const replaysLeft = useRef(0);

  const clamp = (v) => Math.min(MAX_ANGLE, Math.max(MIN_ANGLE, v));

  const onPointerDown = useCallback((e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startAngle: angle };
    setAnimating(false);
    setDragging(true);
  }, [angle]);

  const onPointerMove = useCallback((e) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.startX;
    // ~0.25deg per pixel - a full -60..60 sweep takes about 480px of drag.
    setAngle(clamp(drag.current.startAngle + dx * 0.25));
  }, []);

  function endDrag() {
    if (!drag.current) return;
    drag.current = null;
    setDragging(false);
    // spring back to facing front the moment it's released - there's no
    // separate "reset" button, letting go IS the reset.
    setAnimating(true);
    setAngle(0);
  }

  const isFront = Math.abs(angle) <= FRONT_ZONE;

  // same play-on-trigger behavior as the old AlienSpeaker: the clip's first
  // frame (poster) already shows the calm idle pose, so it's visible as soon
  // as the phone is facing front - clicking/translating just plays it through.
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

  // continuous blend between the two nearest anchor frames around `angle`.
  const t = (angle - MIN_ANGLE) / STEP;
  const lower = Math.max(0, Math.min(FRAMES.length - 2, Math.floor(t)));
  const blend = t - lower;

  return (
    <div
      className={`phone-viewer__stage${dragging ? ' phone-viewer__stage--dragging' : ''}${active ? ' phone-viewer__stage--active' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div className={`phone-viewer__frames${animating ? ' phone-viewer__frames--animating' : ''}`}>
        {FRAMES.map((f, i) => {
          const opacity = i === lower ? 1 - blend : i === lower + 1 ? blend : 0;
          if (opacity <= 0) return null;
          return (
            <img
              key={f.angle}
              src={f.img}
              alt=""
              className="phone-viewer__frame"
              style={{ opacity }}
              draggable={false}
            />
          );
        })}
      </div>

      {/* live screen content - masked to the phone's own organic screen
          shape (from the 0deg photo), only visible facing front. */}
      <div
        className={`phone-viewer__screen-live${isFront ? ' phone-viewer__screen-live--on' : ''}`}
      >
        <video
          ref={videoRef}
          src="/alien-main.mp4"
          poster="/alien-poster.jpg"
          muted
          playsInline
          preload="auto"
          onEnded={handleEnded}
        />
      </div>

      {isFront && caption && (
        <div className={`alien-caption alien-caption--${captionPosition || 'top'}`}>
          {caption}
        </div>
      )}
    </div>
  );
}
