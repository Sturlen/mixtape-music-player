import { APITester } from "./APITester"
import "./index.css"

import logo from "./logo.svg"
import reactLogo from "./react.svg"

export function App() {
  return (
    <div className="app">
      <article
        style={{
          backgroundColor: "black",
          borderRadius: "16px",
          overflow: "hidden",
          padding: "2rem",
        }}
      >
        <div className="logo-container">
          <img src={logo} alt="Bun Logo" className="logo bun-logo" />
          <img src={reactLogo} alt="React Logo" className="logo react-logo" />
        </div>

        <h1>Spelemann</h1>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
        <APITester />
        <audio src="/api/track.mp3" controls />
        <audio
          src="/api/playback/Ghost/album/Seven Inches of Satanic Panic/track/Kiss The Go-Goat/file.mp3"
          controls
        />
      </article>
      <div
        style={{
          position: "fixed",
          bottom: "16px",
          right: "16px",
          background: "rgba(0,0,0,0.7)",
          color: "#fff",
          padding: "8px 16px",
          borderRadius: "8px",
          fontSize: "0.9rem",
          zIndex: 1000,
          textAlign: "left",
        }}
      >
        <div style={{ fontStyle: "italic" }}>Brudeferden i Hardanger</div>
        <div>Photo: Nasjonalmuseet / Børre Høstland</div>
      </div>
    </div>
  )
}

export default App
