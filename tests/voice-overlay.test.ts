import { afterEach, describe, expect, it, vi } from 'vitest';
import { VoiceOverlay, overlayBounds } from '../electron/voice-overlay';
import { idleSession } from '../src/core/session';

function fixture() {
  const window = { setBounds: vi.fn(), showInactive: vi.fn(), hide: vi.fn(), isDestroyed: () => false };
  const workArea = vi.fn(() => ({ x: 0, y: 0, width: 1440, height: 900 }));
  return { window, workArea, overlay: new VoiceOverlay(window, workArea) };
}
afterEach(() => vi.useRealTimers());

describe('floating dictation feedback', () => {
  it('waits for microphone readiness before showing recording feedback', () => {
    const { window, overlay } = fixture();
    overlay.publish({ ...idleSession(), id: 'speech', status: 'arming' });
    expect(window.showInactive).not.toHaveBeenCalled();
  });

  it('keeps the original display anchor through processing and hides after dispatch', () => {
    const { window, overlay, workArea } = fixture();
    const session = { ...idleSession(), id: 'speech' };
    workArea.mockReturnValue({ x: -1920, y: 0, width: 1920, height: 1080 });
    overlay.publish({ ...session, status: 'arming' });
    overlay.publish({ ...session, status: 'recording' });
    workArea.mockReturnValue({ x: 0, y: 0, width: 1440, height: 900 });
    overlay.publish({ ...session, status: 'inserting', delivery: 'pending' });
    expect(window.setBounds.mock.calls.map(call => call[0])).toEqual([
      { x: -1080, y: 988, width: 240, height: 76 },
      { x: -1080, y: 988, width: 240, height: 76 },
    ]);
    overlay.publish({ ...session, status: 'ready', delivery: 'dispatched', inserted: true });
    expect(window.hide).toHaveBeenCalledTimes(2);
  });

  it('moves to the display of the foreground window once it is located', async () => {
    const window = { setBounds: vi.fn(), showInactive: vi.fn(), hide: vi.fn(), isDestroyed: () => false };
    let resolve!: (area: { x: number; y: number; width: number; height: number }) => void;
    const overlay = new VoiceOverlay(window, () => ({ x: 0, y: 0, width: 1440, height: 900 }), () => new Promise(done => { resolve = done; }));
    const session = { ...idleSession(), id: 'speech' };
    overlay.publish({ ...session, status: 'arming' });
    overlay.publish({ ...session, status: 'recording' });
    resolve({ x: -1920, y: 0, width: 1920, height: 1080 });
    await Promise.resolve();
    overlay.publish({ ...session, status: 'transcribing' });
    expect(window.setBounds.mock.calls.map(call => call[0])).toEqual([
      { x: 600, y: 808, width: 240, height: 76 },
      { x: -1080, y: 988, width: 240, height: 76 },
      { x: -1080, y: 988, width: 240, height: 76 },
    ]);
  });

  it('ignores a located display that arrives after its session was replaced', async () => {
    const window = { setBounds: vi.fn(), showInactive: vi.fn(), hide: vi.fn(), isDestroyed: () => false };
    const pending: Array<(area: { x: number; y: number; width: number; height: number }) => void> = [];
    const overlay = new VoiceOverlay(window, () => ({ x: 0, y: 0, width: 1440, height: 900 }), () => new Promise(done => { pending.push(done); }));
    overlay.publish({ ...idleSession(), id: 'first', status: 'recording' });
    overlay.publish({ ...idleSession(), id: 'second', status: 'recording' });
    pending[0]({ x: -1920, y: 0, width: 1920, height: 1080 });
    await Promise.resolve();
    expect(window.setBounds).toHaveBeenCalledTimes(2);
    expect(window.setBounds).toHaveBeenLastCalledWith({ x: 600, y: 808, width: 240, height: 76 }, false);
  });

  it('expires recovery feedback without resurrecting it on later snapshots', () => {
    vi.useFakeTimers();
    const { window, overlay } = fixture();
    const failure = { ...idleSession(), id: 'speech', status: 'error' as const, errorCode: 'permission_required' };
    overlay.publish(failure);
    expect(window.setBounds).toHaveBeenLastCalledWith({ x: 520, y: 808, width: 400, height: 76 }, false);
    vi.advanceTimersByTime(4001);
    overlay.publish(failure);
    expect(window.showInactive).toHaveBeenCalledTimes(1);
    expect(window.hide).toHaveBeenCalledTimes(1);
  });

  it('centers compact feedback within display work area coordinates', () => {
    expect(overlayBounds({ x: 100, y: 24, width: 1280, height: 696 }, false))
      .toEqual({ x: 620, y: 628, width: 240, height: 76 });
  });

  it('hides after copying even when no editor accepts paste', () => {
    const { window, overlay } = fixture();
    overlay.publish({ ...idleSession(), id: 'speech', status: 'ready', text: 'Copied result', copied: true, delivery: 'copied' });
    expect(window.showInactive).not.toHaveBeenCalled();
    expect(window.hide).toHaveBeenCalledTimes(1);
  });
});
