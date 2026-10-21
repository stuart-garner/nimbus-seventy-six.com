import { useEffect, useRef, useState } from "react";
import nimbus76 from "./assets/nimbus76.webp";
import logoVid from "./assets/logo_vid-5.mp4";
import bbr from "./assets/bbr.webp";
import rainAudio from "./assets/rain.mp3";
import classicAudio from "./assets/classic.mp3";
import SpectrumAnalyzer from "./SpectrumAnalyzer";
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
// Audio, which loops sample-accurately. Returns the context and the node the
// music plays through, for visualising it, and a function to stop it.
function startSeamlessLoop(url) {
  const ctx = new AudioContext();
  let cancelled = false;

  // Fade in from silence, then hold at full volume. The context's clock is
  // frozen while suspended, so a fade scheduled before playback starts
  // still runs in full once it does.
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  let fadeDuration = 0;
  const fadeIn = () => {
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + fadeDuration);
  };

  // Like <audio>, the context stays suspended until the user interacts, so
  // the first interaction starts it. Each click after that toggles it on and
  // off; suspending freezes the context's clock, so it resumes where it was,
  // fading in again.
  let started = false;
  const start = () => {
    started = true;
    ctx.resume();
  };
  const toggle = () => {
    if (!started) start();
    else if (ctx.state === "running") ctx.suspend();
    else {
      fadeIn();
      ctx.resume();
    }
  };
  const startEvents = ["keydown", "touchstart"];
  const removeListeners = () => {
    startEvents.forEach((e) => window.removeEventListener(e, start));
    window.removeEventListener("pointerdown", toggle);
  };
  startEvents.forEach((e) => window.addEventListener(e, start));
  window.addEventListener("pointerdown", toggle);
  ctx.onstatechange = () => {
    if (ctx.state === "running")
      startEvents.forEach((e) => window.removeEventListener(e, start));
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

      // Fade in over one pass of the loop.
      fadeDuration = loopEnd - loopStart;
      fadeIn();

      source.connect(gain);
      source.start(0, loopStart);
    })
    .catch(() => {});

  const stop = () => {
    cancelled = true;
    removeListeners();
    ctx.close();
  };
  return { audioCtx: ctx, output: gain, stop };
}

function App() {
  const [playLogoVideo] = useState(isFastConnection);
  const rainRef = useRef(null);

  useEffect(() => {
    startAudio(rainRef.current);
  }, []);

  const [music, setMusic] = useState(null);

  useEffect(() => {
    const loop = startSeamlessLoop(classicAudio);
    setMusic(loop);
    return loop.stop;
  }, []);

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
      {music && (
        <SpectrumAnalyzer audioCtx={music.audioCtx} source={music.output} />
      )}
      <img className="bbr-logo" src={bbr} alt="Brain Butter Records" />
    </>
  );
}

export default App;
