import { useState } from 'react';
import type { AppSnapshot, DictationMode } from '../shared/contracts';
import type { RunAction } from './Settings';
import { Busy, Wave, clockText, sessionLabels } from './ui';
import { writingLevel, writingLevels } from './writingPresentation';
import { deliveryMessage, recoveryMessage } from './sessionPresentation';

export function HomePage({ snapshot, run, openSettings, openWritingSettings, openShortcutSettings }: { snapshot: AppSnapshot; run: RunAction; openSettings: () => void; openWritingSettings: () => void; openShortcutSettings: () => void }) {
  const { session, settings } = snapshot;
  const [mode, setMode] = useState<DictationMode>('dictate');
  const [practiceCapture, setPracticeCapture] = useState(true);
  const [practiceText, setPracticeText] = useState('');
  const recording = session.status === 'recording';
  const arming = session.status === 'arming';
  const processing = session.status === 'transcribing' || session.status === 'polishing' || session.status === 'inserting';
  const active = recording || arming || processing;
  const deliveryAttempted = session.inserted || ['pending', 'confirmed', 'dispatched'].includes(session.delivery || 'none') || (session.delivery === 'copied' && Boolean(session.errorCode));
  const activeMode = active ? session.mode : mode;
  const configured = settings.asr.hasApiKey && Boolean(settings.asr.model.trim());
  const textConfigured = settings.cleanup.hasApiKey && Boolean(settings.cleanup.model.trim());
  const writingLabel = writingLevels.find(level => level.value === writingLevel(settings))?.label;
  const shortcut = settings.shortcut.primary.toLowerCase() === 'disabled'
    ? settings.shortcut.fallback
    : settings.shortcut.primary || (snapshot.platform === 'win32' ? 'Right Alt' : 'Fn');
  const primaryEnabled = settings.shortcut.primary.toLowerCase() !== 'disabled';
  const primaryUnavailable = configured && !active && primaryEnabled && !snapshot.permissions.primaryShortcutAvailable;
  const outputLocation = active
    ? session.practice || !settings.general.autoInsert ? '完成后自动复制，可在任意应用粘贴。' : '完成后自动复制，并尝试粘贴到当前应用。'
    : practiceCapture || !settings.general.autoInsert ? '完成后自动复制，可在任意应用粘贴。' : '完成后自动复制，并尝试粘贴到当前应用。';
  const remaining = Math.max(0, Math.ceil(settings.audio.maxDurationSeconds - session.durationMs / 1000));

  return <div className="home-page">
    <section className="dictation-space" aria-labelledby="dictation-title">
      <h1 id="dictation-title">想说什么？</h1>
      <p className="home-subtitle">说完后，再按一次结束。</p>
      <div className="capture-stage">
        {recording && <div className="live-capture"><Wave active level={session.level} /><span className="recording-time">{clockText(session.durationMs)}</span></div>}
        {active && <p className="capture-status" role="status">{sessionLabels[session.status]}{activeMode === 'translate' ? ` · 翻译为${settings.writing.translationTarget}` : ''}</p>}
        <div className="record-controls">
          <button className="record-button" disabled={processing || arming} onClick={() => { if (!configured && !recording) { openSettings(); return; } void run(recording ? { type: 'dictation.toggle' } : { type: 'dictation.toggle', mode, practice: practiceCapture }); }}>
            {(processing || arming) && <Busy />}
            {recording ? '结束录音' : processing ? '正在处理' : arming ? '连接中' : !configured ? '连接模型服务' : '开始说话'}
          </button>
          {active && <button className="text-button" onClick={() => { void run({ type: 'dictation.cancel' }); }}>取消</button>}
        </div>
        {recording && remaining < 30 && <p className="warning-text">还可录制 {remaining} 秒</p>}
        {(configured || active) && <><p className="shortcut-hint"><kbd>{shortcut.replace(/^RightAlt$/i, 'Right Alt')}</kbd><span>按一下开始，再按一下结束</span></p>
        {primaryUnavailable && <button className="text-button" onClick={openShortcutSettings}>{shortcut.replace(/^RightAlt$/i, 'Right Alt')} 暂不可用，可用{snapshot.permissions.fallbackShortcutAvailable ? `${settings.shortcut.fallback} 或` : ''}按钮录音</button>}
        <p className="output-location">{outputLocation}</p></>}
        {!configured && !active && <p className="setup-line">配置语音模型后，即可开始。</p>}
        <button className="text-button writing-shortcut" disabled={active} onClick={openWritingSettings} aria-label={`润色程度：${writingLabel}，打开设置`}>{writingLabel}</button>
        {writingLevel(settings) !== 'none' && !textConfigured && configured && !active && <p className="raw-mode-note">未配置文字模型，将保留识别原文。</p>}
      </div>
    </section>

    {(session.error || session.warning) && <div className={session.error ? 'error-banner' : 'notice'} role="alert">
      <span>{recoveryMessage(session)}</span>
      {session.status === 'error' && (!session.errorCode || Boolean(session.rawText)) && <button onClick={() => { void run({ type: 'dictation.retry' }); }}>重试上一次</button>}
    </div>}

    {(session.text || session.rawText) && <section className="result-card" aria-labelledby="result-title">
      <div className="section-title"><h2 id="result-title">结果</h2><button className="primary" disabled={active} onClick={() => { void run({ type: 'dictation.copy' }); }}>复制结果</button></div>
      <p className="result-text">{session.text || session.rawText}</p>
      <p className="muted">{deliveryMessage(session)}</p>
      <details className="result-details"><summary>原文与更多操作</summary>
        <p className="raw-text">{session.rawText || '没有可用的识别原文。'}</p>
        <div className="row-actions">
          <button disabled={active || deliveryAttempted || !session.rawText} onClick={() => { void run({ type: 'dictation.useRaw' }); }}>使用原文</button>
          <button disabled={active || deliveryAttempted} onClick={() => { void run({ type: 'dictation.retry' }); }}>重试</button>
        </div>
      </details>
    </section>}

    <details className="home-disclosure"><summary>录音选项</summary>
      <fieldset disabled={active} className="recording-options">
        <div className="field"><span id="mode-label">输出方式</span><div className="mode-switch" role="group" aria-labelledby="mode-label">
          <button className={mode === 'dictate' ? 'selected' : ''} aria-pressed={mode === 'dictate'} onClick={() => setMode('dictate')}>口述</button>
          <button className={mode === 'translate' ? 'selected' : ''} aria-pressed={mode === 'translate'} disabled={!textConfigured} onClick={() => setMode('translate')}>翻译为{settings.writing.translationTarget}</button>
        </div></div>
        <label className="practice-toggle"><input type="checkbox" checked={practiceCapture} onChange={event => setPracticeCapture(event.target.checked)} /><span>练习模式<span className="muted">完成后自动复制，不自动粘贴</span></span></label>
        <p className="muted">全局快捷键使用设置中的自动粘贴选项。</p>
      </fieldset>
    </details>
    <details className="home-disclosure"><summary>文字整理</summary>
      <div className="text-practice"><label className="field"><span>粘贴文字，试试整理效果</span><textarea value={practiceText} onChange={event => setPracticeText(event.target.value)} placeholder="输入一段需要整理的文字…" /></label>
        <div className="practice-footer"><span className="muted">处理后自动复制，结果也保留在本页</span><button disabled={!practiceText.trim() || active} onClick={() => { void run({ type: 'text.process', text: practiceText, mode }); }}>{mode === 'translate' ? '整理并翻译' : writingLevel(settings) === 'none' ? '复制原文' : '润色文字'}</button></div>
      </div>
    </details>
  </div>;
}
