import { afterEach, describe, expect, it, vi } from 'vitest';

const { write } = vi.hoisted(() => ({ write: vi.fn() }));
vi.mock('electron', () => ({ clipboard: { write }, ClipboardItem: class { constructor(readonly data: Record<string, unknown>) {} } }));
import { ClipboardDelivery } from '../electron/clipboard-delivery';

afterEach(() => { vi.clearAllMocks(); vi.useRealTimers(); });
describe('clipboard-first delivery', () => {
  it('retains the new text without any delayed clipboard restoration', async () => {
    vi.useFakeTimers(); write.mockResolvedValue(undefined);
    const paste = vi.fn().mockResolvedValue({ ok: true, status: 'dispatched' });
    const delivery = new ClipboardDelivery(paste);
    await delivery.copy('Dictated result');
    await delivery.paste('Dictated result');
    await vi.advanceTimersByTimeAsync(10000);
    expect(write).toHaveBeenCalledTimes(1);
    expect(write.mock.calls[0][0][0].data['text/plain']).toBe('Dictated result');
    expect(paste).toHaveBeenCalledWith('Dictated result', expect.objectContaining({ clipboardOwner: expect.any(String) }));
  });

  it('serializes pending copies so an older write cannot replace a newer result', async () => {
    let finish!: () => void;
    write.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; })).mockResolvedValue(undefined);
    const delivery = new ClipboardDelivery(vi.fn());
    const first = delivery.copy('First');
    const second = delivery.copy('Second');
    await Promise.resolve();
    expect(write).toHaveBeenCalledTimes(1);
    finish(); await Promise.all([first, second]);
    expect(write.mock.calls.map(call => call[0][0].data['text/plain'])).toEqual(['First', 'Second']);
  });

  it('skips a cancelled queued copy and leaves later copies available', async () => {
    write.mockResolvedValue(undefined);
    const delivery = new ClipboardDelivery(vi.fn());
    const abort = new AbortController(); abort.abort();
    await expect(delivery.copy('Cancelled', abort.signal)).rejects.toBeDefined();
    await delivery.copy('Current');
    expect(write).toHaveBeenCalledTimes(1);
    expect(write.mock.calls[0][0][0].data['text/plain']).toBe('Current');
  });

  it('does not paste an old result after another copy or cancellation', async () => {
    write.mockResolvedValue(undefined);
    const paste = vi.fn(); const delivery = new ClipboardDelivery(paste);
    await delivery.copy('Current');
    expect(await delivery.paste('Old')).toMatchObject({ ok: false, code: 'clipboard_changed' });
    const abort = new AbortController(); abort.abort();
    expect(await delivery.paste('Current', abort.signal)).toMatchObject({ ok: false, code: 'cancelled' });
    expect(paste).not.toHaveBeenCalled();
  });
});
