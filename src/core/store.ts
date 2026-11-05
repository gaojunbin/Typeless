import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import {
  historyLimits,
  languages,
  vocabularyLimits,
  type AppSettings,
  type DictationHistoryEntry,
  type SettingsPatch,
  type SyncState,
  type VocabularyEntry,
} from '../shared/contracts';
import {
  decryptSyncSecret,
  detectIcloudDrive,
  encryptSyncSecret,
  extractSharedConfig,
  loadOrCreateSyncKey,
  mergeHistoryWithTombstones,
  mergeTombstones,
  mergeVocabularyWithTombstones,
  parseHistory,
  parseTombstones,
  rankHistory,
  readSyncBundle,
  writeSyncBundle,
  type SyncBundle,
} from './sync';
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
  private historyEntries: DictationHistoryEntry[] = [];
  private deletedVocabularyIds: Record<string, number> = {};
  private deletedHistoryIds: Record<string, number> = {};
  private syncEnabled = false;
  private syncFolder = '';
  private configUpdatedAt = 0;
  private lastSyncedAt?: number;
  private syncError?: string;

  private get companionFile() {
    return join(dirname(this.file), 'sync-state.json');
  }

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
      if (this.secrets.asr || this.secrets.cleanup) this.configUpdatedAt = 1;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error('Saved settings cannot be read. Keep the data file for recovery.');
    }
    this.loadCompanion();
    if (this.syncEnabled && this.syncFolder) {
      try { this.syncNow(); } catch { /* Best-effort startup sync; surfaced in syncState().error. */ }
    }
  }

  private loadCompanion() {
    try {
      if (!existsSync(this.companionFile)) return;
      const raw = object(JSON.parse(readFileSync(this.companionFile, 'utf8')));
      if (Array.isArray(raw.history)) this.historyEntries = parseHistory(raw.history);
      this.deletedVocabularyIds = parseTombstones(raw.deletedVocabularyIds);
      this.deletedHistoryIds = parseTombstones(raw.deletedHistoryIds);
      if (typeof raw.configUpdatedAt === 'number' && Number.isFinite(raw.configUpdatedAt)) {
        this.configUpdatedAt = Math.max(this.configUpdatedAt, raw.configUpdatedAt);
      }
      if (raw.sync && typeof raw.sync === 'object' && !Array.isArray(raw.sync)) {
        const s = raw.sync as Record<string, unknown>;
        this.syncEnabled = Boolean(s.enabled && typeof s.folderPath === 'string' && s.folderPath.trim());
        this.syncFolder = typeof s.folderPath === 'string' ? s.folderPath.trim() : '';
        if (typeof s.lastSyncedAt === 'number' && Number.isFinite(s.lastSyncedAt)) this.lastSyncedAt = s.lastSyncedAt;
      }
    } catch {
      /* Companion history/sync state is non-fatal if absent or unreadable. */
    }
  }

  private persistCompanion() {
    mkdirSync(dirname(this.companionFile), { recursive: true, mode: 0o700 });
    const payload = {
      version: 1,
      configUpdatedAt: this.configUpdatedAt,
      sync: {
        enabled: this.syncEnabled,
        folderPath: this.syncFolder,
        lastSyncedAt: this.lastSyncedAt,
      },
      deletedVocabularyIds: this.deletedVocabularyIds,
      deletedHistoryIds: this.deletedHistoryIds,
      history: this.historyEntries,
    };
    const tmp = `${this.companionFile}.${randomUUID().slice(0, 8)}.tmp`;
    writeFileSync(tmp, JSON.stringify(payload, null, 2), { mode: 0o600 });
    renameSync(tmp, this.companionFile);
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

  /** Newest first. */
  history(): DictationHistoryEntry[] { return structuredClone(rankHistory(this.historyEntries)); }

  /** Current multi-device sync status. */
  syncState(): SyncState {
    const icloud = detectIcloudDrive();
    return {
      enabled: this.syncEnabled,
      folderPath: this.syncFolder,
      icloudAvailable: icloud.available,
      defaultIcloudPath: icloud.defaultPath,
      lastSyncedAt: this.lastSyncedAt,
      error: this.syncError,
    };
  }

  /** Records a completed dictation in local history and syncs if enabled. */
  recordHistory(input: { id: string; startedAt: number; durationMs: number; rawText: string; text: string; polished: boolean }, now = Date.now()): DictationHistoryEntry {
    const entry: DictationHistoryEntry = {
      id: input.id || randomUUID(),
      startedAt: input.startedAt || now,
      durationMs: Math.max(0, Math.round(input.durationMs || 0)),
      rawText: bounded(input.rawText, historyLimits.maxTextLength, 'Raw transcript'),
      text: bounded(input.text, historyLimits.maxTextLength, 'Polished transcript'),
      polished: Boolean(input.polished),
      updatedAt: now,
    };
    delete this.deletedHistoryIds[entry.id];
    const filtered = this.historyEntries.filter(item => item.id !== entry.id);
    this.historyEntries = rankHistory([entry, ...filtered]);
    this.persistCompanion();
    if (this.syncEnabled && this.syncFolder) {
      try { this.syncNow(now); } catch { /* Best effort during dictation completion. */ }
    }
    return structuredClone(entry);
  }

  /** Updates the text of an existing history entry (e.g. after a user correction). */
  updateHistoryText(id: string, text: string, now = Date.now()) {
    const entry = this.historyEntries.find(item => item.id === id);
    if (!entry) return;
    entry.text = bounded(text, historyLimits.maxTextLength, 'Polished transcript');
    entry.updatedAt = now;
    this.persistCompanion();
    if (this.syncEnabled && this.syncFolder) {
      try { this.syncNow(now); } catch { /* Best effort. */ }
    }
  }

  deleteHistory(id: unknown, now = Date.now()) {
    if (typeof id !== 'string' || !id) throw new Error('Invalid history entry.');
    const before = this.historyEntries.length;
    this.historyEntries = this.historyEntries.filter(entry => entry.id !== id);
    this.deletedHistoryIds[id] = now;
    if (this.historyEntries.length !== before || this.syncEnabled) {
      this.persistCompanion();
      if (this.syncEnabled && this.syncFolder) {
        try { this.syncNow(now); } catch { /* Best effort. */ }
      }
    }
  }

  clearHistory(now = Date.now()) {
    for (const item of this.historyEntries) {
      this.deletedHistoryIds[item.id] = now;
    }
    this.historyEntries = [];
    this.persistCompanion();
    if (this.syncEnabled && this.syncFolder) {
      try { this.syncNow(now); } catch { /* Best effort. */ }
    }
  }

  /** Configures and activates a sync folder (e.g. an iCloud Drive directory), immediately merging state. */
  setSyncFolder(folderPath: string, now = Date.now()) {
    const trimmed = bounded(folderPath, 2048, 'Sync folder path').trim();
    if (!trimmed) throw new Error('Select a valid folder for synchronization.');
    const resolved = resolve(trimmed);
    mkdirSync(resolved, { recursive: true, mode: 0o700 });
    this.syncFolder = resolved;
    this.syncEnabled = true;
    this.syncError = undefined;
    this.syncNow(now, true);
  }

  /** Enables sync using the default iCloud Drive folder (`.../com~apple~CloudDocs/Typeless` or `.../iCloudDrive/Typeless`). */
  useIcloudSync(now = Date.now()) {
    const icloud = detectIcloudDrive();
    if (!icloud.available || !icloud.defaultPath) {
      throw new Error('iCloud Drive is not available on this device. Choose a sync folder manually.');
    }
    this.setSyncFolder(icloud.defaultPath, now);
  }

  /** Disables multi-device folder sync while keeping all local settings, vocabulary and history intact. */
  disableSync() {
    this.syncEnabled = false;
    this.syncError = undefined;
    this.persistCompanion();
  }

  /**
   * Synchronizes local settings, AES-256-GCM encrypted API keys, vocabulary and history
   * with `<syncFolder>/typeless-sync.json`. Returns true if local state changed.
   */
  syncNow(now = Date.now(), initialLink = false): boolean {
    if (!this.syncEnabled || !this.syncFolder) return false;
    try {
      const syncKey = loadOrCreateSyncKey(this.syncFolder);
      const remote = readSyncBundle(this.syncFolder);
      const mergedVocabTombstones = mergeTombstones(this.deletedVocabularyIds, remote?.deletedVocabularyIds ?? {});
      const mergedHistoryTombstones = mergeTombstones(this.deletedHistoryIds, remote?.deletedHistoryIds ?? {});
      const mergedVocabulary = mergeVocabularyWithTombstones(this.entries, remote?.vocabulary ?? [], mergedVocabTombstones);
      const mergedHistory = mergeHistoryWithTombstones(this.historyEntries, remote?.history ?? [], mergedHistoryTombstones);

      let nextSettings = structuredClone(this.settings);
      let nextSecrets = { ...this.secrets };
      let nextConfigUpdatedAt = this.configUpdatedAt || now;
      const syncSecrets: Partial<Record<'asr' | 'cleanup', string>> = {};

      const localHasKeys = Boolean(this.secrets.asr || this.secrets.cleanup);
      const remoteHasKeys = Boolean(remote && (remote.config.secrets.asr || remote.config.secrets.cleanup));
      const useRemoteConfig = Boolean(
        remote && (
          (initialLink && remoteHasKeys && !localHasKeys) ||
          (!(initialLink && localHasKeys && !remoteHasKeys) && remote.config.updatedAt > this.configUpdatedAt)
        ),
      );

      if (useRemoteConfig && remote) {
        nextConfigUpdatedAt = remote.config.updatedAt;
        nextSettings = settingsPatch(nextSettings, {
          asr: {
            kind: remote.config.asr.kind,
            baseUrl: remote.config.asr.baseUrl,
            model: remote.config.asr.model,
          },
          cleanup: {
            enabled: remote.config.cleanup.enabled,
            baseUrl: remote.config.cleanup.baseUrl,
            model: remote.config.cleanup.model,
          },
          writing: {
            strength: remote.config.writing.strength,
            instructions: remote.config.writing.instructions,
            language: remote.config.writing.language,
          },
        });
        nextSecrets = {};
        for (const key of ['asr', 'cleanup'] as const) {
          const enc = remote.config.secrets[key];
          if (enc) {
            const plain = decryptSyncSecret(enc, syncKey);
            if (plain && this.crypto.available()) {
              nextSecrets[key] = this.crypto.encrypt(plain);
            }
            syncSecrets[key] = enc;
          }
        }
      } else {
        for (const key of ['asr', 'cleanup'] as const) {
          const plain = this.secret(key);
          if (plain) {
            syncSecrets[key] = encryptSyncSecret(plain, syncKey);
          }
        }
      }

      const stateChanged =
        JSON.stringify(nextSettings) !== JSON.stringify(this.settings) ||
        JSON.stringify(nextSecrets) !== JSON.stringify(this.secrets) ||
        JSON.stringify(mergedVocabulary) !== JSON.stringify(this.entries) ||
        JSON.stringify(mergedHistory) !== JSON.stringify(this.historyEntries);

      if (
        JSON.stringify(nextSettings) !== JSON.stringify(this.settings) ||
        JSON.stringify(nextSecrets) !== JSON.stringify(this.secrets) ||
        JSON.stringify(mergedVocabulary) !== JSON.stringify(this.entries)
      ) {
        this.persist(nextSettings, nextSecrets, mergedVocabulary);
      }

      this.configUpdatedAt = nextConfigUpdatedAt;
      this.deletedVocabularyIds = mergedVocabTombstones;
      this.deletedHistoryIds = mergedHistoryTombstones;
      this.historyEntries = mergedHistory;
      this.lastSyncedAt = now;
      this.syncError = undefined;
      this.persistCompanion();

      const bundle: SyncBundle = {
        version: 1,
        updatedAt: now,
        config: extractSharedConfig(this.settings, syncSecrets, this.configUpdatedAt),
        vocabulary: this.entries,
        deletedVocabularyIds: this.deletedVocabularyIds,
        history: this.historyEntries,
        deletedHistoryIds: this.deletedHistoryIds,
      };
      writeSyncBundle(this.syncFolder, bundle);
      return stateChanged;
    } catch (error) {
      this.syncError = error instanceof Error ? error.message : 'Failed to synchronize with the selected folder.';
      try { this.persistCompanion(); } catch { /* Ignore companion write failure. */ }
      throw error;
    }
  }

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
    delete this.deletedVocabularyIds[saved.id];
    this.persist(this.settings, this.secrets, entries);
    if (this.syncEnabled && this.syncFolder) {
      try { this.syncNow(now); } catch { /* Best effort. */ }
    }
    return structuredClone(saved);
  }

  deleteVocabulary(id: unknown, now = Date.now()) {
    if (typeof id !== 'string' || !id) throw new Error('Invalid vocabulary entry.');
    const entries = this.entries.filter(entry => entry.id !== id);
    if (entries.length !== this.entries.length) {
      this.deletedVocabularyIds[id] = now;
      this.persist(this.settings, this.secrets, entries);
      if (this.syncEnabled && this.syncFolder) {
        try { this.syncNow(now); } catch { /* Best effort. */ }
      }
    }
  }

  /** Counts one use per dictation; no text is stored. */
  recordVocabularyHits(ids: string[], now = Date.now()) {
    if (!ids.length) return;
    this.persist(this.settings, this.secrets, this.entries.map(entry => ids.includes(entry.id) ? { ...entry, hits: entry.hits + 1, lastUsedAt: now, updatedAt: Math.max(entry.updatedAt, now) } : entry));
    if (this.syncEnabled && this.syncFolder) {
      try { this.syncNow(now); } catch { /* Best effort. */ }
    }
  }

  secret(key: 'asr' | 'cleanup') {
    const value = this.secrets[key];
    if (!value) return '';
    if (!this.crypto.available()) throw new Error('Secure credential storage is unavailable.');
    try { return this.crypto.decrypt(value); } catch { throw new Error('The saved API key cannot be decrypted. Enter it again.'); }
  }

  saveSettings(patch: SettingsPatch, secrets?: { asr?: string; cleanup?: string }, now = Date.now()) {
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
    const sharedChanged =
      JSON.stringify(next.asr) !== JSON.stringify(this.settings.asr) ||
      JSON.stringify(next.cleanup) !== JSON.stringify(this.settings.cleanup) ||
      JSON.stringify(next.writing) !== JSON.stringify(this.settings.writing) ||
      JSON.stringify(encrypted) !== JSON.stringify(this.secrets);
    this.persist(next, encrypted);
    if (sharedChanged) {
      this.configUpdatedAt = now;
      if (this.syncEnabled && this.syncFolder) {
        try { this.syncNow(now); } catch { /* Best effort. */ }
      } else if (existsSync(this.companionFile)) {
        try { this.persistCompanion(); } catch { /* Best effort. */ }
      }
    }
  }
}
