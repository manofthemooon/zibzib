import { useState } from 'react';
import DirectionToggle from './DirectionToggle.jsx';
import AlienSpeaker from './AlienSpeaker.jsx';
import { useTypewriter } from '../hooks/useTypewriter.js';
import { useAlienSpeech } from '../hooks/useAlienSpeech.js';
import { validateEnglishOnly } from '../utils/validate.js';

const MAX_LENGTH = 4000;

export default function TextPanel() {
  const [direction, setDirection] = useState('to_alien');
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const typed = useTypewriter(result);
  const { speak, isSpeaking, mouthOpen } = useAlienSpeech();

  async function translate() {
    const validationError = validateEnglishOnly(text);
    if (validationError) {
      setError(validationError);
      setResult('');
      return;
    }
    setError(null);
    setLoading(true);
    setResult('');
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, direction }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data.translated || '');
        speak(data.translated || '');
      }
    } catch (e) {
      setError('error: ' + e);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      translate();
    }
  }

  return (
    <div className="panel">
      <AlienSpeaker active={isSpeaking} mouthOpen={mouthOpen} />
      <h2>translate text</h2>
      <DirectionToggle value={direction} onChange={setDirection} />
      <div className="field">
        <textarea
          placeholder="type anything... (max 4000 chars)"
          maxLength={MAX_LENGTH}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="char-counter">
          {text.length}/{MAX_LENGTH}
        </div>
      </div>
      <button onClick={translate}>translate</button>
      <div className={`output${error ? ' error' : ''}`}>
        {error || (loading ? '...' : typed)}
      </div>
    </div>
  );
}
