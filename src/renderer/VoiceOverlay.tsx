import { Check, CircleAlert, X } from 'lucide-react';
import type { AppSnapshot } from '../shared/contracts';
import type { RunAction } from './settings/types';
import { recoveryMessage } from './sessionPresentation';
import './styles/overlay.css';

/** Symmetric end-fade window: the outer bars stay near the minimum, as in the official waveform. */
const endFade = [.15, .4, .75, .95, 1, 1, .95, .75, .4, .15];
const barMinimum = 3;
const barTravel = 27;
const countdownWindowMs = 10_000;

/** Ten white bars, 3px wide with a 3px gap, growing symmetrically from a 3px dot to 30px. */
function CapsuleWave({ level }: { level: number }) {
  const amplitude = Math.max(0, Math.min(1, level));
  return <div className="wave active" aria-hidden="true">
    {endFade.map((weight, index) => {
      const shaped = amplitude * weight * (Math.sin(index * 2.3) + 1.3) / 2.3;
      return <i key={index} style={{ height: `${barMinimum + shaped * barTravel}px` }} />;
    })}
  </div>;
}

/** Remaining recording time as m:ss, rounded up so the last visible tick is 0:01. */
function remainingText(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export function VoiceOverlay({ snapshot, run }: { snapshot: AppSnapshot; run: RunAction }) {
  const { session } = snapshot;
  const recording = session.status === 'recording';
  const processing = ['transcribing', 'polishing', 'inserting'].includes(session.status);
  if (recording || processing) {
    const remainingMs = snapshot.settings.audio.maxDurationSeconds * 1000 - session.durationMs;
    const counting = recording && remainingMs <= countdownWindowMs;
    return <div
      className={`voice-pill ${processing ? 'processing' : ''} ${counting ? 'counting' : ''}`.trim()}
      role="status"
      aria-live="polite"
      aria-label={recording ? '正在录音' : '正在处理'}
    >
      <button type="button" className="voice-control voice-cancel" aria-label="取消听写" onMouseDown={event => event.preventDefault()} onClick={() => { void run({ type: 'dictation.cancel' }); }}><X size={16} strokeWidth={2.5} /></button>
      {recording ? <CapsuleWave level={session.level} /> : <div className="voice-loading"><span className="voice-label">思考中</span><i className="voice-wash" /></div>}
      {counting && <span className="voice-timer">{remainingText(remainingMs)}</span>}
      {recording && <button type="button" className="voice-control voice-finish" aria-label="完成听写" onMouseDown={event => event.preventDefault()} onClick={() => { void run({ type: 'dictation.toggle' }); }}><Check size={16} strokeWidth={2.5} /></button>}
    </div>;
  }
  const delivered = session.copied || session.delivery === 'copied' || session.delivery === 'confirmed' || session.delivery === 'dispatched';
  const configurationResolved = session.errorCode === 'provider_not_configured' && snapshot.settings.asr.hasApiKey && Boolean(snapshot.settings.asr.model.trim());
  const recovery = (session.status === 'error' && !configurationResolved) || (session.status === 'ready' && !delivered);
  if (!recovery) return null;
  const message = recoveryMessage(session);
  return <button type="button" className="voice-recovery" aria-label="查看听写问题" title={message} onMouseDown={event => event.preventDefault()} onClick={() => { void run({ type: 'window.show' }); }}>
    <CircleAlert size={16} aria-hidden="true" />
    <span>{message}</span>
  </button>;
}
