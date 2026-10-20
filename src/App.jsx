import { useEffect, useRef, useState } from "react";
import nimbus76 from "./assets/nimbus76.webp";
import logoVid from "./assets/logo_vid-2.mp4";
import bbr from "./assets/bbr.webp";
import rainAudio from "./assets/rain.mp3";
import classicAudio from "./assets/classic.mp3";
import { Analytics } from "@vercel/analytics/react";

function isFastConnection() {
  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;

  if (!connection) return true;
  if (connection.saveData) return false;
  if (connection.effectiveType && connection.effectiveType !== "4g")
    return false;

  return true;
}

// Browsers block autoplay with sound until the user interacts with the
// page, so if play() is rejected, retry on the first interaction.
function startAudio(audio) {
  if (!audio || !audio.paused) return;

  audio.play().catch(() => {
    const events = ["pointerdown", "keydown", "touchstart"];
    const resume = () => {
      events.forEach((e) => window.removeEventListener(e, resume));
      audio.play().catch(() => {});
    };
    events.forEach((e) => window.addEventListener(e, resume));
  });
}

// MP3s carry a little silent padding at each end, which would leave a gap
// in the loop, so find where the actual audio starts and stops.
function findAudibleRange(buffer) {
  const data = buffer.getChannelData(0);
  const threshold = 0.0005;
  let start = 0;
  let end = data.length - 1;
  while (start < end && Math.abs(data[start]) < threshold) start++;
  while (end > start && Math.abs(data[end]) < threshold) end--;
  return [start / buffer.sampleRate, (end + 1) / buffer.sampleRate];
}

// <audio loop> pauses briefly at each repeat, so play the track through Web
// Audio, which loops sample-accurately. Returns a cleanup function.
function startSeamlessLoop(url) {
  const ctx = new AudioContext();
  let cancelled = false;

  // Like <audio>, the context stays suspended until the user interacts.
  const events = ["pointerdown", "keydown", "touchstart"];
  const resume = () => ctx.resume();
  const removeListeners = () =>
    events.forEach((e) => window.removeEventListener(e, resume));
  events.forEach((e) => window.addEventListener(e, resume));
  ctx.onstatechange = () => {
    if (ctx.state === "running") removeListeners();
  };

  fetch(url)
    .then((response) => response.arrayBuffer())
    .then((data) => ctx.decodeAudioData(data))
    .then((buffer) => {
      if (cancelled) return;
      const [loopStart, loopEnd] = findAudibleRange(buffer);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.loopStart = loopStart;
      source.loopEnd = loopEnd;

      // Fade in over the first pass of the loop, then hold at full volume.
      // The context's clock is frozen while suspended, so this still lines
      // up with the first loop if playback waits for a user interaction.
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(1, ctx.currentTime + loopEnd - loopStart);

      source.connect(gain).connect(ctx.destination);
      source.start(0, loopStart);
    })
    .catch(() => {});

  return () => {
    cancelled = true;
    removeListeners();
    ctx.close();
  };
}

function App() {
  const [playLogoVideo] = useState(isFastConnection);
  const rainRef = useRef(null);

  useEffect(() => {
    startAudio(rainRef.current);
  }, []);

  useEffect(() => startSeamlessLoop(classicAudio), []);

  return (
    <>
      <div className="hero">
        <Analytics />
        <img className="fullscreen" src={nimbus76} alt="Nimbus 76" />
        {playLogoVideo && (
          <video
            className="fullscreen"
            src={logoVid}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
          />
        )}
      </div>
      <audio ref={rainRef} src={rainAudio} loop preload="auto" />
      <img className="bbr-logo" src={bbr} alt="Brain Butter Records" />
    </>
  );
}

export default App;
