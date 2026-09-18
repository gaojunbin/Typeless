import type { CaptureCommand, TypelessBridge } from '../shared/contracts';
import { describe, expect, it, vi } from 'vitest';
import { captureFailure, encodeWav, installCapture } from './audio';

describe('capture WAV encoding', () => {
  it('writes a mono PCM16 WAV with a complete header and exact duration', () => {
    const encoded = encodeWav([new Float32Array(24000).fill(0.5), new Float32Array(24000).fill(-0.5)], 48000);
    const view = new DataView(encoded.buffer);
    expect(new TextDecoder().decode(encoded.slice(0, 4))).toBe('RIFF');
    expect(view.getUint32(4, true)).toBe(encoded.length - 8);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(16000);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(32000);
    expect(view.getInt16(44, true)).toBe(16383);
    expect(view.getInt16(44 + 8000 * 2, true)).toBe(-16384);
  });
  it('bounds samples and accepts an empty input without malformed lengths', () => {
    const encoded = encodeWav([Float32Array.from([-2, 2])], 16000);
    const view = new DataView(encoded.buffer);
    expect(view.getInt16(44, true)).toBe(-32768);
    expect(view.getInt16(46, true)).toBe(32767);
    expect(encodeWav([], 48000).length).toBe(44);
  });
});

describe('capture failure classification', () => {
  it.each([
    ['NotAllowedError', 'microphone_denied'], ['SecurityError', 'microphone_denied'],
    ['NotFoundError', 'microphone_unavailable'], ['NotReadableError', 'microphone_unavailable'],
    ['OverconstrainedError', 'microphone_unavailable'], ['AbortError', 'microphone_unavailable'],
    ['Error', 'capture_failed'],
  ])('classifies %s without exposing device error details', (name, code) => {
    const error = new Error('Private device details'); error.name = name;
    expect(captureFailure(error).code).toBe(code);
    expect(captureFailure(error).message).not.toContain('Private');
  });
});

describe('capture error reporting', () => {
  it.each(['no_speech', 'microphone_disconnected'] as const)('reports %s from an active capture and releases its device', async code => {
    let command!: (command: CaptureCommand) => void;
    const reportCapture = vi.fn();
    const track = { stop: vi.fn(), onended: undefined as (() => void) | undefined };
    const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
    const close = vi.fn(async () => {});
    class AudioFixture {
      sampleRate = 48000;
      destination = {};
      createMediaStreamSource() { return { connect: vi.fn(), disconnect: vi.fn() }; }
      createScriptProcessor() { return { connect: vi.fn(), disconnect: vi.fn(), onaudioprocess: undefined }; }
      resume = async () => {};
      close = close;
    }
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn(async () => stream) } });
    vi.stubGlobal('AudioContext', AudioFixture);
    const release = installCapture({ getSnapshot: vi.fn(), dispatch: vi.fn(), subscribe: vi.fn(), onCaptureCommand: listener => { command = listener; return () => {}; }, reportCapture } as TypelessBridge);
    try {
      command({ type: 'start', sessionId: 'fixture', deviceId: 'default', maxDurationSeconds: 60 });
      await vi.waitFor(() => expect(reportCapture).toHaveBeenCalledWith({ type: 'started', sessionId: 'fixture' }));
      if (code === 'no_speech') command({ type: 'stop', sessionId: 'fixture' });
      else track.onended?.();
      expect(reportCapture).toHaveBeenLastCalledWith({ type: 'error', sessionId: 'fixture', code, message: expect.any(String) });
      expect(track.stop).toHaveBeenCalledTimes(1); expect(close).toHaveBeenCalledTimes(1);
    } finally { release(); vi.unstubAllGlobals(); }
  });
});
