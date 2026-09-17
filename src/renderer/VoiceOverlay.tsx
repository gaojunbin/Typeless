import type { AppSnapshot } from '../shared/contracts';
import { Wave } from './ui';
import { recoveryMessage } from './sessionPresentation';

export function VoiceOverlay({ snapshot }: { snapshot: AppSnapshot }) {
  const { session } = snapshot;
  if (session.practice) return null;
  const recording = session.status === 'recording';
  const processing = ['transcribing', 'polishing', 'inserting'].includes(session.status);
  if (recording || processing) return <div className="voice-pill" role="status" aria-live="polite" aria-label={recording ? '正在录音' : '正在处理'}>
    {recording ? <Wave active level={session.level} /> : <div className="voice-loading" aria-hidden="true"><i /><i /><i /></div>}
  </div>;
  const delivered = session.copied || session.delivery === 'copied' || session.delivery === 'confirmed' || session.delivery === 'dispatched';
  const recovery = session.status === 'error' || (session.status === 'ready' && !delivered);
  return recovery ? <div className="voice-recovery" role="alert">{recoveryMessage(session)}</div> : null;
}
