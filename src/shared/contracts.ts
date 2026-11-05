export type Platform = 'darwin' | 'win32' | 'linux';
export type SessionStatus = 'idle' | 'arming' | 'recording' | 'transcribing' | 'polishing' | 'inserting' | 'ready' | 'error' | 'cancelled';

export interface ProviderSettings {
  kind: 'mimo' | 'openai';
  baseUrl: string;
  model: string;
  hasApiKey: boolean;
}

export interface AppSettings {
  asr: ProviderSettings;
  cleanup: { enabled: boolean; baseUrl: string; model: string; hasApiKey: boolean };
  writing: { strength: 'light' | 'balanced'; instructions: string; language: string };
  /** `muteDuringRecording` mutes the system output while recording and restores it afterwards. */
  audio: { deviceId: string; maxDurationSeconds: number; interactionSounds: boolean; muteDuringRecording: boolean };
  shortcut: { primary: string; fallback: string };
  general: { launchAtLogin: boolean; autoInsert: boolean; setupCompleted: boolean; language: Language };
}

/** Interface language. Every piece of interface copy exists in both. */
export type Language = 'zh' | 'en';
export const languages: readonly Language[] = ['zh', 'en'];

export type DeliveryStatus = 'none' | 'pending' | 'copied' | 'confirmed' | 'dispatched' | 'failed';

/** A word the speaker uses often, with what speech recognition tends to write instead. The id and timestamps keep entries mergeable for a later sync. */
export interface VocabularyEntry {
  id: string;
  term: string;
  /** Misrecognitions of `term`, such as 云 for Claude; may be empty. */
  soundsLike: string[];
  /** Delivered dictations whose final text contained `term`. Only the count is kept, never the text. */
  hits: number;
  /** Epoch milliseconds of the last hit; 0 until the term is first used. */
  lastUsedAt: number;
  createdAt: number;
  updatedAt: number;
}
export const vocabularyLimits = { entries: 500, length: 64, soundsLike: 8 } as const;

export interface DictationHistoryEntry {
  id: string;
  startedAt: number;
  durationMs: number;
  rawText: string;
  text: string;
  polished: boolean;
  updatedAt: number;
}
export const historyLimits = { entries: 200, maxTextLength: 50000 } as const;

export interface SyncState {
  enabled: boolean;
  folderPath: string;
  icloudAvailable: boolean;
  defaultIcloudPath: string;
  lastSyncedAt?: number;
  error?: string;
}

export interface DictationSession {
  id: string;
  status: SessionStatus;
  startedAt: number;
  durationMs: number;
  level: number;
  rawText: string;
  text: string;
  inserted: boolean;
  canRetry: boolean;
  copied?: boolean;
  delivery?: DeliveryStatus;
  errorCode?: string;
  error?: string;
  warning?: string;
}

export interface Permissions {
  microphone: 'granted' | 'denied' | 'not-determined' | 'unknown';
  accessibility: boolean;
  nativeAvailable: boolean;
  nativeMessage: string;
  primaryShortcutAvailable: boolean;
  fallbackShortcutAvailable: boolean;
  inputMonitoring: boolean;
  shortcutMessage: string;
  /** Primary or fallback shortcut presses observed since launch. Counts instead of toggling dictation while setup is incomplete. */
  shortcutPresses: number;
}

export type UpdateStatus = 'idle' | 'checking' | 'none' | 'available' | 'downloading' | 'downloaded' | 'installing' | 'error';
export type UpdateError = 'network' | 'invalid_response' | 'no_asset' | 'checksum' | 'write_failed' | InstallError;
/** Failures of the macOS in-place install; the downloaded installer stays available for a manual install. */
export type InstallError = 'not_installed' | 'mount_failed' | 'invalid_installer' | 'install_failed';
export const installErrors: readonly InstallError[] = ['not_installed', 'mount_failed', 'invalid_installer', 'install_failed'];

