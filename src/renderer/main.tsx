import './styles/tokens.css';
import './styles/base.css';
import './styles/shell.css';
import './styles/home.css';
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CircleAlert, X } from 'lucide-react';
import type { AppSnapshot } from '../shared/contracts';
import { bridge, isPreview } from './bridge';
import { installCapture } from './audio';
import { installInteractionSounds } from './sounds';
import { Providers } from './settings/Providers';
import { BasicSettings, WritingSettings } from './settings/Preferences';
import type { Page, RunAction, SettingsTab } from './settings/types';
import { Busy } from './ui';
import { VoiceOverlay } from './VoiceOverlay';
import { Sidebar } from './Sidebar';
import { Home } from './Home';

function App() {
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState<Page | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastFailure = useRef('');
  const overlay = location.hash === '#overlay';
  useEffect(() => {
    document.body.classList.toggle('overlay-body', overlay);
    let live = true;
    const receive = (value: AppSnapshot) => {
      if (!live) return;
      setSnapshot(value);
      setPage(current => current ?? (value.settings.asr.hasApiKey ? 'home' : 'ai'));
      // The recovery alert lives on the Home page, so a newly failed dictation brings that page forward.
      const failure = value.session.status === 'error' ? `${value.session.id}:${value.session.errorCode}:${value.session.error}` : '';
      if (failure && failure !== lastFailure.current) setPage('home');
      lastFailure.current = failure;
    };
    void bridge.getSnapshot().then(receive).catch(() => setError('无法连接应用，请重新打开。'));
    const unsubscribe = bridge.subscribe(receive);
    const releaseCapture = !overlay && !isPreview ? installCapture(bridge) : () => {};
    const releaseSounds = !overlay && !isPreview ? installInteractionSounds(bridge) : () => {};
    return () => { live = false; unsubscribe(); releaseCapture(); releaseSounds(); clearTimeout(toastTimer.current); };
  }, [overlay]);
  const platform = snapshot?.platform;
  useEffect(() => { if (platform) document.body.dataset.platform = platform; }, [platform]);
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
    setPage(next);
    requestAnimationFrame(() => document.getElementById(`settings-tab-${next}`)?.focus());
  };
  if (!snapshot) return overlay ? null : <div className="loading"><Busy /><p>{error || '正在打开 Typeless…'}</p></div>;
  if (overlay) return <VoiceOverlay snapshot={snapshot} run={run} />;
  const current: Page = page ?? 'home';
  return <div className="app-shell">
    <Sidebar page={current} onNavigate={setPage} snapshot={snapshot} />
    <main className="content">
      <div className="content-inner">
        {isPreview && <p className="preview-banner">界面预览 · 不调用模型或保存密钥</p>}
        <div key={current} className={`page ${current === 'home' ? 'page-home' : ''}`.trim()} role="tabpanel" id={`settings-panel-${current}`} aria-labelledby={`settings-tab-${current}`}>
          {current === 'home' ? <Home snapshot={snapshot} run={run} openSettings={openSettings} />
            : current === 'ai' ? <Providers snapshot={snapshot} run={run} />
            : current === 'basic' ? <BasicSettings snapshot={snapshot} run={run} />
            : <WritingSettings snapshot={snapshot} run={run} />}
        </div>
      </div>
    </main>
    {error && <div className="toast" role="alert"><CircleAlert size={18} aria-hidden="true" /><span>{error}</span><button type="button" className="icon-button" aria-label="关闭提示" onClick={() => setError('')}><X size={15} /></button></div>}
  </div>;
}

createRoot(document.getElementById('root')!).render(<App />);
