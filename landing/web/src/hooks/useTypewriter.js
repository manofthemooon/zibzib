import { useEffect, useState } from 'react';

// Reveals `text` one character at a time, mirroring the old typeText() helper.
export function useTypewriter(text, speed = 10) {
  const [shown, setShown] = useState('');

  useEffect(() => {
    if (!text) {
      setShown('');
      return;
    }
    let i = 0;
    setShown('');
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  return shown;
}
