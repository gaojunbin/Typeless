import { useEffect, useRef, useState } from 'react';
import type { RunAction } from '../settings/types';

const BARS = 15;
/** RMS level that counts as speech for the "已检测到声音" badge. */
const DETECTED_LEVEL = 0.02;
/** Shallow arc from 24px at the edges to 72px in the middle. */
const heights = Array.from({ length: BARS }, (_, index) => {
  const offset = (index - (BARS - 1) / 2) / ((BARS - 1) / 2);
  return Math.round(72 - 48 * offset * offset);
});

export interface MicTestState {
  level: number;
  detected: boolean;
  failed: boolean;
}

/**
 * Live microphone level for the setup guide. The audio never leaves the renderer: main only
 * learns that a test is running, so it can grant the media permission while nothing is recording.
 */
export function useMicTest(deviceId: string, active: boolean, run: RunAction): MicTestState {
  const [level, setLevel] = useState(0);
  const [detected, setDetected] = useState(false);
  const [failed, setFailed] = useState(false);
  const runRef = useRef(run);
  runRef.current = run;
  useEffect(() => {
    if (!active) return;
    let live = true;
    let frame = 0;
    let stream: MediaStream | undefined;
    let context: AudioContext | undefined;
    setFailed(false);
    void runRef.current({ type: 'microphone.test', active: true });
    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: deviceId === 'default' ? undefined : { exact: deviceId } }, video: false });
        if (!live) { stream.getTracks().forEach(track => track.stop()); return; }
        context = new AudioContext();
        const analyser = context.createAnalyser();
        analyser.fftSize = 1024;
        context.createMediaStreamSource(stream).connect(analyser);
        const samples = new Float32Array(analyser.fftSize);
        const tick = () => {
          if (!live) return;
          analyser.getFloatTimeDomainData(samples);
          let sum = 0;
          for (const value of samples) sum += value * value;
          const next = Math.min(1, Math.sqrt(sum / samples.length) * 4);
          setLevel(next);
          if (next >= DETECTED_LEVEL) setDetected(true);
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      } catch {
        if (live) setFailed(true);
      }
    };
    void start();
    return () => {
      live = false;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach(track => track.stop());
      void context?.close();
      setLevel(0);
      void runRef.current({ type: 'microphone.test', active: false });
    };
  }, [deviceId, active]);
  return { level, detected, failed };
}

export function LevelMeter({ level, active }: { level: number; active: boolean }) {
  const lit = Math.round(Math.max(0, Math.min(1, level)) * BARS);
  return <div className="level-meter" data-active={active ? 'true' : 'false'} aria-hidden="true">
    {heights.map((height, index) => <i key={index} className={index < lit ? 'lit' : undefined} style={{ height: `${height}px` }} />)}
  </div>;
}
