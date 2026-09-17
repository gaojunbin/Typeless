import { describe, expect, it } from 'vitest';
import { recordingCue } from './sounds';

describe('recording sound transitions', () => {
  it('sounds only once after confirmed recording and once when recording ends', () => {
    expect(recordingCue({ id: 'a', status: 'arming' }, { id: 'a', status: 'recording' }, true)).toBe('start');
    expect(recordingCue({ id: 'a', status: 'recording' }, { id: 'a', status: 'recording' }, true)).toBeUndefined();
    expect(recordingCue({ id: 'a', status: 'recording' }, { id: 'a', status: 'transcribing' }, true)).toBe('stop');
    expect(recordingCue({ id: 'a', status: 'transcribing' }, { id: 'a', status: 'ready' }, true)).toBeUndefined();
  });
  it('ignores initial snapshots, old sessions, muted preference and failed arming', () => {
    expect(recordingCue(undefined, { id: 'a', status: 'recording' }, true)).toBeUndefined();
    expect(recordingCue({ id: 'a', status: 'arming' }, { id: 'b', status: 'recording' }, true)).toBeUndefined();
    expect(recordingCue({ id: 'a', status: 'arming' }, { id: 'a', status: 'recording' }, false)).toBeUndefined();
    expect(recordingCue({ id: 'a', status: 'arming' }, { id: 'a', status: 'error' }, true)).toBeUndefined();
    expect(recordingCue({ id: 'a', status: 'recording' }, { id: 'a', status: 'cancelled' }, true)).toBe('stop');
  });
});
