import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  historyLimits,
  vocabularyLimits,
  type AppSettings,
  type DictationHistoryEntry,
  type VocabularyEntry,
} from '../shared/contracts';
import { mergeVariants, parseVocabulary, rankVocabulary, sameWord } from './vocabulary';

export const SYNC_BUNDLE_FILE = 'typeless-sync.json';
export const SYNC_KEY_FILE = 'typeless-key.json';

export interface SharedProviderConfig {
  updatedAt: number;
  asr: { kind: 'mimo' | 'openai'; baseUrl: string; model: string };
  cleanup: { enabled: boolean; baseUrl: string; model: string };
  writing: { strength: 'light' | 'balanced'; instructions: string; language: string };
  /** AES-256-GCM encrypted secrets (`v1:<iv>:<tag>:<cipher>`). */
  secrets: Partial<Record<'asr' | 'cleanup', string>>;
}

export interface SyncBundle {
  version: 1;
  updatedAt: number;
  config: SharedProviderConfig;
  vocabulary: VocabularyEntry[];
  deletedVocabularyIds: Record<string, number>;
  history: DictationHistoryEntry[];
  deletedHistoryIds: Record<string, number>;
}

/** Detects whether iCloud Drive is mounted locally and returns the default Typeless sync path. */
export function detectIcloudDrive(platform = process.platform, home = homedir()): { available: boolean; defaultPath: string } {
  const override = process.env.TYPELESS_ICLOUD_DIR;
  if (override) {
    const resolved = resolve(override);
    try {
      const ok = existsSync(resolved) && statSync(resolved).isDirectory();
      return { available: ok, defaultPath: join(resolved, 'Typeless') };
    } catch {
      return { available: false, defaultPath: join(resolved, 'Typeless') };
    }
  }
  if (platform === 'darwin') {
    const cloudDocs = join(home, 'Library', 'Mobile Documents', 'com~apple~CloudDocs');
    try {
      const ok = existsSync(cloudDocs) && statSync(cloudDocs).isDirectory();
      return { available: ok, defaultPath: join(cloudDocs, 'Typeless') };
    } catch {
      return { available: false, defaultPath: join(cloudDocs, 'Typeless') };
    }
  }
  if (platform === 'win32') {
    const icloudWin = process.env.ICLOUDDRIVE || join(home, 'iCloudDrive');
    try {
      const ok = existsSync(icloudWin) && statSync(icloudWin).isDirectory();
      return { available: ok, defaultPath: join(icloudWin, 'Typeless') };
    } catch {
      return { available: false, defaultPath: join(icloudWin, 'Typeless') };
    }
  }
  return { available: false, defaultPath: '' };
}

/** Loads or creates a 256-bit AES key in `<syncFolder>/typeless-key.json` for cross-device encryption. */
export function loadOrCreateSyncKey(folderPath: string): Buffer {
  mkdirSync(folderPath, { recursive: true, mode: 0o700 });
  const keyFile = join(folderPath, SYNC_KEY_FILE);
  if (existsSync(keyFile)) {
    const raw = JSON.parse(readFileSync(keyFile, 'utf8')) as Record<string, unknown>;
    if (typeof raw?.key !== 'string') throw new Error('Invalid sync key file.');
    const buf = Buffer.from(raw.key, 'base64');
    if (buf.byteLength !== 32) throw new Error('Invalid sync key length.');
    return buf;
  }
  const key = randomBytes(32);
  const payload = { version: 1, key: key.toString('base64'), createdAt: Date.now() };
  const tmp = `${keyFile}.${randomUUID().slice(0, 8)}.tmp`;
  writeFileSync(tmp, JSON.stringify(payload, null, 2), { mode: 0o600 });
  renameSync(tmp, keyFile);
  return key;
}

