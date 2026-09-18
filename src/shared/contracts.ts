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
  audio: { deviceId: string; maxDurationSeconds: number; interactionSounds: boolean };
  shortcut: { primary: string; fallback: string };
  general: { launchAtLogin: boolean; autoInsert: boolean };
}

export type DeliveryStatus = 'none' | 'pending' | 'copied' | 'confirmed' | 'dispatched' | 'failed';

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
}

export interface AppSnapshot {
  version: string;
  platform: Platform;
  settings: AppSettings;
  session: DictationSession;
  permissions: Permissions;
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
  | { type: 'permissions.refresh' }
  | { type: 'permissions.request'; permission: 'microphone' | 'accessibility' }
  | { type: 'window.show' }
  | { type: 'window.hide' }
  | { type: 'app.quit' };

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
