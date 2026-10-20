import { afterEach, describe, expect, it, vi } from 'vitest';
import { VoiceOverlay, overlayBounds } from '../electron/voice-overlay';
import { idleSession } from '../src/core/session';

function fakeWindow() {
  return { setBounds: vi.fn(), showInactive: vi.fn(), hide: vi.fn(), isDestroyed: () => false, destroy: vi.fn() };
}
function fixture() {
  const window = fakeWindow();
  const workArea = vi.fn(() => ({ x: 0, y: 0, width: 1440, height: 900 }));
  return { window, workArea, overlay: new VoiceOverlay(window, workArea) };
}
const area = () => ({ x: 0, y: 0, width: 1440, height: 900 });
const recording = (id = 'speech') => ({ ...idleSession(), id, status: 'recording' as const });
const copied = (id = 'speech') => ({ ...idleSession(), id, status: 'ready' as const, text: 'Copied result', copied: true, delivery: 'copied' as const });
const flush = () => new Promise(resolve => setTimeout(resolve, 0));
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
    const window = fakeWindow();
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
    const window = fakeWindow();
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

describe('capsule window renewal after Space or display changes', () => {
  function renewing() {
    const first = fakeWindow();
    const fresh = [fakeWindow(), fakeWindow()];
    const create = vi.fn(async () => fresh[create.mock.calls.length - 1]);
    return { first, fresh, create, overlay: new VoiceOverlay(first, area, undefined, create) };
  }

  it('keeps a window that has never been shown', async () => {
    const { first, create, overlay } = renewing();
    overlay.invalidate();
    await flush();
    expect(create).not.toHaveBeenCalled();
    expect(overlay.window).toBe(first);
  });

  it('replaces a shown window while it is hidden and shows the fresh one next time', async () => {
    const { first, fresh, create, overlay } = renewing();
    overlay.publish(recording()); overlay.publish(copied());
    overlay.invalidate();
    await flush();
    expect(create).toHaveBeenCalledTimes(1);
    expect(overlay.window).toBe(fresh[0]);
    expect(first.destroy).toHaveBeenCalledTimes(1);
    overlay.publish(recording('next'));
    expect(fresh[0].showInactive).toHaveBeenCalledTimes(1);
    expect(first.showInactive).toHaveBeenCalledTimes(1);
    overlay.invalidate();
    await flush();
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('waits for a visible session to end before replacing its window', async () => {
    const { first, fresh, create, overlay } = renewing();
    overlay.publish(recording());
    overlay.invalidate();
    await flush();
    expect(create).not.toHaveBeenCalled();
    overlay.publish(copied());
    await flush();
    expect(overlay.window).toBe(fresh[0]);
    expect(first.destroy).toHaveBeenCalledTimes(1);
  });

  it('discards a replacement that finishes after a session took the current window', async () => {
    const first = fakeWindow(); const late = fakeWindow(); const later = fakeWindow();
    let finish!: (window: typeof late) => void;
    const create = vi.fn()
      .mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
      .mockImplementationOnce(async () => later);
    const overlay = new VoiceOverlay(first, area, undefined, create);
    overlay.publish(recording()); overlay.publish(copied());
    overlay.invalidate();
    overlay.publish(recording('next'));
    finish(late);
    await flush();
    expect(late.destroy).toHaveBeenCalledTimes(1);
    expect(overlay.window).toBe(first);
    overlay.publish(copied('next'));
    await flush();
    expect(overlay.window).toBe(later);
    expect(first.destroy).toHaveBeenCalledTimes(1);
  });

  it('keeps the shown window when a replacement cannot be created', async () => {
    const first = fakeWindow();
    const create = vi.fn(async () => { throw new Error('load failed'); });
    const overlay = new VoiceOverlay(first, area, undefined, create);
    overlay.publish(recording()); overlay.publish(copied());
    overlay.invalidate();
    await flush();
    overlay.publish(copied());
    await flush();
    expect(create).toHaveBeenCalledTimes(1);
    expect(overlay.window).toBe(first);
    expect(first.destroy).not.toHaveBeenCalled();
  });
});
