import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { Store, defaults } from '../src/core/store';
const paths: string[] = [];
function create(now = () => Date.now()) {
  mkdirSync('.local/tests', { recursive: true }); const dir = mkdtempSync('.local/tests/store-'); paths.push(dir);
  const file = join(dir, 'state.json');
  const store = new Store(file, { available: () => true, encrypt: x => Buffer.from(x).toString('base64'), decrypt: x => Buffer.from(x, 'base64').toString() }, now);
  return { store, file };
}
afterEach(() => { paths.splice(0).forEach(path => rmSync(path, { recursive: true, force: true })); });
describe('configuration and retention', () => {
  it('keeps API keys out of snapshots and revokes a key on cross-origin changes', () => {
    const { store, file } = create();
    store.saveSettings({}, { asr: 'example-secret' });
    expect(JSON.stringify(store.snapshot())).not.toContain('example-secret');
    expect(readFileSync(file, 'utf8')).not.toContain('example-secret');
    store.saveSettings({ asr: { baseUrl: 'https://api.xiaomimimo.com/custom' } });
    expect(store.secret('asr')).toBe('example-secret');
    store.saveSettings({ asr: { baseUrl: 'https://other.example/v1' } });
    expect(store.secret('asr')).toBe(''); expect(store.snapshot().settings.asr.hasApiKey).toBe(false);
  });
  it('rejects remote HTTP and credential-bearing URLs without changing saved configuration', () => {
    const { store } = create();
    expect(() => store.saveSettings({ cleanup: { baseUrl: 'http://remote.example/v1' } })).toThrow();
    expect(() => store.saveSettings({ cleanup: { baseUrl: 'https://secret@remote.example/v1' } })).toThrow();
    expect(store.snapshot().settings.cleanup.baseUrl).toBe('https://api.openai.com/v1');
  });
  it('expires history and clears it when disabled', () => {
    let now = 1700000000000; const { store } = create(() => now);
    store.saveSettings({ privacy: { historyEnabled: true, retentionDays: 1 } });
    store.addHistory({ id: 'a', createdAt: new Date(now).toISOString(), rawText: 'raw', text: 'text', targetApp: '', mode: 'dictate', durationMs: 10, inserted: false });
    expect(store.snapshot().history).toHaveLength(1); now += 86400001; expect(store.snapshot().history).toHaveLength(0);
    store.addHistory({ id: 'b', createdAt: new Date(now).toISOString(), rawText: 'raw', text: 'text', targetApp: '', mode: 'dictate', durationMs: 10, inserted: false });
    store.saveSettings({ privacy: { historyEnabled: false } }); expect(store.snapshot().history).toHaveLength(0);
  });
  it('removes expired history from disk when reopening the store', () => {
    let now = 1700000000000; const { store, file } = create(() => now);
    store.saveSettings({ privacy: { historyEnabled: true, retentionDays: 1 } });
    store.addHistory({ id: 'expired', createdAt: new Date(now).toISOString(), rawText: 'private-old-text', text: 'private-old-text', targetApp: '', mode: 'dictate', durationMs: 10, inserted: false });
    now += 86400001;
    new Store(file, { available: () => true, encrypt: x => x, decrypt: x => x }, () => now);
    expect(readFileSync(file, 'utf8')).not.toContain('private-old-text');
  });
  it('round trips quoted multiline dictionary CSV without partial malformed import', () => {
    const { store } = create();
    store.importDictionary('term,replacement,description,scope\r\n"ACME, Inc.",ACME,"line one\nline two",*');
    expect(store.snapshot().dictionary[0].description).toContain('\n');
    const csv = store.exportDictionary(); expect(csv).toContain('"ACME, Inc."');
    expect(() => store.importDictionary('ok,value\n"unterminated')).toThrow(); expect(store.snapshot().dictionary).toHaveLength(1);
  });
});


describe('editing preferences retain their existing storage contract', () => {
  it('defaults new installations to the strong editing behavior', () => {
    expect(defaults().writing.strength).toBe('balanced'); expect(defaults().cleanup.enabled).toBe(true);
  });
  it.each(['light', 'balanced'] as const)('reopens existing %s settings without rewriting preferences or losing encrypted keys', strength => {
    const { store, file } = create();
    store.saveSettings({ cleanup: { enabled: false, model: 'saved-model' }, writing: { strength, instructions: 'Keep terminology.', translationTarget: 'French' }, general: { autoInsert: false } }, { asr: 'asr-fixture-key', cleanup: 'text-fixture-key' });
    store.saveDictionary({ id: 'saved', term: 'MiMo', replacement: '', description: '', scope: '*' });
    const before = readFileSync(file, 'utf8');
    const reopened = new Store(file, { available: () => true, encrypt: value => Buffer.from(value).toString('base64'), decrypt: value => Buffer.from(value, 'base64').toString() });
    expect(reopened.snapshot().settings).toMatchObject({ cleanup: { enabled: false, model: 'saved-model' }, writing: { strength, instructions: 'Keep terminology.', translationTarget: 'French' }, general: { autoInsert: false } });
    expect(reopened.secret('cleanup')).toBe('text-fixture-key'); expect(reopened.secret('asr')).toBe('asr-fixture-key'); expect(reopened.snapshot().dictionary).toHaveLength(1);
    expect(readFileSync(file, 'utf8')).toBe(before);
  });
});
