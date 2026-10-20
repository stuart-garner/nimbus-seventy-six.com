import { useEffect, useRef, useState } from "react";
import AudioMotionAnalyzer from "audiomotion-analyzer";

function SpectrumAnalyzer({ audioCtx, source }) {
  const containerRef = useRef(null);
  const [running, setRunning] = useState(audioCtx.state === "running");

  useEffect(() => {
    const analyzer = new AudioMotionAnalyzer(containerRef.current, {
      audioCtx,
      source,
      // The source already plays through the speakers, so only listen to it.
      connectSpeakers: false,
      // Six full-octave bars, centred on C3 (131 Hz) up to C8 (4186 Hz).
      mode: 8,
      minFreq: 90,
      maxFreq: 6000,
      alphaBars: false,
      ledBars: false,
      lumiBars: false,
      showBgColor: false,
      overlay: true,
      showScaleX: false,
      showPeaks: true,
      reflexRatio: 0.3,
      reflexAlpha: 0.2,
      smoothing: 0.7,
    });
    analyzer.registerGradient("white", { colorStops: ["#fff"] });
    analyzer.gradient = "white";

    // While the context is suspended the analyser keeps drawing its last
    // frame, so hide the bars instead of leaving them frozen.
    const update = () => setRunning(audioCtx.state === "running");
    audioCtx.addEventListener("statechange", update);

    return () => {
      audioCtx.removeEventListener("statechange", update);
      analyzer.destroy();
    };
  }, [audioCtx, source]);

  return (
    <div
      className="spectrum"
      ref={containerRef}
      style={{ opacity: running ? 0.25 : 0 }}
    />
  );
}

export default SpectrumAnalyzer;