/** Release check against GitHub. The renderer only renders it; main owns every transition. */
export interface UpdateState {
  status: UpdateStatus;
  currentVersion: string;
  latestVersion?: string;
  releaseUrl?: string;
  assetName?: string;
  /** Download progress from 0 to 1 while `downloading`. */
  progress?: number;
  /** Absolute path of the downloaded installer once `downloaded`. */
  filePath?: string;
  error?: UpdateError;
  checkedAt?: number;
}

export interface AppSnapshot {
  version: string;
  platform: Platform;
  settings: AppSettings;
  session: DictationSession;
  permissions: Permissions;
  update: UpdateState;
  /** Most used first: hits, then last use, then last edit. */
  vocabulary: VocabularyEntry[];
  /** Newest first. */
  history?: DictationHistoryEntry[];
  /** Multi-device folder / iCloud sync state. */
  sync?: SyncState;
}

export type SettingsPatch = {
  [K in keyof AppSettings]?: Partial<AppSettings[K]>;
};

export type AppAction =
  | { type: 'settings.save'; patch: SettingsPatch; secrets?: { asr?: string; cleanup?: string } }
  | { type: 'dictation.toggle' }
  | { type: 'dictation.cancel' }
  | { type: 'dictation.retry' }
  | { type: 'dictation.copy'; source?: 'result' | 'raw' }
  /** Learns `heard` as a misrecognition of `term`; with `start`, also fixes that occurrence in the shown result. */
  | { type: 'dictation.correct'; heard: string; term: string; start?: number }
  /** Without `id`: adds the term or merges `soundsLike` into the entry with the same term. With `id`: replaces that entry's term and variants. */
  | { type: 'vocabulary.save'; entry: { id?: string; term: string; soundsLike: string[] } }
  | { type: 'vocabulary.delete'; id: string }
  | { type: 'history.delete'; id: string }
  | { type: 'history.clear' }
  | { type: 'history.copy'; id: string; source?: 'result' | 'raw' }
  | { type: 'sync.selectFolder' }
  | { type: 'sync.useIcloud' }
  | { type: 'sync.setFolder'; path: string }
  | { type: 'sync.disable' }
  | { type: 'sync.now' }
  | { type: 'permissions.refresh' }
  | { type: 'permissions.request'; permission: 'microphone' | 'accessibility' }
  | { type: 'permissions.open'; pane: 'microphone' | 'accessibility' | 'inputMonitoring' }
  | { type: 'microphone.test'; active: boolean }
  | { type: 'window.show' }
  | { type: 'window.hide' }
  | { type: 'app.quit' }
  | { type: 'app.relaunch' }
  | { type: 'diagnostics.copy' }
  | { type: 'update.check' }
  | { type: 'update.download' }
  | { type: 'update.open' }
  | { type: 'update.install' }
  | { type: 'update.openRelease' };

export interface ActionResult {
  ok: boolean;
  message?: string;
}

export type CaptureCommand =
  | { type: 'start'; sessionId: string; deviceId: string; maxDurationSeconds: number }
  | { type: 'stop' | 'cancel'; sessionId: string };

export type CaptureErrorCode = 'no_speech' | 'microphone_disconnected' | 'microphone_denied' | 'microphone_unavailable' | 'capture_failed';

export type CaptureEvent =
  | { type: 'started'; sessionId: string }
  | { type: 'level'; sessionId: string; level: number; durationMs: number }
  | { type: 'error'; sessionId: string; code: CaptureErrorCode; message: string }
  | { type: 'audio'; sessionId: string; audio: Uint8Array; durationMs: number; sampleRate: number };

export interface TypelessBridge {
  getSnapshot(): Promise<AppSnapshot>;
  dispatch(action: AppAction): Promise<ActionResult>;
  subscribe(listener: (snapshot: AppSnapshot) => void): () => void;
  onCaptureCommand(listener: (command: CaptureCommand) => void): () => void;
  reportCapture(event: CaptureEvent): void;
}

declare global {
  interface Window {
    typeless?: TypelessBridge;
  }
}
