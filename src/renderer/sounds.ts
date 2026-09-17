import type { DictationSession, TypelessBridge } from '../shared/contracts';

type CaptureState = Pick<DictationSession, 'id' | 'status'>;
export function recordingCue(previous: CaptureState | undefined, next: CaptureState, enabled: boolean): 'start' | 'stop' | undefined {
  if (!previous || !enabled || previous.id !== next.id) return;
  if (previous.status !== 'recording' && next.status === 'recording') return 'start';
  if (previous.status === 'recording' && next.status !== 'recording') return 'stop';
}

export function installInteractionSounds(bridge: TypelessBridge): () => void {
  let previous: CaptureState | undefined;
  let disposed = false;
  const contexts = new Set<AudioContext>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  function play(cue: 'start' | 'stop') {
    let context: AudioContext;
    try { context = new AudioContext(); } catch { return; }
    contexts.add(context);
    const close = () => {
      if (!contexts.delete(context)) return;
      void context.close().catch(() => {});
    };
    const timer = setTimeout(() => { timers.delete(timer); close(); }, 500);
    timers.add(timer);
    void context.resume().then(() => {
      if (disposed || !contexts.has(context) || context.state !== 'running') { close(); return; }
      const oscillator = context.createOscillator(); const gain = context.createGain();
      const now = context.currentTime;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(cue === 'start' ? 660 : 520, now);
      oscillator.frequency.exponentialRampToValueAtTime(cue === 'start' ? 880 : 390, now + 0.085);
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.035, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); close(); };
      oscillator.start(now); oscillator.stop(now + 0.1);
    }).catch(close);
  }
  const unsubscribe = bridge.subscribe(snapshot => {
    const cue = recordingCue(previous, snapshot.session, snapshot.settings.audio.interactionSounds);
    previous = { id: snapshot.session.id, status: snapshot.session.status };
    if (cue) play(cue);
  });
  return () => { disposed = true; unsubscribe(); timers.forEach(clearTimeout); timers.clear(); contexts.forEach(context => { void context.close().catch(() => {}); }); contexts.clear(); };
}
