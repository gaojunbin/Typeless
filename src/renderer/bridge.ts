import type { AppSnapshot, TypelessBridge } from '../shared/contracts';
import { translate } from './i18n';

export const isPreview = !window.typeless;
function previewBridge(): TypelessBridge {
  const state: AppSnapshot = {
    version: 'preview', platform: 'darwin',
    settings: {
      asr: { kind: 'mimo', baseUrl: 'https://api.xiaomimimo.com/v1', model: 'mimo-v2.5-asr', hasApiKey: false },
      cleanup: { enabled: true, baseUrl: 'https://api.openai.com/v1', model: '', hasApiKey: false },
      writing: { strength: 'balanced', instructions: '', language: 'auto' },
      audio: { deviceId: 'default', maxDurationSeconds: 60, interactionSounds: true },
      shortcut: { primary: 'Fn', fallback: 'CommandOrControl+Shift+Space' },
      // The browser preview opens the shell; #setup previews the first-run guide instead.
      general: { launchAtLogin: false, autoInsert: true, setupCompleted: location.hash !== '#setup', language: 'zh' },
    },
    session: { id: '', status: 'idle', startedAt: 0, durationMs: 0, level: 0, rawText: '', text: '', inserted: false, canRetry: false },
    update: { status: 'none', currentVersion: 'preview', checkedAt: Date.now() },
    permissions: { microphone: 'unknown', accessibility: false, nativeAvailable: false, nativeMessage: '', primaryShortcutAvailable: false, fallbackShortcutAvailable: false, inputMonitoring: false, shortcutMessage: '', shortcutPresses: 0 },
  };
  const listeners = new Set<(value: AppSnapshot) => void>();
  const publish = () => listeners.forEach(listener => listener(structuredClone(state)));
  return {
    getSnapshot: async () => structuredClone(state),
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    onCaptureCommand: () => () => {}, reportCapture: () => {},
    async dispatch(action) {
      switch (action.type) {
        case 'settings.save':
          Object.entries(action.patch).forEach(([key, value]) => Object.assign(state.settings[key as keyof typeof state.settings], value));
          publish();
          return { ok: true };
        // The setup guide has to keep moving in a plain browser: granting a permission resolves its card.
        case 'permissions.request':
          if (action.permission === 'microphone') state.permissions.microphone = 'granted';
          else state.permissions.accessibility = true;
          state.permissions.primaryShortcutAvailable = true;
          state.permissions.shortcutMessage = 'ready';
          publish();
          return { ok: true };
        case 'microphone.test':
        case 'permissions.open':
        case 'app.relaunch':
        case 'diagnostics.copy':
        case 'update.check':
        case 'update.download':
        case 'update.open':
        case 'update.openRelease':
          return { ok: true };
        default:
          return { ok: false, message: translate(state.settings.general.language, 'common.shell.previewOnly') };
      }
    },
  };
}
export const bridge = window.typeless ?? previewBridge();
