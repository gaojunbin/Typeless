import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Mic, Square, X } from 'lucide-react';
import type { AppSnapshot } from '../shared/contracts';
import type { RunAction, SettingsTab } from './Settings';
import { Busy, clockText, sessionLabels, Wave } from './ui';
import { recoveryMessage, recoverySettings, warningMessage } from './sessionPresentation';
import { shortcutLabel } from './shortcutPresentation';

export function DictationPanel({ snapshot, run, openSettings }: { snapshot: AppSnapshot; run: RunAction; openSettings: (tab: SettingsTab) => void }) {
  const { session, settings, permissions } = snapshot;
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
  const label = active ? sessionLabels[session.status] : configured ? '随时开口，直接输入' : '先连接你的 AI 模型';
  const instruction = !configured ? '配置语音识别，文字润色按需开启。'
    : !available ? '快捷键暂不可用，可点击按钮听写。'
    : settings.general.autoInsert ? '再按一次结束，文字自动复制并粘贴。' : '再按一次结束，文字自动复制。';
  const recover = session.status === 'error' && !(configured && session.errorCode === 'provider_not_configured');
  const showResult = !active && Boolean(session.text || session.rawText);
  const different = Boolean(session.rawText && session.text && session.rawText !== session.text);
  const visibleSource = different ? source : 'result';
  const visibleText = visibleSource === 'raw' ? session.rawText : session.text || session.rawText;
  const currentCopy = useRef('');
  currentCopy.current = `${session.id}:${visibleSource}:${visibleText}`;
  const problemTab = recoverySettings(session);
  const warning = warningMessage(session);
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
  return <section className="dictation-panel" aria-label="听写">
    <div className="dictation-row">
      <div className={`dictation-icon ${recording ? 'recording' : ''}`} aria-hidden="true">{waiting ? <Busy /> : <Mic size={21} strokeWidth={1.6} />}</div>
      <div className="dictation-heading"><h2>{label}</h2><p>{recording ? `正在聆听 · ${clockText(session.durationMs)}` : instruction}{configured && !active && !available && <> <button type="button" className="text-button" onClick={() => openSettings('basic')}>基本设置</button></>}</p></div>
      <div className="dictation-controls">
        {!active && configured && <kbd>{shortcutLabel(shortcut, snapshot.platform === 'darwin')}</kbd>}
        <button type="button" className="primary record-button" disabled={waiting} onClick={() => { if (!configured && !recording) openSettings('ai'); else void run({ type: 'dictation.toggle' }); }}>
          {recording && <Square size={12} fill="currentColor" />}{recording ? '结束听写' : waiting ? '处理中' : configured ? '开始听写' : '配置语音'}
        </button>
        {active && <button type="button" className="icon-button" aria-label="取消听写" onClick={() => { void run({ type: 'dictation.cancel' }); }}><X size={17} /></button>}
      </div>
    </div>
    {recording && <div className="panel-wave"><Wave active level={session.level} /></div>}
    {recover && <div className="inline-error" role="alert"><span>{recoveryMessage(session)}</span>{problemTab && <button type="button" className="text-button" onClick={() => openSettings(problemTab)}>{problemTab === 'ai' ? 'AI 配置' : '基本设置'}</button>}{session.canRetry && <button type="button" className="text-button" onClick={() => { void run({ type: 'dictation.retry' }); }}>重试</button>}</div>}
    {showResult && <div className="latest-result"><div className="result-heading">
      {different ? <div className="result-view" role="group" aria-label="听写结果视图"><button type="button" aria-pressed={visibleSource === 'result'} onClick={() => setSource('result')}>整理后</button><button type="button" aria-pressed={visibleSource === 'raw'} onClick={() => setSource('raw')}>原文</button></div> : <span>本次听写</span>}
      <button type="button" className="icon-button" disabled={copying} aria-label={copied ? '已复制' : '复制本次听写'} onClick={() => { void copy(); }}>{copied ? <><Check size={15} /><span>已复制</span></> : <Copy size={15} />}</button>
    </div><p className="result-text">{visibleText}</p>{warning && <p className="result-note">{warning}{!recover && problemTab && <> <button type="button" className="text-button" onClick={() => openSettings(problemTab)}>{problemTab === 'ai' ? 'AI 配置' : '基本设置'}</button></>}</p>}</div>}
  </section>;
}
