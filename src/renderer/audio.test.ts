import { describe, expect, it } from 'vitest';
import { encodeWav } from './audio';

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
