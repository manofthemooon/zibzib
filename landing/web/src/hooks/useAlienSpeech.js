import { useCallback, useRef, useState } from 'react';

// Synthesizes short "alien gibberish" blips with the Web Audio API (no voice
// recording/asset needed - it's generated on the fly) and reports back when
// the mouth should be open/closed so a talking-alien animation can follow along.
export function useAlienSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const ctxRef = useRef(null);
  const timeoutsRef = useRef([]);

  const speak = useCallback((text) => {
    if (!text) return;

    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = ctxRef.current || new AudioCtx();
    ctxRef.current = ctx;
    if (ctx.state === 'suspended') ctx.resume();

    const blips = Math.max(3, Math.min(40, Math.round(text.length / 3)));
    const blipDuration = 0.09;
    const gap = 0.05;
    const step = blipDuration + gap;
    const now = ctx.currentTime;
    const totalMs = blips * step * 1000;
    const words = text.split(/\s+/).filter(Boolean);

    setIsSpeaking(true);
    setCaption('');
    words.forEach((_, i) => {
      const at = ((i + 1) / words.length) * totalMs;
      timeoutsRef.current.push(
        setTimeout(() => setCaption(words.slice(0, i + 1).join(' ')), at),
      );
    });
    timeoutsRef.current.push(setTimeout(() => setCaption(''), totalMs + 1400));

    for (let i = 0; i < blips; i++) {
      const t = now + i * step;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 140 + Math.random() * 260;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.15, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + blipDuration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + blipDuration);

      const openAt = i * step * 1000;
      timeoutsRef.current.push(setTimeout(() => setMouthOpen(true), openAt));
      timeoutsRef.current.push(
        setTimeout(() => setMouthOpen(false), openAt + blipDuration * 1000),
      );
    }

    timeoutsRef.current.push(
      setTimeout(() => {
        setIsSpeaking(false);
        setMouthOpen(false);
      }, blips * step * 1000),
    );
  }, []);

  return { speak, isSpeaking, mouthOpen, caption };
}
