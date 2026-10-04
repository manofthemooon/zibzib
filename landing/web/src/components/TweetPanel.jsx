import { useState } from 'react';
import { useTypewriter } from '../hooks/useTypewriter.js';

export default function TweetPanel({ onSpeak }) {
  const [url, setUrl] = useState('');
  const [original, setOriginal] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const typed = useTypewriter(result);

  async function translate() {
    setOriginal('');
    setResult('');
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/translate-tweet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setOriginal(data.original);
        setResult(data.translated);
        onSpeak?.(data.translated || '');
      }
    } catch (e) {
      setError('error: ' + e);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      translate();
    }
  }

  return (
    <div className="panel panel--tweet">
      <h2>translate tweet</h2>
      <input
        type="text"
        placeholder="https://x.com/user/status/..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button onClick={translate}>translate</button>
      <div className="output original">{original}</div>
      <div className={`output${error ? ' error' : ''}`}>
        {error || (loading ? '...' : typed)}
      </div>
    </div>
  );
}
