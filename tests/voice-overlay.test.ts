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
      { x: -1032, y: 1012, width: 144, height: 60 },
      { x: -1032, y: 1012, width: 144, height: 60 },
    ]);
    overlay.publish({ ...session, status: 'ready', delivery: 'dispatched', inserted: true });
    expect(window.hide).toHaveBeenCalledTimes(2);
  });

  it('expires recovery feedback without resurrecting it on later snapshots', () => {
    vi.useFakeTimers();
    const { window, overlay } = fixture();
    const failure = { ...idleSession(), id: 'speech', status: 'error' as const, errorCode: 'permission_required' };
    overlay.publish(failure);
    expect(window.setBounds).toHaveBeenLastCalledWith({ x: 560, y: 828, width: 320, height: 64 }, false);
    vi.advanceTimersByTime(4001);
    overlay.publish(failure);
    expect(window.showInactive).toHaveBeenCalledTimes(1);
    expect(window.hide).toHaveBeenCalledTimes(1);
  });

  it('centers compact feedback within display work area coordinates', () => {
    expect(overlayBounds({ x: 100, y: 24, width: 1280, height: 696 }, false))
      .toEqual({ x: 668, y: 652, width: 144, height: 60 });
  });

  it('hides after copying even when no editor accepts paste', () => {
    const { window, overlay } = fixture();
    overlay.publish({ ...idleSession(), id: 'speech', status: 'ready', text: 'Copied result', copied: true, delivery: 'copied' });
    expect(window.showInactive).not.toHaveBeenCalled();
    expect(window.hide).toHaveBeenCalledTimes(1);
  });
});
