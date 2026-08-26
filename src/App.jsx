import { useState } from 'react'
import nimbus76 from './assets/nimbus76.webp'
import logoVid from './assets/logo_vid.mp4'
import bbr from './assets/bbr.webp'

function isFastConnection() {
  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection

  if (!connection) return true
  if (connection.saveData) return false
  if (connection.effectiveType && connection.effectiveType !== '4g') return false

  return true
}

function App() {
  const [playLogoVideo] = useState(isFastConnection)

  return (
    <>
      <div className="hero">
        <img
          className="fullscreen"
          src={nimbus76}
          alt="Nimbus 76"
        />
        {playLogoVideo && (
          <video
            className="fullscreen"
            src={logoVid}
            autoPlay
            muted
            playsInline
            preload="auto"
          />
        )}
      </div>
      <img
        className="bbr-logo"
        src={bbr}
        alt="Brain Butter Records"
      />
    </>
  )
}

export default App
