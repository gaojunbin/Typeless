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
  requests: { method: string; params: { binding?: string } }[] = [];
  stdin = new Writable({ write: (chunk, _encoding, done) => {
    const request = JSON.parse(chunk.toString());
    this.requests.push(request);
    if (!this.respond) { done(); return; }
    if (request.method === 'configureShortcut') this.binding = request.params.binding;
    queueMicrotask(() => this.stdout.write(JSON.stringify({ id: request.id, result: {
      platform: 'darwin', accessibility: true, inputMonitoring: true, binding: this.binding,
      shortcutAvailable: this.binding === 'fn', tapEnabled: this.binding === 'fn',
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
