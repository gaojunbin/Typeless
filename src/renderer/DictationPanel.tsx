import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Mic, Square, TriangleAlert, X } from 'lucide-react';
import type { AppSnapshot } from '../shared/contracts';
import type { RunAction, SettingsTab } from './settings/types';
import { Busy, Card, clockText, KeyChips, Segmented, sessionLabelKeys, Wave } from './ui';
import { useI18n } from './i18n';
import { recoveryMessage, recoverySettings, warningMessage } from './sessionPresentation';

export function DictationPanel({ snapshot, run, openSettings }: { snapshot: AppSnapshot; run: RunAction; openSettings: (tab: SettingsTab) => void }) {
  const { session, settings, permissions } = snapshot;
  const { t, language } = useI18n();
  const [source, setSource] = useState<'result' | 'raw'>('result');
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const recording = session.status === 'recording';
  const waiting = ['arming', 'transcribing', 'polishing', 'inserting'].includes(session.status);
  const active = recording || waiting;
  const configured = settings.asr.hasApiKey && Boolean(settings.asr.model.trim());
  const shortcut = settings.shortcut.primary.toLowerCase() === 'disabled' ? settings.shortcut.fallback : settings.shortcut.primary;
  const available = settings.shortcut.primary.toLowerCase() === 'disabled' ? permissions.fallbackShortcutAvailable : permissions.primaryShortcutAvailable;
  const label = active ? t(sessionLabelKeys[session.status]) : t(configured ? 'home.dictation.readyTitle' : 'home.dictation.setupTitle');
  const instruction = t(!configured ? 'home.dictation.setupHint'
    : !available ? 'home.dictation.shortcutUnavailable'
    : settings.general.autoInsert ? 'home.dictation.finishPaste' : 'home.dictation.finishCopy');
  const recover = session.status === 'error' && !(configured && session.errorCode === 'provider_not_configured');
  const showResult = !active && Boolean(session.text || session.rawText);
  const different = Boolean(session.rawText && session.text && session.rawText !== session.text);
  const visibleSource = different ? source : 'result';
  const visibleText = visibleSource === 'raw' ? session.rawText : session.text || session.rawText;
  const currentCopy = useRef('');
  currentCopy.current = `${session.id}:${visibleSource}:${visibleText}`;
  const problemTab = recoverySettings(session);
  const warning = warningMessage(session, language);
  const sources = [{ value: 'result', label: t('home.dictation.polished') }, { value: 'raw', label: t('home.dictation.raw') }] as const;
  const tabLabel = (tab: SettingsTab) => t(tab === 'ai' ? 'common.page.ai' : 'common.page.basic');
  useEffect(() => { setSource('result'); }, [session.id]);
  useEffect(() => {
    setCopied(false); clearTimeout(copyTimer.current);
    return () => clearTimeout(copyTimer.current);
  }, [session.id, visibleSource, visibleText, active]);
  async function copy() {
    const identity = currentCopy.current;
    setCopying(true);
    try {
      if (await run({ type: 'dictation.copy', source: visibleSource }) && currentCopy.current === identity) {
        setCopied(true); clearTimeout(copyTimer.current);
        copyTimer.current = setTimeout(() => setCopied(false), 1800);
      }
    } finally { setCopying(false); }
  }
  return <section className="dictation-panel" aria-label={t('home.dictation.region')}>
    <Card tone="raised" className="dictation-card">
      <div className="dictation-row">
        <div className={`dictation-icon ${recording ? 'recording' : ''}`.trim()} aria-hidden="true">{waiting ? <Busy size={20} /> : <Mic size={22} strokeWidth={1.5} />}</div>
        <div className="dictation-heading">
          <h2>{label}</h2>
          <p>{recording ? t('home.dictation.listening', { time: clockText(session.durationMs) }) : instruction}{configured && !active && !available && <> <button type="button" className="text-button" onClick={() => openSettings('basic')}>{t('common.page.basic')}</button></>}</p>
        </div>
        <div className="dictation-controls">
          {!active && configured && <KeyChips binding={shortcut} mac={snapshot.platform === 'darwin'} size="keycap" />}
          <button type="button" className="primary record-button" disabled={waiting} onClick={() => { if (!configured && !recording) openSettings('ai'); else void run({ type: 'dictation.toggle' }); }}>
            {recording && <Square size={12} fill="currentColor" />}{t(recording ? 'home.dictation.stop' : waiting ? 'home.dictation.processing' : configured ? 'home.dictation.start' : 'home.dictation.configure')}
          </button>
          {active && <button type="button" className="icon-button" aria-label={t('home.dictation.cancel')} onClick={() => { void run({ type: 'dictation.cancel' }); }}><X size={17} /></button>}
        </div>
      </div>
      {recording && <div className="panel-wave"><Wave active level={session.level} bars={48} /></div>}
    </Card>
    {recover && <div className="card muted inline-alert" role="alert">
      <TriangleAlert size={18} aria-hidden="true" />
      <span>{recoveryMessage(session, language)}</span>
      <div className="alert-actions">
        {problemTab && <button type="button" className="secondary small" onClick={() => openSettings(problemTab)}>{tabLabel(problemTab)}</button>}
        {session.canRetry && <button type="button" className="text-button" onClick={() => { void run({ type: 'dictation.retry' }); }}>{t('common.retry')}</button>}
      </div>
    </div>}
    {showResult && <Card className="result-card">
      <div className="result-header">
        {different ? <Segmented options={sources} value={visibleSource} onChange={setSource} ariaLabel={t('home.dictation.viewLabel')} /> : <span className="result-label">{t('home.dictation.thisSession')}</span>}
        <button type="button" className={`icon-button ${copied ? 'with-label' : ''}`.trim()} disabled={copying} aria-label={t(copied ? 'common.copied' : 'home.dictation.copy')} onClick={() => { void copy(); }}>{copied ? <><Check size={15} /><span>{t('common.copied')}</span></> : <Copy size={15} />}</button>
      </div>
      <p className="result-text">{visibleText}</p>
      {warning && <p className="result-note">{warning}{!recover && problemTab && <> <button type="button" className="text-button" onClick={() => openSettings(problemTab)}>{tabLabel(problemTab)}</button></>}</p>}
    </Card>}
  </section>;
}
