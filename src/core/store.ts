import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { languages, vocabularyLimits, type AppSettings, type SettingsPatch, type VocabularyEntry } from '../shared/contracts';
import { mergeVariants, parseVocabulary, rankVocabulary, sameWord, vocabularyInput } from './vocabulary';

export interface SecretCrypto { available(): boolean; encrypt(value: string): string; decrypt(value: string): string }
export const defaults = (): AppSettings => ({
  asr: { kind: 'mimo', baseUrl: 'https://api.xiaomimimo.com/v1', model: 'mimo-v2.5-asr', hasApiKey: false },
  cleanup: { enabled: true, baseUrl: 'https://api.openai.com/v1', model: '', hasApiKey: false },
  writing: { strength: 'balanced', instructions: '', language: 'auto' },
  audio: { deviceId: 'default', maxDurationSeconds: 60, interactionSounds: true, muteDuringRecording: true },
  shortcut: { primary: process.platform === 'win32' ? 'RightAlt' : 'Fn', fallback: 'CommandOrControl+Shift+Space' },
  general: { launchAtLogin: false, autoInsert: true, setupCompleted: false, language: 'zh' },
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
    if (!Object.hasOwn(next, group)) throw new Error('Unknown settings section.');
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
  if (!languages.includes(next.general.language)) throw new Error('Unknown interface language.');
  if (!Number.isInteger(next.audio.maxDurationSeconds) || next.audio.maxDurationSeconds < 5 || next.audio.maxDurationSeconds > 120) throw new Error('Recording limit must be 5–120 seconds.');
  return next;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid saved settings.');
  return value as Record<string, unknown>;
}
function generalSection(document: Record<string, unknown>): Record<string, unknown> {
  const settings = object(document.settings);
  return Object.hasOwn(settings, 'general') ? object(settings.general) : {};
}
function projectSettings(saved: Record<string, unknown>): AppSettings {
  const current = defaults();
  const patch: Record<string, unknown> = {};
  for (const group of Object.keys(current) as (keyof AppSettings)[]) {
    if (!Object.hasOwn(saved, group)) continue;
    const section = object(saved[group]);
    patch[group] = Object.fromEntries(Object.keys(current[group]).filter(key => Object.hasOwn(section, key)).map(key => [key, section[key]]));
  }
  return settingsPatch(current, patch as SettingsPatch);
}
export class Store {
  private document: Record<string, unknown> = {};
  private settings = defaults();
  private secrets: Partial<Record<'asr' | 'cleanup', string>> = {};
  private entries: VocabularyEntry[] = [];
  constructor(private file: string, private crypto: SecretCrypto) {
    try {
      this.document = object(JSON.parse(readFileSync(file, 'utf8')));
      this.settings = projectSettings(object(this.document.settings));
      // Documents written before the setup guide existed belong to users who already configured the app by hand.
      if (!Object.hasOwn(generalSection(this.document), 'setupCompleted')) this.settings.general.setupCompleted = true;
      const secrets = object(this.document.secrets);
      for (const key of ['asr', 'cleanup'] as const) {
        if (!Object.hasOwn(secrets, key)) continue;
        if (typeof secrets[key] !== 'string') throw new Error('Invalid saved credential.');
        this.secrets[key] = secrets[key];
      }
      if (Object.hasOwn(this.document, 'vocabulary')) this.entries = parseVocabulary(this.document.vocabulary);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error('Saved settings cannot be read. Keep the data file for recovery.');
    }
  }
  private persist(next: AppSettings, encrypted: Partial<Record<'asr' | 'cleanup', string>>, vocabulary = this.entries) {
    // Preserve unrecognized document fields as opaque data. Only the public
    // settings projection participates in runtime behavior or provider requests.
    const savedSettings = this.document.settings ? object(this.document.settings) : {};
    const settings = { ...savedSettings };
    for (const group of Object.keys(next) as (keyof AppSettings)[]) {
      settings[group] = { ...(savedSettings[group] ? object(savedSettings[group]) : {}), ...next[group] };
    }
    const secrets = { ...(this.document.secrets ? object(this.document.secrets) : {}) };
    for (const key of ['asr', 'cleanup'] as const) {
      delete secrets[key];
      if (encrypted[key]) secrets[key] = encrypted[key];
    }
    const document = { ...this.document, settings, secrets, vocabulary };
    mkdirSync(dirname(this.file), { recursive: true, mode: 0o700 });
    const temp = `${this.file}.tmp`;
    writeFileSync(temp, JSON.stringify(document, null, 2), { mode: 0o600 });
    renameSync(temp, this.file);
    this.document = document;
    this.settings = next; this.secrets = encrypted; this.entries = vocabulary;
  }
  snapshot() {
    const settings = structuredClone(this.settings);
    for (const key of ['asr', 'cleanup'] as const) settings[key].hasApiKey = Boolean(this.secrets[key]);
    return { settings };
  }
  /** Most used first. */
  vocabulary(): VocabularyEntry[] { return structuredClone(rankVocabulary(this.entries)); }
  /** Without an id, a word already present gains the new variants instead of a duplicate entry. */
  saveVocabulary(input: unknown, now = Date.now()): VocabularyEntry {
    const { id, term, soundsLike } = vocabularyInput(input);
    const entries = structuredClone(this.entries);
    const same = entries.find(entry => sameWord(entry.term, term));
    let saved: VocabularyEntry;
    if (id) {
      const entry = entries.find(item => item.id === id);
      if (!entry) throw new Error('This word is no longer in the vocabulary.');
      if (same && same !== entry) throw new Error('This word is already in the vocabulary.');
      Object.assign(entry, { term, soundsLike, updatedAt: now }); saved = entry;
    } else if (same) {
      Object.assign(same, { term, soundsLike: mergeVariants(same.soundsLike, soundsLike, term), updatedAt: now }); saved = same;
    } else {
      if (entries.length >= vocabularyLimits.entries) throw new Error(`The vocabulary holds at most ${vocabularyLimits.entries} words.`);
      saved = { id: randomUUID(), term, soundsLike, hits: 0, lastUsedAt: 0, createdAt: now, updatedAt: now };
      entries.push(saved);
    }
    this.persist(this.settings, this.secrets, entries);
    return structuredClone(saved);
  }
  deleteVocabulary(id: unknown) {
    if (typeof id !== 'string' || !id) throw new Error('Invalid vocabulary entry.');
    const entries = this.entries.filter(entry => entry.id !== id);
    if (entries.length !== this.entries.length) this.persist(this.settings, this.secrets, entries);
  }
  /** Counts one use per dictation; no text is stored. */
  recordVocabularyHits(ids: string[], now = Date.now()) {
    if (!ids.length) return;
    this.persist(this.settings, this.secrets, this.entries.map(entry => ids.includes(entry.id) ? { ...entry, hits: entry.hits + 1, lastUsedAt: now } : entry));
  }
  secret(key: 'asr' | 'cleanup') {
    const value = this.secrets[key];
    if (!value) return '';
    if (!this.crypto.available()) throw new Error('Secure credential storage is unavailable.');
    try { return this.crypto.decrypt(value); } catch { throw new Error('The saved API key cannot be decrypted. Enter it again.'); }
  }
  saveSettings(patch: SettingsPatch, secrets?: { asr?: string; cleanup?: string }) {
    const next = settingsPatch(this.settings, patch);
    const encrypted = { ...this.secrets };
    for (const key of ['asr', 'cleanup'] as const) {
      if (endpointBase(next[key].baseUrl).origin !== endpointBase(this.settings[key].baseUrl).origin || (key === 'asr' && next.asr.kind !== this.settings.asr.kind)) delete encrypted[key];
      if (secrets && Object.hasOwn(secrets, key)) {
        const secret = bounded(secrets[key], 8192, 'API key').trim();
        if (/[\r\n]/.test(secret)) throw new Error('API key contains invalid characters.');
        if (secret) {
          if (!this.crypto.available()) throw new Error('Secure credential storage is unavailable; the API key was not saved.');
          encrypted[key] = this.crypto.encrypt(secret);
        } else delete encrypted[key];
      }
    }
    this.persist(next, encrypted);
  }
}
