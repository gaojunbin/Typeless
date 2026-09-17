import type { AppSnapshot, TypelessBridge } from '../shared/contracts';

export const isPreview = !window.typeless;
function previewBridge(): TypelessBridge {
  const state: AppSnapshot = {
    version: '界面预览', platform: 'darwin',
    settings: {
      asr: { kind: 'mimo', baseUrl: 'https://api.xiaomimimo.com/v1', model: 'mimo-v2.5-asr', hasApiKey: false },
      cleanup: { enabled: true, baseUrl: 'https://api.openai.com/v1', model: '', hasApiKey: false },
      writing: { strength: 'balanced', instructions: '', language: 'auto', translationTarget: 'English' },
      audio: { deviceId: 'default', maxDurationSeconds: 60, interactionSounds: true },
      shortcut: { primary: 'Fn', fallback: 'CommandOrControl+Shift+Space' },
      privacy: { historyEnabled: false, retentionDays: 7, memoryEnabled: false, shareAppContext: false },
      general: { launchAtLogin: false, autoInsert: true, onboardingComplete: false },
    }, dictionary: [], memories: [], profiles: [], history: [],
    session: { id: '', status: 'idle', mode: 'dictate', targetApp: '', startedAt: 0, durationMs: 0, level: 0, rawText: '', text: '', inserted: false },
    permissions: { microphone: 'unknown', accessibility: false, nativeAvailable: false, nativeMessage: '浏览器预览没有桌面权限与全局快捷键。', primaryShortcutAvailable: false, fallbackShortcutAvailable: false, inputMonitoring: false, shortcutMessage: '' },
  };
  const listeners = new Set<(value: AppSnapshot) => void>();
  const notify = () => listeners.forEach(listener => listener(structuredClone(state)));
  return {
    getSnapshot: async () => structuredClone(state),
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    onCaptureCommand: () => () => {}, reportCapture: () => {},
    async dispatch(action) {
      const upsert = <T extends { id: string }>(list: T[], entry: T) => { const index = list.findIndex(item => item.id === entry.id); if (index >= 0) list[index] = entry; else list.push(entry); };
      switch (action.type) {
        case 'settings.save': Object.entries(action.patch).forEach(([key, value]) => Object.assign(state.settings[key as keyof typeof state.settings], value)); break;
        case 'dictionary.save': upsert(state.dictionary, action.entry); break;
        case 'dictionary.delete': state.dictionary = state.dictionary.filter(item => item.id !== action.id); break;
        case 'memory.save': upsert(state.memories, action.entry); break;
        case 'memory.delete': state.memories = state.memories.filter(item => item.id !== action.id); break;
        case 'profile.save': upsert(state.profiles, action.profile); break;
        case 'profile.delete': state.profiles = state.profiles.filter(item => item.id !== action.id); break;
        case 'dictation.copy': await navigator.clipboard.writeText(action.text ?? state.session.text); return { ok: true, message: '已复制' };
        default: return { ok: false, message: '这是浏览器界面预览。录音、转写、文件导出与系统操作请在桌面应用中使用；此处不会模拟成功结果。' };
      }
      notify(); return { ok: true, message: '预览变更仅保存在本次页面内，不会调用服务或保存密钥。' };
    },
  };
}
export const bridge = window.typeless ?? previewBridge();
