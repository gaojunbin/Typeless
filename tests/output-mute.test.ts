import { afterEach, describe, expect, it, vi } from 'vitest';
import { OutputMute, type OutputControl } from '../electron/output-mute';
import type { AppSettings, SessionStatus } from '../src/shared/contracts';

const audio = (patch: Partial<AppSettings['audio']> = {}): AppSettings['audio'] => ({ deviceId: 'default', maxDurationSeconds: 60, interactionSounds: false, muteDuringRecording: true, ...patch });
function control(): OutputControl & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    muteOutput: vi.fn(async () => { calls.push('mute'); return { muted: true }; }),
    restoreOutput: vi.fn(async () => { calls.push('restore'); return { restored: true }; }),
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
const walk = (mute: OutputMute, statuses: SessionStatus[], settings = audio()) => statuses.forEach(status => mute.sync(status, settings));
afterEach(() => { vi.useRealTimers(); });

describe('output muting during recording', () => {
  it('mutes when recording starts and restores when it ends', async () => {
    const helper = control(); const mute = new OutputMute(helper);
    walk(mute, ['arming']);
    await vi.waitFor(() => expect(helper.calls).toEqual([]));
    walk(mute, ['recording', 'recording']);
    await vi.waitFor(() => expect(helper.calls).toEqual(['mute']));
    expect(mute.held).toBe(true);
    walk(mute, ['transcribing', 'polishing', 'ready']);
    await vi.waitFor(() => expect(helper.calls).toEqual(['mute', 'restore']));
    expect(mute.held).toBe(false); expect(mute.last).toEqual({ mute: 'muted', restore: 'restored' });
  });
  it.each(['cancelled', 'error', 'idle'] as const)('restores when recording ends as %s', async status => {
    const helper = control(); const mute = new OutputMute(helper);
    walk(mute, ['recording']);
    await vi.waitFor(() => expect(mute.held).toBe(true));
    walk(mute, [status]);
    await vi.waitFor(() => expect(helper.calls).toEqual(['mute', 'restore']));
  });
  it('sends nothing when recording ends before the mute request went out', async () => {
    const helper = control(); const mute = new OutputMute(helper);
    walk(mute, ['recording', 'cancelled']);
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(helper.calls).toEqual([]); expect(mute.held).toBe(false);
  });
  it('waits for the start cue before muting and skips muting when recording ends first', async () => {
    vi.useFakeTimers();
    const helper = control(); const mute = new OutputMute(helper, 300);
    const sounds = audio({ interactionSounds: true });
    mute.sync('recording', sounds);
    await vi.advanceTimersByTimeAsync(299); expect(helper.calls).toEqual([]);
    await vi.advanceTimersByTimeAsync(1); expect(helper.calls).toEqual(['mute']);
    mute.sync('transcribing', sounds); await vi.advanceTimersByTimeAsync(0);
    mute.sync('recording', sounds); await vi.advanceTimersByTimeAsync(100);
    mute.sync('cancelled', sounds); await vi.advanceTimersByTimeAsync(1000);
    expect(helper.calls).toEqual(['mute', 'restore']); expect(mute.held).toBe(false);
  });
  it('leaves the output alone when the preference is off and restores when it is switched off mid-recording', async () => {
    const helper = control(); const mute = new OutputMute(helper);
    walk(mute, ['recording', 'transcribing'], audio({ muteDuringRecording: false }));
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(helper.calls).toEqual([]);
    mute.sync('recording', audio());
    await vi.waitFor(() => expect(helper.calls).toEqual(['mute']));
    mute.sync('recording', audio({ muteDuringRecording: false }));
    await vi.waitFor(() => expect(helper.calls).toEqual(['mute', 'restore']));
  });
  it('sends the restore only after a slow mute has answered', async () => {
    const helper = control(); const answer = deferred<{ muted: boolean }>();
    helper.muteOutput = vi.fn(async () => { helper.calls.push('mute'); return answer.promise; });
    const mute = new OutputMute(helper);
    walk(mute, ['recording']);
    await vi.waitFor(() => expect(helper.calls).toEqual(['mute']));
    walk(mute, ['transcribing']);
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(helper.calls).toEqual(['mute']);
    answer.resolve({ muted: true });
    await vi.waitFor(() => expect(helper.calls).toEqual(['mute', 'restore']));
  });
  it('pairs every mute request with a restore, whatever the helper answered', async () => {
    const helper = control();
    helper.muteOutput = vi.fn(async () => { helper.calls.push('mute'); throw new Error('Native helper is unavailable.'); });
    helper.restoreOutput = vi.fn(async () => { helper.calls.push('restore'); return { restored: false }; });
    const mute = new OutputMute(helper);
    walk(mute, ['recording']);
    await vi.waitFor(() => expect(mute.held).toBe(true));
    walk(mute, ['ready']);
    await vi.waitFor(() => expect(helper.calls).toEqual(['mute', 'restore']));
    expect(mute.last).toEqual({ mute: 'unavailable', restore: 'unchanged' });
    helper.muteOutput = vi.fn(async () => ({ muted: false, reason: 'already_muted' as const }));
    walk(mute, ['recording']);
    await vi.waitFor(() => expect(mute.last.mute).toBe('already_muted'));
    walk(mute, ['ready']);
    await vi.waitFor(() => expect(helper.restoreOutput).toHaveBeenCalledTimes(2));
  });
  it('cancels a mute still waiting for the start cue when released', async () => {
    vi.useFakeTimers();
    const helper = control(); const mute = new OutputMute(helper, 300);
    mute.sync('recording', audio({ interactionSounds: true }));
    await vi.advanceTimersByTimeAsync(100);
    const released = mute.release();
    expect(mute.held).toBe(false);
    await vi.advanceTimersByTimeAsync(1000); await released;
    expect(helper.calls).toEqual([]);
  });
  it('releases a held mute on quit and settles even when the helper never answers', async () => {
    const helper = control(); const mute = new OutputMute(helper);
    walk(mute, ['recording']);
    await vi.waitFor(() => expect(mute.held).toBe(true));
    await mute.release();
    expect(helper.calls).toEqual(['mute', 'restore']); expect(mute.held).toBe(false);
    helper.restoreOutput = vi.fn(() => new Promise<{ restored: boolean }>(() => {}));
    walk(mute, ['recording']);
    await vi.waitFor(() => expect(mute.held).toBe(true));
    const started = Date.now();
    await mute.release(50);
    expect(Date.now() - started).toBeLessThan(1000);
    await expect(new OutputMute(control()).release(50)).resolves.toBeUndefined();
  });
});
