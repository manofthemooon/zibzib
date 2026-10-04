import TextPanel from './components/TextPanel.jsx';
import TweetPanel from './components/TweetPanel.jsx';
import Rail from './components/Rail.jsx';
import AlienSpeaker from './components/AlienSpeaker.jsx';
import { useAlienSpeech } from './hooks/useAlienSpeech.js';

export default function App() {
  const { speak, isSpeaking, mouthOpen, caption } = useAlienSpeech();

  return (
    <div className="app">
      <div className="ambient-blob blob-a" aria-hidden="true" />
      <div className="ambient-blob blob-b" aria-hidden="true" />

      <div className="topnav">
        <div className="brand">
          <img src="/alien-logo.png" alt="" className="brand-icon" />
          ZIB ZIB
        </div>
        <a
          href="https://x.com/zibzibx"
          target="_blank"
          rel="noopener"
          className="cta-pill"
        >
          <img src="/x-logo.png" alt="" className="cta-icon" />
          <svg className="arrow" viewBox="0 0 24 24" width="11" height="11" aria-hidden="true">
            <path
              d="M7 17L17 7M17 7H8M17 7V16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </div>

      <section className="hero">
        <h1 className="headline">
          <em>Zap zup</em>, world.
        </h1>
        <p className="subhead">I do not zab blab blab your language yet.</p>
      </section>

      <div className="main">
        <div className="alien-stage">
          <AlienSpeaker active={isSpeaking} mouthOpen={mouthOpen} big />
          {caption && <div className="alien-caption">{caption}</div>}
        </div>
        <div className="panels-group">
          <TextPanel onSpeak={speak} />
          <TweetPanel onSpeak={speak} />
        </div>
        <Rail />
      </div>

      <footer>
        <div className="footer-wordmark" aria-hidden="true">ZIB ZIB</div>
        <div className="footer-row">
          <div>zib zib · plain mode</div>
          <div>dictionary lookup only</div>
        </div>
      </footer>
    </div>
  );
}
