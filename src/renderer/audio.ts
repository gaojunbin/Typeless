import type { CaptureCommand, CaptureErrorCode, TypelessBridge } from '../shared/contracts';

export function encodeWav(chunks: Float32Array[], inputRate: number): Uint8Array {
  const length = chunks.reduce((n, c) => n + c.length, 0);
  const input = new Float32Array(length);
  let offset = 0;
  for (const chunk of chunks) { input.set(chunk, offset); offset += chunk.length; }
  const count = Math.floor(length * 16000 / inputRate);
  const bytes = new Uint8Array(44 + count * 2);
  const view = new DataView(bytes.buffer);
  const word = (at: number, text: string) => [...text].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  word(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true); word(8, 'WAVE'); word(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true); view.setUint32(28, 32000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  word(36, 'data'); view.setUint32(40, count * 2, true);
  for (let i = 0; i < count; i++) {
    const start = Math.floor(i * inputRate / 16000);
    const end = Math.min(length, Math.max(start + 1, Math.floor((i + 1) * inputRate / 16000)));
    let sum = 0; for (let j = start; j < end; j++) sum += input[j] ?? 0;
    const value = Math.max(-1, Math.min(1, sum / (end - start)));
    view.setInt16(44 + i * 2, value < 0 ? value * 32768 : value * 32767, true);
  }
  return bytes;
}

export function captureFailure(error: unknown): { code: CaptureErrorCode; message: string } {
  const name = error instanceof Error ? error.name : '';
  if (['NotAllowedError', 'SecurityError'].includes(name)) return { code: 'microphone_denied', message: 'Microphone access was denied. Check system permissions.' };
  if (['NotFoundError', 'NotReadableError', 'OverconstrainedError', 'AbortError'].includes(name)) return { code: 'microphone_unavailable', message: 'The microphone is unavailable. Select a connected input device.' };
  return { code: 'capture_failed', message: 'Audio capture failed. Check the microphone and try again.' };
}

export function installCapture(bridge: TypelessBridge): () => void {
  let active: { id: string; stream?: MediaStream; context?: AudioContext; processor?: ScriptProcessorNode; source?: MediaStreamAudioSourceNode; timer?: ReturnType<typeof setTimeout>; chunks: Float32Array[]; start: number; rate: number; peak: number; stopping: boolean } | undefined;
  function release() {
    if (!active) return;
    clearTimeout(active.timer); active.processor?.disconnect(); active.source?.disconnect();
    active.stream?.getTracks().forEach(track => track.stop()); void active.context?.close();
    active = undefined;
  }
  function finish(id: string, cancel: boolean) {
    if (!active || active.id !== id || active.stopping) return;
    active.stopping = true;
    const current = active;
    if (!cancel) {
      if (!current.context || current.peak < 0.002 || !current.chunks.length) {
        bridge.reportCapture({ type: 'error', sessionId: id, code: 'no_speech', message: 'No speech was detected. Check the microphone and try again.' });
      } else {
        const durationMs = current.chunks.reduce((n, chunk) => n + chunk.length, 0) / current.rate * 1000;
        bridge.reportCapture({ type: 'audio', sessionId: id, audio: encodeWav(current.chunks, current.rate), durationMs, sampleRate: 16000 });
      }
    }
    release();
  }
  async function command(command: CaptureCommand) {
    if (command.type !== 'start') { finish(command.sessionId, command.type === 'cancel'); return; }
    release();
    const current = { id: command.sessionId, chunks: [] as Float32Array[], start: performance.now(), rate: 16000, peak: 0, stopping: false } as NonNullable<typeof active>;
    active = current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: command.deviceId ? { exact: command.deviceId } : undefined, channelCount: 1, echoCancellation: true, noiseSuppression: true }, video: false });
      if (active !== current) { stream.getTracks().forEach(track => track.stop()); return; }
      current.stream = stream;
      const context = new AudioContext(); current.context = context; current.rate = context.sampleRate;
      current.source = context.createMediaStreamSource(stream);
      current.processor = context.createScriptProcessor(4096, 1, 1);
      current.processor.onaudioprocess = event => {
        if (active !== current || current.stopping) return;
        const samples = new Float32Array(event.inputBuffer.getChannelData(0)); current.chunks.push(samples);
        let sum = 0; for (const value of samples) sum += value * value;
        const rms = Math.sqrt(sum / samples.length); current.peak = Math.max(current.peak, rms);
        bridge.reportCapture({ type: 'level', sessionId: current.id, level: Math.min(1, rms * 8), durationMs: performance.now() - current.start });
      };
      current.source.connect(current.processor); current.processor.connect(context.destination);
      await context.resume();
      if (active !== current) return;
      current.start = performance.now();
      stream.getAudioTracks().forEach(track => { track.onended = () => { if (active === current) { bridge.reportCapture({ type: 'error', sessionId: current.id, code: 'microphone_disconnected', message: 'The microphone disconnected. Select a connected input device.' }); release(); } }; });
      current.timer = setTimeout(() => finish(current.id, false), Math.max(1, command.maxDurationSeconds) * 1000);
      bridge.reportCapture({ type: 'started', sessionId: current.id });
    } catch (error) {
      if (active === current) { bridge.reportCapture({ type: 'error', sessionId: current.id, ...captureFailure(error) }); release(); }
    }
  }
  const unsubscribe = bridge.onCaptureCommand(commandValue => { void command(commandValue); });
  return () => { unsubscribe(); release(); };
}
