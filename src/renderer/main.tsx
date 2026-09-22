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
import { BasicSettings } from './settings/Preferences';
import type { Page, RunAction, SettingsTab } from './settings/types';
import { Busy } from './ui';
import { documentLanguage, I18nProvider, translate, type MessageKey } from './i18n';
import { VoiceOverlay } from './VoiceOverlay';
import { Sidebar } from './Sidebar';
import { Home } from './Home';
import { SetupGuide } from './onboarding/SetupGuide';

/** A toast is either a message key, translated when rendered, or literal text that came from the main process. */
type Toast = { key: MessageKey } | { text: string } | null;

function App() {
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [page, setPage] = useState<Page | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastFailure = useRef('');
  const setupDone = useRef<boolean | undefined>(undefined);
  const overlay = location.hash === '#overlay';
  useEffect(() => {
    document.body.classList.toggle('overlay-body', overlay);
    let live = true;
    const receive = (value: AppSnapshot) => {
      if (!live) return;
      setSnapshot(value);
      // The setup guide owns the window until it completes; leaving it re-applies the initial page rule.
      const completed = value.settings.general.setupCompleted;
      const left = setupDone.current === false && completed;
      setupDone.current = completed;
      if (completed) setPage(current => (current && !left ? current : value.settings.asr.hasApiKey ? 'home' : 'ai'));
      // The recovery alert lives on the Home page, so a newly failed dictation brings that page forward.
      const failure = value.session.status === 'error' ? `${value.session.id}:${value.session.errorCode}:${value.session.error}` : '';
      if (failure && failure !== lastFailure.current) setPage('home');
      lastFailure.current = failure;
    };
    void bridge.getSnapshot().then(receive).catch(() => setToast({ key: 'common.shell.connectFailed' }));
    const unsubscribe = bridge.subscribe(receive);
    const releaseCapture = !overlay && !isPreview ? installCapture(bridge) : () => {};
    const releaseSounds = !overlay && !isPreview ? installInteractionSounds(bridge) : () => {};
    return () => { live = false; unsubscribe(); releaseCapture(); releaseSounds(); clearTimeout(toastTimer.current); };
  }, [overlay]);
  const platform = snapshot?.platform;
  useEffect(() => { if (platform) document.body.dataset.platform = platform; }, [platform]);
  const language = snapshot?.settings.general.language ?? 'zh';
  useEffect(() => { document.documentElement.lang = documentLanguage(language); }, [language]);
  const run: RunAction = async action => {
    try {
      const result = await bridge.dispatch(action);
      clearTimeout(toastTimer.current);
      if (!result.ok || (result.message && !action.type.startsWith('dictation.'))) {
        setToast(action.type.startsWith('dictation.')
          ? { key: action.type === 'dictation.copy' ? 'common.shell.copyFailed' : 'common.shell.dictationIncomplete' }
          : result.message ? { text: result.message } : { key: 'common.shell.actionFailed' });
        toastTimer.current = setTimeout(() => setToast(null), 6000);
      } else setToast(null);
      return result.ok;
    } catch {
      setToast({ key: 'common.shell.connectionLost' });
      return false;
    }
  };
  const openSettings = (next: SettingsTab) => {
    setPage(next);
    requestAnimationFrame(() => document.getElementById(`settings-tab-${next}`)?.focus());
  };
  const toastText = toast ? ('key' in toast ? translate(language, toast.key) : toast.text) : '';
  if (!snapshot) return overlay ? null : <div className="loading"><Busy /><p>{toastText || translate(language, 'common.shell.opening')}</p></div>;
  if (overlay) return <I18nProvider language={language}><VoiceOverlay snapshot={snapshot} run={run} /></I18nProvider>;
  const toastNode = toastText
    ? <div className="toast" role="alert"><CircleAlert size={18} aria-hidden="true" /><span>{toastText}</span><button type="button" className="icon-button" aria-label={translate(language, 'common.shell.dismiss')} onClick={() => setToast(null)}><X size={15} /></button></div>
    : null;
  if (!snapshot.settings.general.setupCompleted) return <I18nProvider language={language}><SetupGuide snapshot={snapshot} run={run} />{toastNode}</I18nProvider>;
  const current: Page = page ?? 'home';
  return <I18nProvider language={language}>
    <div className="app-shell">
      <Sidebar page={current} onNavigate={setPage} snapshot={snapshot} />
      <main className="content">
        <div className="content-inner">
          {isPreview && <p className="preview-banner">{translate(language, 'common.shell.previewBanner')}</p>}
          <div key={current} className={`page ${current === 'home' ? 'page-home' : ''}`.trim()} role="tabpanel" id={`settings-panel-${current}`} aria-labelledby={`settings-tab-${current}`}>
            {current === 'home' ? <Home snapshot={snapshot} run={run} openSettings={openSettings} />
              : current === 'ai' ? <Providers snapshot={snapshot} run={run} />
              : <BasicSettings snapshot={snapshot} run={run} />}
          </div>
        </div>
      </main>
      {toastNode}
    </div>
  </I18nProvider>;
}

createRoot(document.getElementById('root')!).render(<App />);
