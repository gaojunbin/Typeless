import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AppSettings, AppProfile, DictionaryEntry, HistoryEntry, MemoryEntry, SettingsPatch } from '../shared/contracts';

export interface SecretCrypto { available(): boolean; encrypt(value: string): string; decrypt(value: string): string }
interface State { settings: AppSettings; secrets: Partial<Record<'asr' | 'cleanup', string>>; dictionary: DictionaryEntry[]; memories: MemoryEntry[]; profiles: AppProfile[]; history: HistoryEntry[] }
export const defaults = (): AppSettings => ({
  asr: { kind: 'mimo', baseUrl: 'https://api.xiaomimimo.com/v1', model: 'mimo-v2.5-asr', hasApiKey: false },
  cleanup: { enabled: true, baseUrl: 'https://api.openai.com/v1', model: '', hasApiKey: false },
  writing: { strength: 'balanced', instructions: '', language: 'auto', translationTarget: 'English' },
  audio: { deviceId: 'default', maxDurationSeconds: 60, interactionSounds: true },
  shortcut: { primary: process.platform === 'win32' ? 'RightAlt' : 'Fn', fallback: 'CommandOrControl+Shift+Space' },
  privacy: { historyEnabled: false, retentionDays: 7, memoryEnabled: false, shareAppContext: false },
  general: { launchAtLogin: false, autoInsert: true, onboardingComplete: false },
});
export const bounded = (value: unknown, max: number, label = 'Text'): string => {
  if (typeof value !== 'string' || value.length > max) throw new Error(`${label} must be text with at most ${max} characters.`);
  return value;
};
export function endpointBase(value: string): URL {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash) throw new Error('Endpoint must not contain credentials, query parameters or a fragment.');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) throw new Error('Use HTTPS, or HTTP on a loopback address.');
  return url;
}
function settingsPatch(current: AppSettings, patch: SettingsPatch): AppSettings {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('Invalid settings.');
  const next = structuredClone(current);
  for (const group of Object.keys(patch) as (keyof AppSettings)[]) {
    if (!(group in next)) throw new Error('Unknown settings section.');
    const values = patch[group];
    if (!values || typeof values !== 'object' || Array.isArray(values)) throw new Error('Invalid settings section.');
    for (const [key, value] of Object.entries(values)) {
      if (key === 'hasApiKey') continue;
      const section = next[group] as unknown as Record<string, unknown>;
      if (!Object.hasOwn(section, key) || typeof value !== typeof section[key]) throw new Error('Invalid setting value.');
      if (typeof value === 'string') bounded(value, key === 'instructions' ? 4000 : 2048);
      section[key] = value;
    }
  }
  endpointBase(next.asr.baseUrl); endpointBase(next.cleanup.baseUrl);
  if (!['mimo', 'openai'].includes(next.asr.kind) || !['light', 'balanced'].includes(next.writing.strength)) throw new Error('Unknown provider or writing mode.');
  if (!Number.isInteger(next.audio.maxDurationSeconds) || next.audio.maxDurationSeconds < 5 || next.audio.maxDurationSeconds > 120) throw new Error('Recording limit must be 5–120 seconds.');
  if (!Number.isInteger(next.privacy.retentionDays) || next.privacy.retentionDays < 1 || next.privacy.retentionDays > 365) throw new Error('History retention must be 1–365 days.');
  return next;
}
export class Store {
  private state: State;
  constructor(private file: string, private crypto: SecretCrypto, private now = () => Date.now()) {
    this.state = { settings: defaults(), secrets: {}, dictionary: [], memories: [], profiles: [], history: [] };
    try {
      const loaded = JSON.parse(readFileSync(file, 'utf8')) as State;
      this.state.settings = settingsPatch(defaults(), loaded.settings);
      for (const key of ['dictionary', 'memories', 'profiles', 'history'] as const) {
        if (!Array.isArray(loaded[key]) || loaded[key].length > 10000) throw new Error('Invalid saved data.');
      }
      this.state = { ...loaded, settings: this.state.settings };
      this.prune();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error('Saved settings cannot be read. Keep the data file for recovery.');
    }
  }
  private persist() {
    mkdirSync(dirname(this.file), { recursive: true, mode: 0o700 });
    const temp = `${this.file}.tmp`;
    writeFileSync(temp, JSON.stringify(this.state, null, 2), { mode: 0o600 });
    renameSync(temp, this.file);
  }
  snapshot() {
    this.prune();
    const { secrets: _secrets, ...publicState } = structuredClone(this.state);
    for (const key of ['asr', 'cleanup'] as const) publicState.settings[key].hasApiKey = Boolean(this.state.secrets[key]);
    return publicState;
  }
  secret(key: 'asr' | 'cleanup') {
    const value = this.state.secrets[key];
    if (!value) return '';
    if (!this.crypto.available()) throw new Error('Secure credential storage is unavailable.');
    try { return this.crypto.decrypt(value); } catch { throw new Error('The saved API key cannot be decrypted. Enter it again.'); }
  }
  saveSettings(patch: SettingsPatch, secrets?: { asr?: string; cleanup?: string }) {
    const next = settingsPatch(this.state.settings, patch);
    const encrypted = { ...this.state.secrets };
    for (const key of ['asr', 'cleanup'] as const) {
      if (endpointBase(next[key].baseUrl).origin !== endpointBase(this.state.settings[key].baseUrl).origin || (key === 'asr' && next.asr.kind !== this.state.settings.asr.kind)) delete encrypted[key];
      if (secrets && Object.hasOwn(secrets, key)) {
        const secret = bounded(secrets[key], 8192, 'API key').trim();
        if (/[\r\n]/.test(secret)) throw new Error('API key contains invalid characters.');
        if (secret) {
          if (!this.crypto.available()) throw new Error('Secure credential storage is unavailable; the API key was not saved.');
          encrypted[key] = this.crypto.encrypt(secret);
        } else delete encrypted[key];
      }
    }
    this.state.settings = next; this.state.secrets = encrypted;
    this.prune(false); this.persist();
  }
  prune(write = true) {
    const before = this.state.history.length;
    const threshold = this.now() - this.state.settings.privacy.retentionDays * 86400000;
    this.state.history = this.state.settings.privacy.historyEnabled ? this.state.history.filter(x => Date.parse(x.createdAt) >= threshold).slice(0, 1000) : [];
    if (write && before !== this.state.history.length) this.persist();
  }
  addHistory(entry: HistoryEntry) {
    if (!this.state.settings.privacy.historyEnabled) return;
    this.state.history = [entry, ...this.state.history.filter(x => x.id !== entry.id)].slice(0, 1000);
    this.prune(false); this.persist();
  }
  history(id: string) { this.prune(); return structuredClone(this.state.history.find(x => x.id === id)); }
  deleteHistory(id?: string) { this.state.history = id ? this.state.history.filter(x => x.id !== id) : []; this.persist(); }
  correctHistory(id: string, text: string, remember: boolean) {
    text = bounded(text, 50000); const entry = this.state.history.find(x => x.id === id);
    if (!entry) throw new Error('History entry was not found.');
    if (remember && !this.state.settings.privacy.memoryEnabled) throw new Error('Enable memory before saving a correction as memory.');
    const previous = entry.text; entry.text = text;
    if (remember) {
      this.saveMemory({ id: randomUUID(), content: `Preferred wording: ${text.slice(0, 900)}\nInstead of: ${previous.slice(0, 900)}`, scope: entry.targetApp || '*', enabled: true, source: 'correction', createdAt: new Date(this.now()).toISOString() });
    }
    this.persist();
  }
  saveDictionary(entry: DictionaryEntry) {
    const value: DictionaryEntry = { id: bounded(entry.id || randomUUID(), 100), term: bounded(entry.term, 200).trim(), replacement: bounded(entry.replacement, 500), description: bounded(entry.description, 1000), scope: bounded(entry.scope || '*', 200) };
    if (!value.term) throw new Error('A dictionary term is required.');
    this.upsert('dictionary', value);
  }
  saveMemory(entry: MemoryEntry) {
    const value: MemoryEntry = { id: bounded(entry.id || randomUUID(), 100), content: bounded(entry.content, 2000), scope: bounded(entry.scope || '*', 200), enabled: Boolean(entry.enabled), source: entry.source === 'correction' ? 'correction' : 'manual', createdAt: new Date(this.now()).toISOString() };
    if (!value.content.trim()) throw new Error('Memory content is required.');
    this.upsert('memories', value);
  }
  saveProfile(profile: AppProfile) {
    const value: AppProfile = { id: bounded(profile.id || randomUUID(), 100), appName: bounded(profile.appName, 200).trim(), instructions: bounded(profile.instructions, 4000), enabled: Boolean(profile.enabled) };
    if (!value.appName) throw new Error('An app name is required.');
    this.upsert('profiles', value);
  }
  private upsert<K extends 'dictionary' | 'memories' | 'profiles'>(key: K, value: State[K][number]) {
    const list = this.state[key] as { id: string }[];
    if (list.length >= 2000 && !list.some(x => x.id === value.id)) throw new Error('The entry limit has been reached.');
    const index = list.findIndex(x => x.id === value.id);
    if (index >= 0) list[index] = value; else list.push(value);
    this.persist();
  }
  delete(key: 'dictionary' | 'memories' | 'profiles', id: string) { this.state[key] = this.state[key].filter(x => x.id !== id) as never; this.persist(); }
  exportHistory() { this.prune(); return JSON.stringify(this.state.history, null, 2); }
  exportDictionary() { return [['term', 'replacement', 'description', 'scope'], ...this.state.dictionary.map(x => [x.term, x.replacement, x.description, x.scope])].map(row => row.map(x => `"${x.replaceAll('"', '""')}"`).join(',')).join('\r\n'); }
  importDictionary(csv: string) {
    const rows = parseCSV(bounded(csv, 1000000));
    if (rows[0]?.[0]?.replace(/^\uFEFF/, '').toLowerCase() === 'term') rows.shift();
    if (rows.length + this.state.dictionary.length > 2000) throw new Error('Dictionary import exceeds 2,000 entries.');
    const entries = rows.filter(row => row.some(Boolean)).map(row => {
      if (row.length > 4 || !row[0]?.trim()) throw new Error('Expected CSV columns: term,replacement,description,scope.');
      return { id: randomUUID(), term: bounded(row[0], 200), replacement: bounded(row[1] || '', 500), description: bounded(row[2] || '', 1000), scope: bounded(row[3] || '*', 200) };
    });
    this.state.dictionary.push(...entries); this.persist(); return entries.length;
  }
}
export function parseCSV(input: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') { if (quoted && input[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && input[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += char;
  }
  if (quoted) throw new Error('CSV contains an unterminated quoted field.');
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
