import { Check, X } from 'lucide-react';
import type { AppSnapshot } from '../shared/contracts';
import type { RunAction } from './Settings';
import { Wave } from './ui';
import { recoveryMessage } from './sessionPresentation';

export function VoiceOverlay({ snapshot, run }: { snapshot: AppSnapshot; run: RunAction }) {
  const { session } = snapshot;
  const recording = session.status === 'recording';
  const processing = ['transcribing', 'polishing', 'inserting'].includes(session.status);
  if (recording || processing) return <div className="voice-pill" role="status" aria-live="polite" aria-label={recording ? '正在录音' : '正在处理'}>
    <button type="button" className="voice-control voice-cancel" aria-label="取消听写" onMouseDown={event => event.preventDefault()} onClick={() => { void run({ type: 'dictation.cancel' }); }}><X size={13} /></button>
    {recording ? <Wave active level={session.level} /> : <div className="voice-loading" aria-hidden="true"><i /><i /><i /></div>}
    {recording && <button type="button" className="voice-control voice-finish" aria-label="完成听写" onMouseDown={event => event.preventDefault()} onClick={() => { void run({ type: 'dictation.toggle' }); }}><Check size={13} /></button>}
  </div>;
  const delivered = session.copied || session.delivery === 'copied' || session.delivery === 'confirmed' || session.delivery === 'dispatched';
  const configurationResolved = session.errorCode === 'provider_not_configured' && snapshot.settings.asr.hasApiKey && Boolean(snapshot.settings.asr.model.trim());
  const recovery = (session.status === 'error' && !configurationResolved) || (session.status === 'ready' && !delivered);
  return recovery ? <button type="button" className="voice-recovery" aria-label="查看听写问题" title={recoveryMessage(session)} onMouseDown={event => event.preventDefault()} onClick={() => { void run({ type: 'window.show' }); }}>{recoveryMessage(session)}</button> : null;
}
