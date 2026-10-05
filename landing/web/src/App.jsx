import { useState } from 'react';
import TextPanel from './components/TextPanel.jsx';
import TweetPanel from './components/TweetPanel.jsx';
import Rail from './components/Rail.jsx';
import AlienSpeaker from './components/AlienSpeaker.jsx';
import { useAlienSpeech } from './hooks/useAlienSpeech.js';

const CAPTION_POSITIONS = ['left', 'top', 'right'];

// A handful of real dictionary words/phrases (see alien-dictionary.md), picked
// for being short and fun, used to make the alien babble something on hover.
const ALIEN_HOVER_PHRASES = [
  'zap zup',
  'zib zib',
  'vip vop',
  'zeb zep',
  'zob zep',
  'zup zib',
  'zep zep',
  'blab',
  'zib',
  'bleb bleb',
  'zibzidi',
  'zib zab zap',
  'vop zun',
  'zup blab',
];

function randomAlienPhrase() {
  return ALIEN_HOVER_PHRASES[Math.floor(Math.random() * ALIEN_HOVER_PHRASES.length)];
}

export default function App() {
  const { speak, isSpeaking, mouthOpen, caption } = useAlienSpeech();
  const [captionPosition, setCaptionPosition] = useState('top');

  function speakWithPosition(text) {
    setCaptionPosition(CAPTION_POSITIONS[Math.floor(Math.random() * CAPTION_POSITIONS.length)]);
    speak(text);
  }

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

      <div className="stage">
        <div className="content-col">
          <section className="hero">
            <h1 className="headline">
              <em className="hello-swap">
                <span className="hello-swap__default">Zap zup,</span>
                <span className="hello-swap__hover" aria-hidden="true">Hello,</span>
              </em><br />world.
            </h1>
            <p className="subhead">I do not zab blab blab your language yet.</p>
          </section>

          <div className="panels-group">
            <TextPanel onSpeak={speakWithPosition} />
            <TweetPanel onSpeak={speakWithPosition} />
          </div>
        </div>

        <div className="alien-row">
          <div className="side-tag side-tag--left" aria-hidden="true">signal // 001</div>

          <div className="alien-stage" onClick={() => speakWithPosition(randomAlienPhrase())}>
            <AlienSpeaker
              active={isSpeaking}
              mouthOpen={mouthOpen}
              big
              caption={caption}
              captionPosition={captionPosition}
            />
          </div>

          <div className="side-tag side-tag--right" aria-hidden="true">alien language lab</div>
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
