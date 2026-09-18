import type { AppSnapshot, TypelessBridge } from '../shared/contracts';

export const isPreview = !window.typeless;
function previewBridge(): TypelessBridge {
  const state: AppSnapshot = {
    version: '界面预览', platform: 'darwin',
    settings: {
      asr: { kind: 'mimo', baseUrl: 'https://api.xiaomimimo.com/v1', model: 'mimo-v2.5-asr', hasApiKey: false },
      cleanup: { enabled: true, baseUrl: 'https://api.openai.com/v1', model: '', hasApiKey: false },
      writing: { strength: 'balanced', instructions: '', language: 'auto' },
      audio: { deviceId: 'default', maxDurationSeconds: 60, interactionSounds: true },
      shortcut: { primary: 'Fn', fallback: 'CommandOrControl+Shift+Space' },
      general: { launchAtLogin: false, autoInsert: true },
    },
    session: { id: '', status: 'idle', startedAt: 0, durationMs: 0, level: 0, rawText: '', text: '', inserted: false, canRetry: false },
    permissions: { microphone: 'unknown', accessibility: false, nativeAvailable: false, nativeMessage: '', primaryShortcutAvailable: false, fallbackShortcutAvailable: false, inputMonitoring: false, shortcutMessage: '' },
  };
  const listeners = new Set<(value: AppSnapshot) => void>();
  return {
    getSnapshot: async () => structuredClone(state),
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    onCaptureCommand: () => () => {}, reportCapture: () => {},
    async dispatch(action) {
      if (action.type !== 'settings.save') return { ok: false, message: '请在桌面应用中使用录音和系统功能。' };
      Object.entries(action.patch).forEach(([key, value]) => Object.assign(state.settings[key as keyof typeof state.settings], value));
      listeners.forEach(listener => listener(structuredClone(state)));
      return { ok: true };
    },
  };
}
export const bridge = window.typeless ?? previewBridge();
