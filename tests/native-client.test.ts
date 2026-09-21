import { EventEmitter } from 'node:events';
import { PassThrough, Writable } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NativeClient } from '../electron/native-client';

const mocks = vi.hoisted(() => ({ spawn: vi.fn() }));
vi.mock('node:child_process', () => ({ spawn: mocks.spawn }));
vi.mock('node:fs', () => ({ existsSync: () => true }));
vi.mock('electron', () => ({ app: { isPackaged: false, getAppPath: () => '/synthetic-project' } }));

class Helper extends EventEmitter {
  stdout = new PassThrough();
  stderr = new PassThrough();
  binding = 'fn';
  respond = true;
  reason: string | undefined;
  requests: { method: string; params: { binding?: string } }[] = [];
  stdin = new Writable({ write: (chunk, _encoding, done) => {
    const request = JSON.parse(chunk.toString());
    this.requests.push(request);
    if (!this.respond) { done(); return; }
    if (request.method === 'configureShortcut') this.binding = request.params.binding;
    queueMicrotask(() => this.stdout.write(JSON.stringify({ id: request.id, result: {
      platform: 'darwin', accessibility: true, inputMonitoring: true, binding: this.binding,
      shortcutAvailable: this.binding === 'fn', tapEnabled: this.binding === 'fn', shortcutReason: this.reason,
    } }) + '\n'));
    done();
  } });
  kill() { this.emit('exit', 0); return true; }
}
const clients: NativeClient[] = [];
afterEach(() => { clients.splice(0).forEach(client => client.stop()); vi.useRealTimers(); vi.restoreAllMocks(); mocks.spawn.mockReset(); });

describe('native helper recovery', () => {
  it('restarts a failed helper on a later health poll and restores the last binding', async () => {
    let now = 10000; vi.spyOn(Date, 'now').mockImplementation(() => now);
    const helpers: Helper[] = [];
    mocks.spawn.mockImplementation(() => { const child = new Helper(); helpers.push(child); return child; });
    const shortcut = vi.fn();
    const client = new NativeClient({ onShortcut: shortcut }); clients.push(client);
    await client.start(); await client.configureShortcut('disabled');
    helpers[0].emit('exit', 1);
    expect((await client.status()).shortcutAvailable).toBe(false);
    expect(mocks.spawn).toHaveBeenCalledTimes(1);
    now += 2100;
    const status = await client.status();
    expect(mocks.spawn).toHaveBeenCalledTimes(2);
    expect(status.binding).toBe('disabled');
    expect(helpers[1].requests).toContainEqual(expect.objectContaining({ method: 'configureShortcut', params: { binding: 'disabled' } }));
    helpers[0].emit('exit', 1);
    helpers[0].stdout.write('{"event":"shortcut"}\n');
    expect(shortcut).not.toHaveBeenCalled();
    expect((await client.status()).binding).toBe('disabled');
  });
  it('restarts a helper that exited on a stale tap, then stops arming the restart once the budget is spent', async () => {
    let now = 10000; vi.spyOn(Date, 'now').mockImplementation(() => now);
    const helpers: Helper[] = [];
    mocks.spawn.mockImplementation(() => { const child = new Helper(); helpers.push(child); return child; });
    const client = new NativeClient({ onShortcut: vi.fn() }); clients.push(client);
    await client.start();
    const armed = (call: number) => (mocks.spawn.mock.calls[call][2] as { env: NodeJS.ProcessEnv }).env.TYPELESS_HELPER_RESTART_ON_STALE;
    expect(armed(0)).toBe('1');
    for (let attempt = 0; attempt < 3; attempt += 1) {
      helpers[attempt].emit('exit', 3);
      now += 600; // A stale exit shortens recovery from two seconds to 500 ms.
      const status = await client.status();
      expect(mocks.spawn).toHaveBeenCalledTimes(attempt + 2);
      expect(status.restartsExhausted).toBe(attempt === 2 ? true : undefined);
    }
    expect(armed(1)).toBe('1'); expect(armed(2)).toBe('1'); expect(armed(3)).toBeUndefined();
    helpers[3].reason = 'ready';
    expect((await client.status()).restartsExhausted).toBeUndefined();
    helpers[3].emit('exit', 3);
    now += 600; await client.status();
    expect(armed(4)).toBe('1');
  });
  it('re-arms the helper restart once the recorded stale exits leave the 120 second window', async () => {
    let now = 10000; vi.spyOn(Date, 'now').mockImplementation(() => now);
    const helpers: Helper[] = [];
    mocks.spawn.mockImplementation(() => { const child = new Helper(); helpers.push(child); return child; });
    const client = new NativeClient({ onShortcut: vi.fn() }); clients.push(client);
    await client.start();
    for (let attempt = 0; attempt < 3; attempt += 1) { helpers[attempt].emit('exit', 3); now += 600; await client.status(); }
    expect((await client.status()).restartsExhausted).toBe(true);
    now += 120_001;
    expect((await client.status()).restartsExhausted).toBeUndefined();
    helpers[3].emit('exit', 3);
    now += 600; await client.status();
    expect((mocks.spawn.mock.calls[4][2] as { env: NodeJS.ProcessEnv }).env.TYPELESS_HELPER_RESTART_ON_STALE).toBe('1');
  });
  it('does not resurrect the helper after an explicit stop', async () => {
    mocks.spawn.mockImplementation(() => new Helper());
    const client = new NativeClient({ onShortcut: vi.fn() }); clients.push(client);
    await client.start(); client.stop();
    expect((await client.status()).shortcutAvailable).toBe(false);
    expect(mocks.spawn).toHaveBeenCalledTimes(1);
  });
  it('clears the cached startup promise after failure so explicit start can retry', async () => {
    mocks.spawn.mockImplementationOnce(() => {
      const child = new Helper(); queueMicrotask(() => child.emit('error', new Error('synthetic launch failure'))); return child;
    }).mockImplementation(() => new Helper());
    const client = new NativeClient({ onShortcut: vi.fn() }); clients.push(client);
    await expect(client.start()).rejects.toMatchObject({ code: 'helper_unavailable' });
    await expect(client.start()).resolves.toBeUndefined();
    expect(mocks.spawn).toHaveBeenCalledTimes(2);
  });
  it('retires a live but unresponsive helper after a health timeout without replaying requests', async () => {
    const helpers: Helper[] = [];
    mocks.spawn.mockImplementation(() => { const child = new Helper(); helpers.push(child); return child; });
    const client = new NativeClient({ onShortcut: vi.fn() }); clients.push(client);
    await client.start();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    helpers[0].respond = false;
    const health = client.status();
    await vi.advanceTimersByTimeAsync(5100);
    expect((await health).shortcutAvailable).toBe(false);
    await vi.advanceTimersByTimeAsync(2100);
    await client.status();
    expect(mocks.spawn).toHaveBeenCalledTimes(2);
    expect(helpers[1].requests.some(request => request.method === 'pasteText')).toBe(false);
  });

});
