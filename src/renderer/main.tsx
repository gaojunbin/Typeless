import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { X } from 'lucide-react';
import type { AppSnapshot } from '../shared/contracts';
import { bridge, isPreview } from './bridge';
import { installCapture } from './audio';
import { installInteractionSounds } from './sounds';
import { Settings, type RunAction, type SettingsTab } from './Settings';
import { Library, History, type LibraryPage } from './Library';
import { Busy } from './ui';
import { VoiceOverlay } from './VoiceOverlay';
import { HomePage } from './Home';
import './styles.css';

type Page = 'home' | 'history' | LibraryPage | 'settings';

function App() {
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null); const [page, setPage] = useState<Page>('home'); const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('providers');
  function openSettings(tab: SettingsTab = 'providers') { setSettingsTab(tab); setPage('settings'); }
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined); const overlay = location.hash === '#overlay';
  useEffect(() => { document.body.classList.toggle('overlay-body', overlay); let live = true; void bridge.getSnapshot().then(value => { if (live) setSnapshot(value); }).catch(error => setToast({ text: String(error), error: true })); const unsubscribe = bridge.subscribe(value => setSnapshot(value)); const release = !overlay && !isPreview ? installCapture(bridge) : () => {}; const releaseSounds = !overlay && !isPreview ? installInteractionSounds(bridge) : () => {}; return () => { live = false; unsubscribe(); release(); releaseSounds(); clearTimeout(toastTimer.current); }; }, [overlay]);
  const run: RunAction = async action => {
    try {
      const result = await bridge.dispatch(action);
      if (result.text && (action.type === 'dictionary.export' || action.type === 'history.export')) {
        const csv = action.type === 'dictionary.export'; const url = URL.createObjectURL(new Blob([result.text], { type: csv ? 'text/csv;charset=utf-8' : 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = `typeless-${csv ? 'dictionary.csv' : 'history.json'}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      if (result.message || !result.ok) { clearTimeout(toastTimer.current); setToast({ text: result.message || '操作未完成，请重试。', error: !result.ok }); toastTimer.current = setTimeout(() => setToast(null), 6500); }
      return result.ok;
    } catch (error) { setToast({ text: error instanceof Error ? error.message : '操作失败。', error: true }); return false; }
  };
  if (!snapshot && overlay) return null;
  if (!snapshot) return <div className="loading"><Busy /><p>正在打开 Typeless…</p>{toast && <p>{toast.text}</p>}</div>;
  if (overlay) return <VoiceOverlay snapshot={snapshot} />;
  const personalizing = page === 'dictionary' || page === 'memory' || page === 'profiles';
  const libraryTabs: { id: LibraryPage; name: string }[] = [
    { id: 'dictionary', name: '词典' }, { id: 'memory', name: '记忆' }, { id: 'profiles', name: '应用风格' },
  ];
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand">Typeless</div>
      <nav aria-label="主导航">
        <button className={`nav-item ${page === 'home' ? 'selected' : ''}`} aria-current={page === 'home' ? 'page' : undefined} onClick={() => setPage('home')}>语音输入</button>
        <button className={`nav-item ${page === 'history' ? 'selected' : ''}`} aria-current={page === 'history' ? 'page' : undefined} onClick={() => setPage('history')}>历史记录</button>
        <button className={`nav-item ${personalizing ? 'selected' : ''}`} aria-current={personalizing ? 'page' : undefined} onClick={() => { if (!personalizing) setPage('dictionary'); }}>个性化</button>
      </nav>
      <div className="sidebar-bottom"><button className={`nav-item ${page === 'settings' ? 'selected' : ''}`} aria-current={page === 'settings' ? 'page' : undefined} onClick={() => openSettings()}>设置</button></div>
    </aside>
    <main className="main">
      {isPreview && <div className="preview-banner">界面预览 · 不执行真实转写，修改仅保留在当前页面。</div>}
      <div className="page-content">
        {personalizing && <nav className="settings-tabs personalization-tabs" aria-label="个性化分类">{libraryTabs.map(tab => <button key={tab.id} className={page === tab.id ? 'selected' : ''} aria-current={page === tab.id ? 'page' : undefined} onClick={() => setPage(tab.id)}>{tab.name}</button>)}</nav>}
        {page === 'home' ? <HomePage snapshot={snapshot} run={run} openSettings={() => openSettings()} openWritingSettings={() => openSettings('writing')} openShortcutSettings={() => openSettings('audio')} /> : page === 'settings' ? <Settings snapshot={snapshot} run={run} initialTab={settingsTab} /> : page === 'history' ? <History snapshot={snapshot} run={run} /> : <Library key={page} page={page} snapshot={snapshot} run={run} />}
      </div>
    </main>
    {toast && <div className={`toast ${toast.error ? 'error' : ''}`} role={toast.error ? 'alert' : 'status'}><span>{toast.text}</span><button aria-label="关闭提示" onClick={() => setToast(null)}><X size={16} /></button></div>}
  </div>;

}

createRoot(document.getElementById('root')!).render(<App />);
