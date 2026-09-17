export type Platform = 'darwin' | 'win32' | 'linux';
export type DictationMode = 'dictate' | 'translate';
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
  writing: { strength: 'light' | 'balanced'; instructions: string; language: string; translationTarget: string };
  audio: { deviceId: string; maxDurationSeconds: number; interactionSounds: boolean };
  shortcut: { primary: string; fallback: string };
  privacy: { historyEnabled: boolean; retentionDays: number; memoryEnabled: boolean; shareAppContext: boolean };
  general: { launchAtLogin: boolean; autoInsert: boolean; onboardingComplete: boolean };
}

export interface DictionaryEntry {
  id: string;
  term: string;
  replacement: string;
  description: string;
  scope: string;
}

export interface MemoryEntry {
  id: string;
  content: string;
  scope: string;
  enabled: boolean;
  source: 'manual' | 'correction';
  createdAt: string;
}

export interface AppProfile {
  id: string;
  appName: string;
  instructions: string;
  enabled: boolean;
}

export interface HistoryEntry {
  id: string;
  createdAt: string;
  rawText: string;
  text: string;
  mode: DictationMode;
  targetApp: string;
  durationMs: number;
  inserted: boolean;
  warning?: string;
}

export type DeliveryStatus = 'none' | 'pending' | 'copied' | 'confirmed' | 'dispatched' | 'failed';

export interface DictationSession {
  id: string;
  status: SessionStatus;
  mode: DictationMode;
  targetApp: string;
  startedAt: number;
  durationMs: number;
  level: number;
  rawText: string;
  text: string;
  inserted: boolean;
  copied?: boolean;
  delivery?: DeliveryStatus;
  practice?: boolean;
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
}

export interface AppSnapshot {
  version: string;
  platform: Platform;
  settings: AppSettings;
  dictionary: DictionaryEntry[];
  memories: MemoryEntry[];
  profiles: AppProfile[];
  history: HistoryEntry[];
  session: DictationSession;
  permissions: Permissions;
}

export type SettingsPatch = {
  [K in keyof AppSettings]?: Partial<AppSettings[K]>;
};

export type AppAction =
  | { type: 'settings.save'; patch: SettingsPatch; secrets?: { asr?: string; cleanup?: string } }
  | { type: 'dictation.toggle'; mode?: DictationMode; practice?: boolean }
  | { type: 'dictation.cancel' }
  | { type: 'dictation.retry' }
  | { type: 'dictation.useRaw' }
  | { type: 'dictation.copy'; text?: string }
  | { type: 'text.process'; text: string; mode?: DictationMode }
  | { type: 'dictionary.save'; entry: DictionaryEntry }
  | { type: 'dictionary.delete'; id: string }
  | { type: 'dictionary.import'; csv: string }
  | { type: 'dictionary.export' }
  | { type: 'memory.save'; entry: MemoryEntry }
  | { type: 'memory.delete'; id: string }
  | { type: 'profile.save'; profile: AppProfile }
  | { type: 'profile.delete'; id: string }
  | { type: 'history.delete'; id: string }
  | { type: 'history.clear' }
  | { type: 'history.export' }
  | { type: 'history.reprocess'; id: string }
  | { type: 'history.correct'; id: string; text: string; remember: boolean }
  | { type: 'permissions.refresh' }
  | { type: 'permissions.request'; permission: 'microphone' | 'accessibility' }
  | { type: 'provider.test'; provider: 'asr' | 'cleanup' }
  | { type: 'window.show' }
  | { type: 'window.hide' }
  | { type: 'app.quit' };

export interface ActionResult {
  ok: boolean;
  message?: string;
  text?: string;
}

export type CaptureCommand =
  | { type: 'start'; sessionId: string; deviceId: string; maxDurationSeconds: number }
  | { type: 'stop' | 'cancel'; sessionId: string };

export type CaptureEvent =
  | { type: 'started'; sessionId: string }
  | { type: 'level'; sessionId: string; level: number; durationMs: number }
  | { type: 'error'; sessionId: string; message: string }
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
