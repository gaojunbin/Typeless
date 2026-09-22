import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { Store } from '../src/core/store';
import { ProviderError, Providers } from '../src/core/providers';
import { Controller } from '../electron/controller';
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
    capture: vi.fn(),
    copy: vi.fn(async (text: string, signal?: AbortSignal) => { if (!signal?.aborted) clipboard = text; }),
    paste: vi.fn(async (_text: string, _signal?: AbortSignal): ReturnType<SessionHost['paste']> => ({ ok: true, status: 'dispatched' })),
    changed: vi.fn(),
  };
  return { file: join(dir, 'state.json'), sessions: new Sessions(store, provider, host), store, host, provider, clipboard: () => clipboard };
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
  it('records without native context and copies before paste without persisting transcripts', async () => {
    const { sessions, host, clipboard, file, store } = setup(); const saved = readFileSync(file, 'utf8');
    await sessions.toggle();
    expect(host.capture).toHaveBeenCalledWith(expect.objectContaining({ type: 'start' }));
    await finishRecording(sessions);
    expect(clipboard()).toBe('clean'); expect(host.paste).toHaveBeenCalledTimes(1);
    expect(host.copy.mock.invocationCallOrder[0]).toBeLessThan(host.paste.mock.invocationCallOrder[0]);
    expect(readFileSync(file, 'utf8')).toBe(saved); expect(Object.keys(store.snapshot())).toEqual(['settings']);
  });
  it.each(['confirmed', 'dispatched'])('distinguishes %s delivery while retaining the copied text', async status => {
    const { sessions, host, clipboard } = setup(); host.paste.mockResolvedValueOnce({ ok: true, status });
    await sessions.toggle(); await finishRecording(sessions);
    expect(sessions.session).toMatchObject({ status: 'ready', copied: true, delivery: status, inserted: true });
    expect(clipboard()).toBe('clean');
    await expect(sessions.retry()).rejects.toThrow(); await sessions.copy('raw'); expect(clipboard()).toBe('raw'); expect(sessions.session.text).toBe('clean');
    expect(host.paste).toHaveBeenCalledTimes(1);
  });
  it('explicitly copies available raw text after cancellation without pasting or accepting late cleanup', async () => {
    const { sessions, host, provider, clipboard } = setup();
    const pending = deferred<{ text: string; warning: undefined }>();
    provider.cleanup = vi.fn(() => pending.promise);
    await sessions.toggle(); const processing = finishRecording(sessions);
    await vi.waitFor(() => expect(sessions.session.status).toBe('polishing'));
    sessions.cancel(); expect(sessions.session.text).toBe(''); expect(sessions.session.rawText).toBe('raw');
    await sessions.copy('raw'); expect(clipboard()).toBe('raw'); expect(host.paste).not.toHaveBeenCalled();
    pending.resolve({ text: 'late text', warning: undefined }); await processing;
    expect(clipboard()).toBe('raw'); expect(host.copy).toHaveBeenCalledTimes(1); expect(host.paste).not.toHaveBeenCalled();
  });
  it('exposes retry only while recoverable audio or text is retained and paste is unconsumed', async () => {
    vi.useFakeTimers();
    try {
      const { sessions, provider } = setup();
      expect(sessions.session.canRetry).toBe(false);
      await sessions.toggle(); await sessions.capture({ type: 'error', sessionId: sessions.session.id, code: 'microphone_unavailable', message: 'Microphone unavailable.' });
      expect(sessions.session.canRetry).toBe(false);
      provider.transcribe = vi.fn(async () => { throw new Error('Network unavailable.'); });
      await sessions.toggle(); await finishRecording(sessions);
      expect(sessions.session.canRetry).toBe(true); expect(sessions.session.errorCode).toBe('asr_failed');
      await vi.advanceTimersByTimeAsync(5 * 60000);
      expect(sessions.session.canRetry).toBe(false);
      provider.transcribe = vi.fn(async () => 'raw');
      await sessions.toggle(); await finishRecording(sessions);
      expect(sessions.session.canRetry).toBe(false);
    } finally { vi.useRealTimers(); }
  });
  it.each(['no_speech', 'microphone_disconnected', 'microphone_denied', 'microphone_unavailable', 'capture_failed'] as const)('preserves capture error %s and clears capture/retry state', async code => {
    const { sessions, host } = setup(); await sessions.toggle();
    await sessions.capture({ type: 'error', sessionId: sessions.session.id, code, message: 'Capture fixture failure.' });
    expect(sessions.session).toMatchObject({ status: 'error', errorCode: code, canRetry: false, level: 0 });
    expect(host.capture).toHaveBeenLastCalledWith({ type: 'cancel', sessionId: sessions.session.id });
    expect(host.copy).not.toHaveBeenCalled(); expect(host.paste).not.toHaveBeenCalled();
  });
  it.each(['401', 'timeout', 'network'])('preserves ASR provider error %s without automatic resubmission', async code => {
    const { sessions, provider, host } = setup(); provider.transcribe = vi.fn(async () => { throw new ProviderError('Provider fixture failure.', code); });
    await sessions.toggle(); await finishRecording(sessions);
    expect(sessions.session).toMatchObject({ status: 'error', errorCode: `asr_${code}`, canRetry: true });
    expect(provider.transcribe).toHaveBeenCalledTimes(1); expect(host.paste).not.toHaveBeenCalled(); sessions.cancel();
  });
  it('automatically copies output without pasting when automatic paste is off', async () => {
    const { sessions, host, store, clipboard } = setup();
    store.saveSettings({ general: { autoInsert: false } });
    await sessions.toggle(); await finishRecording(sessions);
    expect(sessions.session).toMatchObject({ status: 'ready', delivery: 'copied', copied: true, inserted: false });
    expect(clipboard()).toBe('clean'); expect(host.paste).not.toHaveBeenCalled();
    await sessions.copy('raw'); expect(clipboard()).toBe('raw'); expect(host.paste).not.toHaveBeenCalled();
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
  it('never copies or pastes a recognition response that arrives after cancellation', async () => {
    const { sessions, provider, host } = setup(); const response = deferred<string>(); provider.transcribe = vi.fn(() => response.promise);
    await sessions.toggle(); const pending = finishRecording(sessions);
    await vi.waitFor(() => expect(provider.transcribe).toHaveBeenCalled()); sessions.cancel(); response.resolve('late'); await pending;
    expect(host.copy).not.toHaveBeenCalled(); expect(host.paste).not.toHaveBeenCalled(); expect(sessions.session.status).toBe('cancelled');
  });
  it('passes cancellation to queued clipboard work so an old result cannot overwrite the new one', async () => {
    const { sessions, provider, host, store, clipboard } = setup(); store.saveSettings({ general: { autoInsert: false } }); const copying = deferred<void>();
    provider.cleanup = vi.fn(async (_settings, _key, raw) => ({ text: raw, warning: undefined }));
    const actualCopy = host.copy.getMockImplementation()!;
    host.copy.mockImplementationOnce(async (text, signal) => { await copying.promise; await actualCopy(text, signal); });
    provider.transcribe = vi.fn(async () => 'old'); await sessions.toggle();
    const old = finishRecording(sessions); await vi.waitFor(() => expect(host.copy).toHaveBeenCalledTimes(1));
    const signal = host.copy.mock.calls[0][1]; sessions.cancel(); expect(signal?.aborted).toBe(true);
    provider.transcribe = vi.fn(async () => 'new'); await sessions.toggle(); await finishRecording(sessions); copying.resolve(); await old;
    expect(clipboard()).toBe('new'); expect(sessions.session).toMatchObject({ text: 'new', copied: true, delivery: 'copied' }); expect(host.paste).not.toHaveBeenCalled();
  });
  it('does not publish ready while paste is pending and does not retract the clipboard on cancellation', async () => {
    const { sessions, host, clipboard } = setup(); const paste = deferred<Awaited<ReturnType<SessionHost['paste']>>>(); host.paste.mockReturnValueOnce(paste.promise);
    await sessions.toggle(); const pending = finishRecording(sessions);
    await vi.waitFor(() => expect(host.paste).toHaveBeenCalled());
    expect(sessions.session).toMatchObject({ status: 'inserting', delivery: 'pending', copied: true });
    expect(host.changed.mock.calls.some(([state]) => state.status === 'ready')).toBe(false);
    await expect(sessions.toggle()).rejects.toThrow();
    sessions.cancel(); expect(clipboard()).toBe('clean'); expect(sessions.session).toMatchObject({ status: 'cancelled', copied: true, delivery: 'copied' });
    paste.resolve({ ok: true, status: 'confirmed' }); await pending;
    expect(sessions.session).toMatchObject({ status: 'cancelled', inserted: false, delivery: 'copied' });
  });
  it('honors changed editing preferences before delayed cleanup', async () => {
    const { sessions, provider, store } = setup(); const response = deferred<string>(); provider.transcribe = vi.fn(() => response.promise);
    await sessions.toggle(); const pending = finishRecording(sessions); await vi.waitFor(() => expect(provider.transcribe).toHaveBeenCalled());
    store.saveSettings({ cleanup: { enabled: false }, writing: { instructions: 'Current preference', strength: 'light' } });
    response.resolve('raw'); await pending;
    const call = vi.mocked(provider.cleanup).mock.calls[0]; expect(call[0].cleanup.enabled).toBe(false); expect(call[0].writing).toMatchObject({ strength: 'light', instructions: 'Current preference' });
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
});

describe('configuration application', () => {
  it('does not reconfigure shortcuts for unrelated saves and distinguishes persisted settings from OS apply failure', async () => {
    const { store, provider, host } = setup();
    const settingsChanged = vi.fn(async (_changes: { login: boolean; shortcut: boolean }) => {});
    const controller = new Controller(store, provider, { ...host, settingsChanged, publish: vi.fn(), permissions: vi.fn(), openPane: vi.fn(), microphoneTest: vi.fn(), show: vi.fn(), hide: vi.fn(), quit: vi.fn(), relaunch: vi.fn(), copyDiagnostics: vi.fn(async () => {}), checkUpdate: vi.fn(async () => {}), downloadUpdate: vi.fn(async () => {}), openUpdate: vi.fn(async () => {}), openReleasePage: vi.fn(async () => {}) }, 'test');
    expect((await controller.dispatch({ type: 'settings.save', patch: { writing: { instructions: 'Use concise prose.' } } })).ok).toBe(true);
    expect(settingsChanged).not.toHaveBeenCalled();
    settingsChanged.mockRejectedValueOnce(new Error('OS permission denied.'));
    const result = await controller.dispatch({ type: 'settings.save', patch: { general: { launchAtLogin: true } } });
    expect(result).toMatchObject({ ok: true, message: expect.stringContaining('saved') });
    expect(settingsChanged).toHaveBeenCalledWith({ login: true, shortcut: false });
    expect(controller.snapshot().settings.general.launchAtLogin).toBe(true);
  });
});