/** Encrypts a secret with AES-256-GCM using the format `v1:<iv_b64>:<tag_b64>:<cipher_b64>`, compatible with Node crypto and iOS CryptoKit. */
export function encryptSyncSecret(plain: string, key: Buffer): string {
  if (key.byteLength !== 32) throw new Error('Sync key must be 32 bytes.');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

/** Decrypts an AES-256-GCM secret written by `encryptSyncSecret` or iOS CryptoKit. */
export function decryptSyncSecret(encoded: string, key: Buffer): string {
  if (key.byteLength !== 32) throw new Error('Sync key must be 32 bytes.');
  const parts = encoded.split(':');
  if (parts.length !== 4 || parts[0] !== 'v1') throw new Error('Invalid encrypted sync credential format.');
  const iv = Buffer.from(parts[1], 'base64');
  const tag = Buffer.from(parts[2], 'base64');
  const ciphertext = Buffer.from(parts[3], 'base64');
  if (iv.byteLength !== 12 || tag.byteLength !== 16) throw new Error('Invalid sync credential nonce or tag.');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString('utf8');
}

export function rankHistory(entries: DictationHistoryEntry[]): DictationHistoryEntry[] {
  return [...entries]
    .sort((a, b) => b.startedAt - a.startedAt || b.updatedAt - a.updatedAt)
    .slice(0, historyLimits.entries);
}

export function parseHistory(value: unknown): DictationHistoryEntry[] {
  if (!Array.isArray(value)) throw new Error('Invalid saved dictation history.');
  const parsed: DictationHistoryEntry[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const rec = item as Record<string, unknown>;
    if (
      typeof rec.id !== 'string' || !rec.id || rec.id.length > 100 ||
      typeof rec.startedAt !== 'number' || !Number.isFinite(rec.startedAt) || rec.startedAt < 0 ||
      typeof rec.durationMs !== 'number' || !Number.isFinite(rec.durationMs) || rec.durationMs < 0 ||
      typeof rec.rawText !== 'string' || rec.rawText.length > historyLimits.maxTextLength ||
      typeof rec.text !== 'string' || rec.text.length > historyLimits.maxTextLength ||
      typeof rec.polished !== 'boolean'
    ) continue;
    const updatedAt = typeof rec.updatedAt === 'number' && Number.isFinite(rec.updatedAt) ? rec.updatedAt : rec.startedAt;
    parsed.push({
      id: rec.id,
      startedAt: rec.startedAt,
      durationMs: rec.durationMs,
      rawText: rec.rawText,
      text: rec.text,
      polished: rec.polished,
      updatedAt,
    });
  }
  return rankHistory(parsed);
}

export function parseTombstones(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: Record<string, number> = {};
  for (const [key, ts] of Object.entries(value as Record<string, unknown>)) {
    if (key && key.length <= 100 && typeof ts === 'number' && Number.isFinite(ts) && ts > 0) {
      result[key] = ts;
    }
  }
  return result;
}

export function mergeTombstones(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const merged: Record<string, number> = { ...a };
  for (const [id, ts] of Object.entries(b)) {
    merged[id] = Math.max(merged[id] ?? 0, ts);
  }
  return merged;
}

/** Merges vocabulary lists from two devices, honoring deletion tombstones and combining variants/usage counts. */
export function mergeVocabularyWithTombstones(
  local: VocabularyEntry[],
  remote: VocabularyEntry[],
  deletedIds: Record<string, number>,
): VocabularyEntry[] {
  const byId = new Map<string, VocabularyEntry>();
  const ingest = (entry: VocabularyEntry) => {
    const deletedAt = deletedIds[entry.id];
    if (deletedAt && deletedAt >= entry.updatedAt) return;
    const existingById = byId.get(entry.id);
    const existingByTerm = existingById ?? [...byId.values()].find(other => sameWord(other.term, entry.term));
    if (!existingByTerm) {
      byId.set(entry.id, structuredClone(entry));
      return;
    }
    const newer = entry.updatedAt >= existingByTerm.updatedAt ? entry : existingByTerm;
    const older = newer === entry ? existingByTerm : entry;
    const combined: VocabularyEntry = {
      id: existingByTerm.id,
      term: newer.term,
      soundsLike: mergeVariants(older.soundsLike, newer.soundsLike, newer.term),
      hits: Math.max(existingByTerm.hits, entry.hits),
      lastUsedAt: Math.max(existingByTerm.lastUsedAt, entry.lastUsedAt),
      createdAt: Math.min(existingByTerm.createdAt, entry.createdAt),
      updatedAt: Math.max(existingByTerm.updatedAt, entry.updatedAt),
    };
    byId.set(existingByTerm.id, combined);
  };
  for (const item of local) ingest(item);
  for (const item of remote) ingest(item);
  return rankVocabulary([...byId.values()]).slice(0, vocabularyLimits.entries);
}

/** Merges dictation history lists from two devices, honoring deletion tombstones. */
export function mergeHistoryWithTombstones(
  local: DictationHistoryEntry[],
  remote: DictationHistoryEntry[],
  deletedIds: Record<string, number>,
): DictationHistoryEntry[] {
  const byId = new Map<string, DictationHistoryEntry>();
  const ingest = (entry: DictationHistoryEntry) => {
    const deletedAt = deletedIds[entry.id];
    if (deletedAt && deletedAt >= entry.updatedAt) return;
    const existing = byId.get(entry.id);
    if (!existing || entry.updatedAt >= existing.updatedAt) {
      byId.set(entry.id, structuredClone(entry));
    }
  };
  for (const item of local) ingest(item);
  for (const item of remote) ingest(item);
  return rankHistory([...byId.values()]);
}

export function extractSharedConfig(
  settings: AppSettings,
  encryptedSecrets: Partial<Record<'asr' | 'cleanup', string>>,
  updatedAt: number,
): SharedProviderConfig {
  return {
    updatedAt,
    asr: {
      kind: settings.asr.kind,
      baseUrl: settings.asr.baseUrl,
      model: settings.asr.model,
    },
    cleanup: {
      enabled: settings.cleanup.enabled,
      baseUrl: settings.cleanup.baseUrl,
      model: settings.cleanup.model,
    },
    writing: {
      strength: settings.writing.strength,
      instructions: settings.writing.instructions,
      language: settings.writing.language,
    },
    secrets: { ...encryptedSecrets },
  };
}

export function readSyncBundle(folderPath: string): SyncBundle | null {
  const bundleFile = join(folderPath, SYNC_BUNDLE_FILE);
  if (!existsSync(bundleFile)) return null;
  const raw = JSON.parse(readFileSync(bundleFile, 'utf8')) as Record<string, unknown>;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid sync bundle.');
  const configObj = (raw.config && typeof raw.config === 'object' && !Array.isArray(raw.config) ? raw.config : {}) as Record<string, unknown>;
  const asrObj = (configObj.asr && typeof configObj.asr === 'object' ? configObj.asr : {}) as Record<string, unknown>;
  const cleanupObj = (configObj.cleanup && typeof configObj.cleanup === 'object' ? configObj.cleanup : {}) as Record<string, unknown>;
  const writingObj = (configObj.writing && typeof configObj.writing === 'object' ? configObj.writing : {}) as Record<string, unknown>;
  const secretsObj = (configObj.secrets && typeof configObj.secrets === 'object' ? configObj.secrets : {}) as Record<string, unknown>;

  const vocabulary = Array.isArray(raw.vocabulary) ? parseVocabulary(raw.vocabulary.slice(0, vocabularyLimits.entries)) : [];
  const history = Array.isArray(raw.history) ? parseHistory(raw.history) : [];
  const deletedVocabularyIds = parseTombstones(raw.deletedVocabularyIds);
  const deletedHistoryIds = parseTombstones(raw.deletedHistoryIds);

  const secrets: Partial<Record<'asr' | 'cleanup', string>> = {};
  if (typeof secretsObj.asr === 'string' && secretsObj.asr) secrets.asr = secretsObj.asr;
  if (typeof secretsObj.cleanup === 'string' && secretsObj.cleanup) secrets.cleanup = secretsObj.cleanup;

  return {
    version: 1,
    updatedAt: typeof raw.updatedAt === 'number' && Number.isFinite(raw.updatedAt) ? raw.updatedAt : 0,
    config: {
      updatedAt: typeof configObj.updatedAt === 'number' && Number.isFinite(configObj.updatedAt) ? configObj.updatedAt : 0,
      asr: {
        kind: asrObj.kind === 'openai' ? 'openai' : 'mimo',
        baseUrl: typeof asrObj.baseUrl === 'string' ? asrObj.baseUrl : 'https://api.xiaomimimo.com/v1',
        model: typeof asrObj.model === 'string' ? asrObj.model : 'mimo-v2.5-asr',
      },
      cleanup: {
        enabled: typeof cleanupObj.enabled === 'boolean' ? cleanupObj.enabled : true,
        baseUrl: typeof cleanupObj.baseUrl === 'string' ? cleanupObj.baseUrl : 'https://api.openai.com/v1',
        model: typeof cleanupObj.model === 'string' ? cleanupObj.model : '',
      },
      writing: {
        strength: writingObj.strength === 'light' ? 'light' : 'balanced',
        instructions: typeof writingObj.instructions === 'string' ? writingObj.instructions : '',
        language: typeof writingObj.language === 'string' ? writingObj.language : 'auto',
      },
      secrets,
    },
    vocabulary,
    deletedVocabularyIds,
    history,
    deletedHistoryIds,
  };
}

export function writeSyncBundle(folderPath: string, bundle: SyncBundle): void {
  mkdirSync(folderPath, { recursive: true, mode: 0o700 });
  const bundleFile = join(folderPath, SYNC_BUNDLE_FILE);
  const tmp = `${bundleFile}.${randomUUID().slice(0, 8)}.tmp`;
  writeFileSync(tmp, JSON.stringify(bundle, null, 2), { mode: 0o600 });
  renameSync(tmp, bundleFile);
}
