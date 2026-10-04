import TextPanel from './components/TextPanel.jsx';
import TweetPanel from './components/TweetPanel.jsx';
import Rail from './components/Rail.jsx';

export default function App() {
  return (
    <div className="app">
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
          ↗
        </a>
      </div>

      <div className="main">
        <TextPanel />
        <TweetPanel />
        <Rail />
      </div>

      <footer>
        <div>zib zib · plain mode</div>
        <div>dictionary lookup only</div>
      </footer>
    </div>
  );
}
