import TextPanel from './components/TextPanel.jsx';
import TweetPanel from './components/TweetPanel.jsx';
import Rail from './components/Rail.jsx';

export default function App() {
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
          <span className="arrow">↗</span>
        </a>
      </div>

      <section className="hero">
        <div className="eyebrow">
          <span className="eyebrow-bars" aria-hidden="true">|||</span>
          alien dictionary · plain mode
        </div>
        <h1 className="headline">
          <em>Zap zup</em>, world.
        </h1>
        <p className="subhead">
          I do not zab blab blab your language yet — to be continued.
        </p>
      </section>

      <div className="main">
        <TextPanel />
        <TweetPanel />
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
