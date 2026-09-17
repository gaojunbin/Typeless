import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { Store } from '../src/core/store';
import { Providers } from '../src/core/providers';
import { Sessions, type SessionHost } from '../src/core/session';

const dirs: string[] = [];
function providers() {
  const value = new Providers();
  value.transcribe = vi.fn(async () => 'raw');
  value.cleanup = vi.fn(async () => ({ text: 'clean', warning: undefined }));
  return value;
}
function setup(provider = providers()) {
  mkdirSync('.local/tests', { recursive: true });
  const dir = mkdtempSync('.local/tests/session-'); dirs.push(dir);
  const store = new Store(join(dir, 'state.json'), { available: () => true, encrypt: x => x, decrypt: x => x });
  store.saveSettings({ cleanup: { enabled: true, model: 'text' } }, { asr: 'key', cleanup: 'text-key' });
  let clipboard = '';
  const host = {
    capture: vi.fn(), context: vi.fn(async () => ({ appName: 'Editor' })),
    copy: vi.fn(async (text: string, signal?: AbortSignal) => { if (!signal?.aborted) clipboard = text; }),
    paste: vi.fn(async (_text: string, _signal?: AbortSignal): ReturnType<SessionHost['paste']> => ({ ok: true, status: 'dispatched' })),
    changed: vi.fn(),
  };
  return { sessions: new Sessions(store, provider, host), store, host, provider, clipboard: () => clipboard };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
async function finishRecording(sessions: Sessions) {
  await sessions.capture({ type: 'started', sessionId: sessions.session.id });
  const bytes = Buffer.alloc(100); bytes.write('RIFF'); bytes.write('WAVE', 8);
  return sessions.capture({ type: 'audio', sessionId: sessions.session.id, audio: new Uint8Array(bytes), durationMs: 1000, sampleRate: 16000 });
}
afterEach(() => dirs.splice(0).forEach(path => rmSync(path, { recursive: true, force: true })));

describe('record anywhere and copy before paste', () => {
  it('starts the microphone even when native context is unavailable', async () => {
    const { sessions, host, clipboard } = setup(); host.context.mockRejectedValueOnce(new Error('Native helper unavailable.'));
    await sessions.toggle();
    expect(host.capture).toHaveBeenCalledWith(expect.objectContaining({ type: 'start' }));
    await finishRecording(sessions);
    expect(clipboard()).toBe('clean'); expect(host.paste).toHaveBeenCalledTimes(1);
    expect(sessions.session.targetApp).toBe('');
  });
  it('does not wait for a hanging context request before recording or indefinitely delay cleanup', async () => {
    const { sessions, host, clipboard } = setup(); host.context.mockImplementationOnce(() => new Promise(() => {}));
    await sessions.toggle(); expect(host.capture).toHaveBeenCalledWith(expect.objectContaining({ type: 'start' }));
    await finishRecording(sessions); expect(clipboard()).toBe('clean'); expect(sessions.session.status).toBe('ready');
  });
  it.each(['', 'Terminal'])('records without an editable-field eligibility check for context %s', async appName => {
    const { sessions, host, provider } = setup(); host.context.mockResolvedValueOnce({ appName });
    await sessions.toggle(); await finishRecording(sessions);
    expect(host.copy).toHaveBeenCalledWith('clean', expect.any(AbortSignal));
    expect(vi.mocked(provider.cleanup).mock.calls[0][4].targetApp).toBe(appName);
    expect(host.copy.mock.invocationCallOrder[0]).toBeLessThan(host.paste.mock.invocationCallOrder[0]);
  });
  it.each(['confirmed', 'dispatched'])('distinguishes %s delivery while retaining the copied text', async status => {
    const { sessions, host, clipboard } = setup(); host.paste.mockResolvedValueOnce({ ok: true, status });
    await sessions.toggle(); await finishRecording(sessions);
    expect(sessions.session).toMatchObject({ status: 'ready', copied: true, delivery: status, inserted: true });
    expect(clipboard()).toBe('clean');
    await expect(sessions.retry()).rejects.toThrow(); await expect(sessions.useRaw()).rejects.toThrow();
    expect(host.paste).toHaveBeenCalledTimes(1);
  });
  it.each(['practice', 'automatic-paste-off', 'text-only'])('automatically copies %s output without pasting', async mode => {
    const { sessions, host, store, clipboard } = setup();
    if (mode === 'automatic-paste-off') store.saveSettings({ general: { autoInsert: false } });
    if (mode === 'text-only') await sessions.processText('typed source');
    else { await sessions.toggle('dictate', mode === 'practice'); await finishRecording(sessions); }
    expect(sessions.session).toMatchObject({ status: 'ready', delivery: 'copied', copied: true, inserted: false });
    expect(clipboard()).toBe('clean'); expect(host.paste).not.toHaveBeenCalled();
    await sessions.useRaw(); expect(clipboard()).toBe(mode === 'text-only' ? 'typed source' : 'raw');
    expect(host.paste).not.toHaveBeenCalled();
  });
  it('can retry copy-only processing without ever dispatching paste', async () => {
    const { sessions, host, store, clipboard } = setup(); store.saveSettings({ general: { autoInsert: false } });
    await sessions.toggle(); await finishRecording(sessions); await sessions.retry();
    expect(host.copy).toHaveBeenCalledTimes(2); expect(host.paste).not.toHaveBeenCalled(); expect(clipboard()).toBe('clean');
  });
  it('copies and pastes the original transcript when cleanup fails, retaining its warning', async () => {
    const { sessions, host, provider, clipboard } = setup();
    provider.cleanup = vi.fn(async () => { throw new Error('Cleanup unavailable.'); });
    await sessions.toggle(); await finishRecording(sessions);
    expect(clipboard()).toBe('raw'); expect(host.paste).toHaveBeenCalledWith('raw', expect.any(AbortSignal));
    expect(sessions.session.warning).toContain('Text processing failed'); expect(sessions.session.copied).toBe(true);
  });
  it('does not suppress clipboard or paste because cleanup returned a review warning', async () => {
    const { sessions, host, provider, clipboard } = setup();
    provider.cleanup = vi.fn(async () => ({ text: 'review text', warning: 'Review wording.' }));
    await sessions.toggle(); await finishRecording(sessions);
    expect(clipboard()).toBe('review text'); expect(host.paste).toHaveBeenCalledTimes(1); expect(sessions.session.warning).toContain('Review wording.');
  });
  it('copies raw recognition when cleanup is deliberately disabled', async () => {
    const provider = new Providers(); provider.transcribe = vi.fn(async () => 'raw');
    const { sessions, store, clipboard, host } = setup(provider); store.saveSettings({ cleanup: { enabled: false } });
    await sessions.toggle(); await finishRecording(sessions);
    expect(clipboard()).toBe('raw'); expect(host.paste.mock.calls[0][0]).toBe('raw');
  });
  it('keeps clipboard failure distinct and permits explicit copy recovery', async () => {
    const { sessions, host, clipboard } = setup(); host.copy.mockRejectedValueOnce(new Error('Clipboard busy.'));
    await sessions.toggle(); await finishRecording(sessions);
    expect(sessions.session).toMatchObject({ status: 'error', errorCode: 'clipboard_copy_failed', copied: false, delivery: 'failed', text: 'clean' });
    expect(host.paste).not.toHaveBeenCalled(); expect(clipboard()).toBe('');
    await sessions.copy();
    expect(sessions.session).toMatchObject({ status: 'ready', copied: true, delivery: 'copied' }); expect(sessions.session.error).toBeUndefined();
    expect(clipboard()).toBe('clean'); expect(host.paste).not.toHaveBeenCalled();
  });
  it('retains copied output after paste failure and rejects ambiguous repetition', async () => {
    const { sessions, host, clipboard } = setup(); host.paste.mockResolvedValueOnce({ ok: false, code: 'helper_unavailable', message: 'Paste unavailable.' });
    await sessions.toggle(); await finishRecording(sessions);
    expect(sessions.session).toMatchObject({ status: 'ready', copied: true, delivery: 'copied', errorCode: 'helper_unavailable', inserted: false });
    expect(clipboard()).toBe('clean'); await expect(sessions.retry()).rejects.toThrow();
  });
  it('retains copied output when paste throws with unknown delivery outcome', async () => {
    const { sessions, host, clipboard } = setup(); host.paste.mockRejectedValueOnce(new Error('Response lost.'));
    await sessions.toggle(); await finishRecording(sessions);
    expect(sessions.session).toMatchObject({ delivery: 'copied', copied: true, errorCode: 'paste_uncertain' });
    expect(clipboard()).toBe('clean'); await expect(sessions.retry()).rejects.toThrow();
  });
  it('keeps missing provider configuration separate from native availability', async () => {
    const { sessions, store, host } = setup(); store.saveSettings({}, { asr: '' });
    await expect(sessions.toggle()).rejects.toThrow('Configure');
    expect(sessions.session.errorCode).toBe('provider_not_configured'); expect(host.capture).not.toHaveBeenCalled();
  });
});

describe('cancellation and asynchronous clipboard fencing', () => {
  it('ignores an old context result after starting a new recording', async () => {
    const { sessions, host } = setup(); const old = deferred<{ appName: string }>();
    host.context.mockReturnValueOnce(old.promise); await sessions.toggle(); sessions.cancel();
    host.context.mockResolvedValueOnce({ appName: 'New app' }); await sessions.toggle(); await finishRecording(sessions);
    old.resolve({ appName: 'Old app' }); await old.promise;
    expect(sessions.session.targetApp).toBe('New app');
  });
  it('never copies or pastes a recognition response that arrives after cancellation', async () => {
    const { sessions, provider, host } = setup(); const response = deferred<string>(); provider.transcribe = vi.fn(() => response.promise);
    await sessions.toggle(); const pending = finishRecording(sessions);
    await vi.waitFor(() => expect(provider.transcribe).toHaveBeenCalled()); sessions.cancel(); response.resolve('late'); await pending;
    expect(host.copy).not.toHaveBeenCalled(); expect(host.paste).not.toHaveBeenCalled(); expect(sessions.session.status).toBe('cancelled');
  });
  it('passes cancellation to queued clipboard work so an old result cannot overwrite the new one', async () => {
    const { sessions, provider, host, clipboard } = setup(); const copying = deferred<void>();
    provider.cleanup = vi.fn(async (_settings, _key, raw) => ({ text: raw, warning: undefined }));
    const actualCopy = host.copy.getMockImplementation()!;
    host.copy.mockImplementationOnce(async (text, signal) => { await copying.promise; await actualCopy(text, signal); });
    const old = sessions.processText('old'); await vi.waitFor(() => expect(host.copy).toHaveBeenCalledTimes(1));
    const signal = host.copy.mock.calls[0][1]; sessions.cancel(); expect(signal?.aborted).toBe(true);
    await sessions.processText('new'); copying.resolve(); await old;
    expect(clipboard()).toBe('new'); expect(sessions.session).toMatchObject({ text: 'new', copied: true, delivery: 'copied' }); expect(host.paste).not.toHaveBeenCalled();
  });
  it('does not publish ready while paste is pending and does not retract the clipboard on cancellation', async () => {
    const { sessions, host, clipboard } = setup(); const paste = deferred<Awaited<ReturnType<SessionHost['paste']>>>(); host.paste.mockReturnValueOnce(paste.promise);
    await sessions.toggle(); const pending = finishRecording(sessions);
    await vi.waitFor(() => expect(host.paste).toHaveBeenCalled());
    expect(sessions.session).toMatchObject({ status: 'inserting', delivery: 'pending', copied: true });
    expect(host.changed.mock.calls.some(([state]) => state.status === 'ready')).toBe(false);
    await expect(sessions.toggle()).rejects.toThrow(); await expect(sessions.processText('competing')).rejects.toThrow();
    sessions.cancel(); expect(clipboard()).toBe('clean'); expect(sessions.session).toMatchObject({ status: 'cancelled', copied: true, delivery: 'copied' });
    paste.resolve({ ok: true, status: 'confirmed' }); await pending;
    expect(sessions.session).toMatchObject({ status: 'cancelled', inserted: false, delivery: 'copied' });
  });
  it('honors changed privacy and deleted memory before delayed cleanup', async () => {
    const { sessions, provider, store } = setup(); const response = deferred<string>(); provider.transcribe = vi.fn(() => response.promise);
    store.saveSettings({ privacy: { memoryEnabled: true, shareAppContext: true } });
    store.saveMemory({ id: 'removed', content: 'private preference', enabled: true, scope: '*', source: 'manual', createdAt: '' });
    await sessions.toggle(); const pending = finishRecording(sessions); await vi.waitFor(() => expect(provider.transcribe).toHaveBeenCalled());
    store.delete('memories', 'removed'); store.saveSettings({ privacy: { memoryEnabled: false, shareAppContext: false }, cleanup: { enabled: false } });
    response.resolve('raw'); await pending;
    const call = vi.mocked(provider.cleanup).mock.calls[0]; expect(call[0].privacy.memoryEnabled).toBe(false); expect(call[0].privacy.shareAppContext).toBe(false); expect(call[0].cleanup.enabled).toBe(false); expect(call[4].memories).toEqual([]);
  });
  it('keeps credentials bound to the provider selected before asynchronous recognition', async () => {
    const { sessions, provider, store } = setup(); const response = deferred<string>(); provider.transcribe = vi.fn(() => response.promise);
    await sessions.toggle(); const pending = finishRecording(sessions); await vi.waitFor(() => expect(provider.transcribe).toHaveBeenCalled());
    store.saveSettings({ cleanup: { baseUrl: 'https://changed.example/v1' } }, { cleanup: 'new-key' }); response.resolve('raw'); await pending;
    const call = vi.mocked(provider.cleanup).mock.calls[0]; expect(call[0].cleanup.baseUrl).toBe('https://api.openai.com/v1'); expect(call[1]).toBe('text-key');
  });
});

describe('editing request and clipboard integration', () => {
  it.each([
    { enabled: false, strength: 'balanced' as const, expected: '嗯，我我明天再确认，不是今天。', requests: 0 },
    { enabled: true, strength: 'light' as const, expected: 'Synthetic model response.', requests: 1 },
    { enabled: true, strength: 'balanced' as const, expected: 'Synthetic model response.', requests: 1 },
  ])('routes enabled=$enabled strength=$strength through copy and paste without losing raw text', async ({ enabled, strength, expected, requests }) => {
    const raw = '嗯，我我明天再确认，不是今天。';
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: 'Synthetic model response.' } }] })));
    const provider = new Providers(fetcher as typeof fetch); provider.transcribe = vi.fn(async () => raw);
    const { sessions, store, clipboard, host } = setup(provider); store.saveSettings({ cleanup: { enabled }, writing: { strength } });
    await sessions.toggle(); await finishRecording(sessions);
    expect(fetcher).toHaveBeenCalledTimes(requests); expect(sessions.session.rawText).toBe(raw); expect(clipboard()).toBe(expected);
    expect(host.paste).toHaveBeenCalledWith(expected, expect.any(AbortSignal));
  });
  it('still translates in no-edit mode and automatically copies the translated response', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: 'Synthetic translated response.' } }] })));
    const provider = new Providers(fetcher as typeof fetch); provider.transcribe = vi.fn(async () => '原始转录');
    const { sessions, store, clipboard } = setup(provider); store.saveSettings({ cleanup: { enabled: false } });
    await sessions.toggle('translate'); await finishRecording(sessions);
    expect(fetcher).toHaveBeenCalledTimes(1); expect(sessions.session.rawText).toBe('原始转录'); expect(clipboard()).toBe('Synthetic translated response.');
  });
});
