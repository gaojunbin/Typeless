import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { X } from 'lucide-react';
import type { AppSnapshot } from '../shared/contracts';
import { bridge, isPreview } from './bridge';
import { installCapture } from './audio';
import { installInteractionSounds } from './sounds';
import { Settings, type RunAction, type SettingsTab } from './Settings';
import { Busy } from './ui';
import { VoiceOverlay } from './VoiceOverlay';
import { DictationPanel } from './DictationPanel';
import './styles.css';

function App() {
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<SettingsTab | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const overlay = location.hash === '#overlay';
  useEffect(() => {
    document.body.classList.toggle('overlay-body', overlay);
    let live = true;
    const receive = (value: AppSnapshot) => {
      if (!live) return;
      setSnapshot(value);
      setTab(current => current ?? (value.settings.asr.hasApiKey ? 'basic' : 'ai'));
    };
    void bridge.getSnapshot().then(receive).catch(() => setError('无法连接应用，请重新打开。'));
    const unsubscribe = bridge.subscribe(receive);
    const releaseCapture = !overlay && !isPreview ? installCapture(bridge) : () => {};
    const releaseSounds = !overlay && !isPreview ? installInteractionSounds(bridge) : () => {};
    return () => { live = false; unsubscribe(); releaseCapture(); releaseSounds(); clearTimeout(toastTimer.current); };
  }, [overlay]);
  const run: RunAction = async action => {
    try {
      const result = await bridge.dispatch(action);
      clearTimeout(toastTimer.current);
      if (!result.ok || (result.message && !action.type.startsWith('dictation.'))) {
        setError(action.type.startsWith('dictation.') ? action.type === 'dictation.copy' ? '复制失败，请重试。' : '听写未完成，请查看上方提示。' : result.message || '操作未完成，请重试。');
        toastTimer.current = setTimeout(() => setError(''), 6000);
      } else setError('');
      return result.ok;
    } catch {
      setError('连接中断，请重试。');
      return false;
    }
  };
  const openSettings = (next: SettingsTab) => {
    setTab(next);
    requestAnimationFrame(() => document.getElementById(`settings-tab-${next}`)?.focus());
  };
  if (!snapshot) return overlay ? null : <div className="loading"><Busy /><p>{error || '正在打开 Typeless…'}</p></div>;
  if (overlay) return <VoiceOverlay snapshot={snapshot} run={run} />;
  return <div className="app-shell">
    <header className="app-header"><h1>Typeless<span>AI 语音输入</span></h1><span className="app-version">{snapshot.version}</span></header>
    {isPreview && <div className="preview-banner">界面预览 · 不调用模型或保存密钥</div>}
    <main>
      <DictationPanel snapshot={snapshot} run={run} openSettings={openSettings} />
      <Settings snapshot={snapshot} run={run} tab={tab || 'ai'} onTabChange={setTab} />
    </main>
    {error && <div className="toast" role="alert"><span>{error}</span><button aria-label="关闭提示" onClick={() => setError('')}><X size={15} /></button></div>}
  </div>;
}

createRoot(document.getElementById('root')!).render(<App />);
