import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Store, defaults } from '../src/core/store';
import { cleanupMessages } from '../src/core/providers';
const paths: string[] = [];
const crypto = { available: () => true, encrypt: (value: string) => Buffer.from(value).toString('base64'), decrypt: (value: string) => Buffer.from(value, 'base64').toString() };
function create() {
  mkdirSync('.local/tests', { recursive: true }); const dir = mkdtempSync('.local/tests/store-'); paths.push(dir);
  const file = join(dir, 'state.json');
  return { store: new Store(file, crypto), file };
}
afterEach(() => { paths.splice(0).forEach(path => rmSync(path, { recursive: true, force: true })); });
describe('configuration and opaque document preservation', () => {
  it('keeps API keys out of snapshots and revokes a key on cross-origin changes', () => {
    const { store, file } = create();
    store.saveSettings({}, { asr: 'example-secret' });
    expect(JSON.stringify(store.snapshot())).not.toContain('example-secret');
    expect(readFileSync(file, 'utf8')).not.toContain('example-secret');
    store.saveSettings({ asr: { baseUrl: 'https://api.xiaomimimo.com/custom' } });
    expect(store.secret('asr')).toBe('example-secret');
    store.saveSettings({ asr: { baseUrl: 'https://other.example/v1' } });
    expect(store.secret('asr')).toBe(''); expect(store.snapshot().settings.asr.hasApiKey).toBe(false);
    expect(new Store(file, crypto).secret('asr')).toBe('');
  });
  it('revokes credentials when changing ASR request protocol', () => {
    const { store } = create(); store.saveSettings({}, { asr: 'key' });
    store.saveSettings({ asr: { kind: 'openai' } }); expect(store.secret('asr')).toBe('');
  });
  it('rejects invalid endpoints and unknown runtime settings without writing', () => {
    const { store, file } = create(); store.saveSettings({}); const before = readFileSync(file, 'utf8');
    expect(() => store.saveSettings({ cleanup: { baseUrl: 'http://remote.example/v1' } })).toThrow();
    expect(() => store.saveSettings({ cleanup: { baseUrl: 'https://secret@remote.example/v1' } })).toThrow();
    expect(() => store.saveSettings({ privacy: {} } as never)).toThrow();
    expect(readFileSync(file, 'utf8')).toBe(before);
  });
  it('keeps saved and live preferences and keys unchanged when the atomic write fails', () => {
    const { store, file } = create(); store.saveSettings({}, { asr: 'original-key' });
    const before = readFileSync(file, 'utf8'); const snapshot = store.snapshot();
    mkdirSync(`${file}.tmp`);
    expect(() => store.saveSettings({ asr: { baseUrl: 'https://different.example/v1' } }, { asr: 'replacement-key' })).toThrow();
    expect(store.snapshot()).toEqual(snapshot); expect(store.secret('asr')).toBe('original-key');
    expect(readFileSync(file, 'utf8')).toBe(before);
    rmSync(`${file}.tmp`, { recursive: true });
    store.saveSettings({ audio: { interactionSounds: false } });
    expect(new Store(file, crypto).secret('asr')).toBe('original-key');
  });
  it('defaults to strong editing and only the current configuration sections', () => {
    expect(defaults().writing.strength).toBe('balanced'); expect(defaults().cleanup.enabled).toBe(true);
    expect(Object.keys(defaults()).sort()).toEqual(['asr', 'audio', 'cleanup', 'general', 'shortcut', 'writing']);
  });
  it.each(['light', 'balanced'] as const)('opens existing %s preferences and encrypted keys without rewriting or exposing opaque data', strength => {
    const { store, file } = create();
    store.saveSettings({ cleanup: { enabled: false, model: 'saved-model' }, writing: { strength, instructions: 'Keep terminology.' }, general: { autoInsert: false } }, { asr: 'asr-fixture-key', cleanup: 'text-fixture-key' });
    const saved = JSON.parse(readFileSync(file, 'utf8'));
    saved.settings.writing.translationTarget = 'French'; saved.settings.general.onboardingComplete = true;
    saved.settings.privacy = { historyEnabled: true, retentionDays: 1, memoryEnabled: true, shareAppContext: true };
    saved.history = [{ rawText: 'opaque-history-sentinel' }]; saved.memories = [{ content: 'opaque-memory-sentinel' }];
    saved.dictionary = [{ term: 'opaque-dictionary-sentinel' }]; saved.profiles = [{ instructions: 'opaque-profile-sentinel' }];
    saved.customDocumentField = { nested: ['untouched'] }; saved.settings.audio.customAudioField = 7;
    writeFileSync(file, JSON.stringify(saved)); const before = readFileSync(file, 'utf8');
    const reopened = new Store(file, crypto);
    expect(reopened.snapshot().settings).toMatchObject({ cleanup: { enabled: false, model: 'saved-model' }, writing: { strength, instructions: 'Keep terminology.' }, general: { autoInsert: false } });
    expect(reopened.secret('cleanup')).toBe('text-fixture-key'); expect(reopened.secret('asr')).toBe('asr-fixture-key');
    expect(readFileSync(file, 'utf8')).toBe(before);
    expect(JSON.stringify(reopened.snapshot())).not.toContain('opaque-'); expect(reopened.snapshot().settings).not.toHaveProperty('privacy');
    expect(JSON.stringify(cleanupMessages(reopened.snapshot().settings, 'synthetic transcript'))).not.toContain('opaque-');
    reopened.saveSettings({ audio: { interactionSounds: false } });
    const after = JSON.parse(readFileSync(file, 'utf8'));
    for (const key of ['history', 'memories', 'dictionary', 'profiles', 'customDocumentField', 'secrets']) expect(after[key]).toEqual(saved[key]);
    expect(after.settings.privacy).toEqual(saved.settings.privacy); expect(after.settings.writing.translationTarget).toBe('French');
    expect(after.settings.general.onboardingComplete).toBe(true); expect(after.settings.audio.customAudioField).toBe(7);
    expect(after.settings.audio.interactionSounds).toBe(false);
  });
  it('does not replace corrupted known settings or credentials with defaults', () => {
    const { file } = create(); const contents = JSON.stringify({ settings: { asr: { model: 42 } }, secrets: {} });
    writeFileSync(file, contents); expect(() => new Store(file, crypto)).toThrow('cannot be read'); expect(readFileSync(file, 'utf8')).toBe(contents);
  });
});
