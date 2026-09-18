import { randomUUID } from 'node:crypto';
import type { AppSettings, CaptureCommand, CaptureEvent, DictationSession } from '../shared/contracts';
import { Store, bounded } from './store';
import { ProviderError, Providers } from './providers';
export interface SessionHost {
  capture(command: CaptureCommand): void;
  copy(text: string, signal?: AbortSignal): Promise<void>;
  paste(text: string, signal?: AbortSignal): Promise<{ ok: boolean; status?: string; message?: string; code?: string }>;
  changed(session: DictationSession): void;
}
export const idleSession = (): DictationSession => ({ id: '', status: 'idle', startedAt: 0, durationMs: 0, level: 0, rawText: '', text: '', inserted: false, canRetry: false, delivery: 'none', copied: false });
export class Sessions {
  session = idleSession();
  private abort = new AbortController();
  private audio?: Uint8Array;
  private consumed = false;
  private awaitingAudio = false;
  private expiry?: ReturnType<typeof setTimeout>;
  private generation = 0;
  private jobContext?: { state: { settings: AppSettings }; asrKey: string; cleanupKey: string };
  private snapshotContext() {
    const state = { settings: this.store.snapshot().settings };
    let asrKey = ''; let cleanupKey = '';
    try { asrKey = this.store.secret('asr'); } catch { /* The provider reports missing credentials. */ }
    try { cleanupKey = this.store.secret('cleanup'); } catch { /* Raw transcript remains available. */ }
    return { state, asrKey, cleanupKey };
  }
  constructor(private store: Store, private providers: Providers, private host: SessionHost) {}
  private emit() {
    this.session.canRetry = ['error', 'ready'].includes(this.session.status) && !this.consumed && Boolean(this.audio || this.session.rawText);
    this.host.changed(structuredClone(this.session));
  }
  private active(id: string, generation = this.generation) { return this.session.id === id && generation === this.generation && !this.abort.signal.aborted; }
  private begin() {
    this.abort.abort(); this.abort = new AbortController(); this.generation++; clearTimeout(this.expiry);
    this.jobContext = this.snapshotContext();
    this.audio = undefined; this.consumed = false; this.awaitingAudio = false;
    this.session = { ...idleSession(), id: randomUUID(), status: 'arming', startedAt: Date.now() }; this.emit();
  }
  async toggle() {
    if (this.session.status === 'arming') { this.cancel(); return; }
    if (this.session.status === 'recording') {
      if (this.awaitingAudio) return;
      this.awaitingAudio = true;
      this.session.status = 'transcribing'; this.session.level = 0; this.emit();
      this.host.capture({ type: 'stop', sessionId: this.session.id }); return;
    }
    if (['transcribing', 'polishing', 'inserting'].includes(this.session.status)) throw new Error('Please wait for processing or cancel the current dictation.');
    const settings = this.store.snapshot().settings;
    if (!settings.asr.hasApiKey || !settings.asr.model.trim()) {
      this.begin();
      const message = 'Configure the speech provider and API key before recording.';
      this.failStart('provider_not_configured', message);
      throw new Error(message);
    }
    this.begin(); const id = this.session.id;
    this.host.capture({ type: 'start', sessionId: id, deviceId: settings.audio.deviceId, maxDurationSeconds: settings.audio.maxDurationSeconds });
    this.expiry = setTimeout(() => { if (this.active(id) && ['recording', 'arming'].includes(this.session.status)) void this.toggle().catch(() => {}); }, (settings.audio.maxDurationSeconds + 2) * 1000);
  }
  private failStart(code: string, message: string) {
    this.jobContext = undefined;
    this.session.status = 'error'; this.session.errorCode = code.slice(0, 100); this.session.error = message.slice(0, 1000);
    this.emit();
  }
  cancel() {
    const id = this.session.id; this.abort.abort(); this.generation++; clearTimeout(this.expiry);
    this.audio = undefined; this.jobContext = undefined; this.awaitingAudio = false;
    this.host.capture({ type: 'cancel', sessionId: id });
    this.session.status = 'cancelled'; this.session.level = 0;
    if (this.session.delivery === 'pending') this.session.delivery = this.session.copied ? 'copied' : 'none';
    this.emit();
  }
  async capture(event: CaptureEvent) {
    if (!this.active(event.sessionId)) return;
    if (event.type === 'started') {
      if (this.session.status === 'arming') { this.session.status = 'recording'; this.emit(); }
      return;
    }
    if (event.type === 'level') {
      if (this.session.status === 'recording') { this.session.level = Math.max(0, Math.min(1, event.level)); this.session.durationMs = event.durationMs; this.emit(); }
      return;
    }
    if (event.type === 'error') {
      if (!['arming', 'recording', 'transcribing'].includes(this.session.status)) return;
      const message = bounded(event.message, 1000);
      this.abort.abort(); this.generation++; clearTimeout(this.expiry);
      this.audio = undefined; this.jobContext = undefined; this.awaitingAudio = false;
      this.host.capture({ type: 'cancel', sessionId: event.sessionId });
      this.session.status = 'error'; this.session.level = 0; this.session.errorCode = event.code; this.session.error = message; this.emit(); return;
    }
    if (!['recording', 'transcribing', 'arming'].includes(this.session.status) || this.audio) return;
    if (!(event.audio instanceof Uint8Array) || event.audio.byteLength > 6750000 || !Number.isFinite(event.durationMs) || event.durationMs <= 0 || event.durationMs > 122000) throw new Error('Invalid captured audio.');
    clearTimeout(this.expiry); this.audio = new Uint8Array(event.audio); this.session.durationMs = event.durationMs;
    this.session.status = 'transcribing'; this.session.level = 0; this.emit();
    await this.process();
  }
  private async process() {
    const id = this.session.id; const generation = this.generation; const signal = this.abort.signal;
    const { state, asrKey, cleanupKey } = this.jobContext || this.snapshotContext();
    try {
      if (!this.session.rawText) {
        if (!this.audio) throw new Error('The recording is no longer available. Record again.');
        const raw = await this.providers.transcribe(state.settings.asr, asrKey, this.audio, state.settings.writing.language, signal);
        if (!this.active(id, generation)) return;
        this.session.rawText = raw;
      }
      if (!this.active(id, generation)) return;
      this.session.status = 'polishing'; this.session.error = undefined; this.emit();
      let cleaned;
      try {
        const current = this.store.snapshot();
        const cleanupSettings = { ...state.settings, cleanup: { ...state.settings.cleanup, enabled: current.settings.cleanup.enabled }, writing: { ...state.settings.writing, strength: current.settings.writing.strength, instructions: current.settings.writing.instructions } };
        cleaned = await this.providers.cleanup(cleanupSettings, cleanupKey, this.session.rawText, signal);
      } catch (error) {
        if (!this.active(id, generation)) return;
        cleaned = { text: this.session.rawText, warning: `Text processing failed. Original transcript is ready. ${error instanceof Error ? error.message : ''}` };
      }
      if (!this.active(id, generation)) return;
      this.session.text = cleaned.text; this.session.warning = cleaned.warning;
      this.audio = undefined; this.jobContext = undefined;
      await this.deliver(state.settings.general.autoInsert);
    } catch (error) {
      if (!this.active(id, generation)) return;
      this.jobContext = undefined; this.session.status = 'error'; this.session.errorCode = error instanceof ProviderError ? `asr_${error.code}` : 'asr_failed'; this.session.error = error instanceof Error ? error.message : 'Speech recognition failed.'; this.emit();
      this.expiry = setTimeout(() => { if (this.session.id === id) { this.audio = undefined; this.emit(); } }, 5 * 60000);
    }
  }
  async retry() {
    if (!['error', 'ready'].includes(this.session.status) || this.consumed) throw new Error('This dictation cannot be retried.');
    if (!this.audio && !this.session.rawText) throw new Error('The recording expired. Record again.');
    this.abort.abort(); this.abort = new AbortController(); this.generation++; clearTimeout(this.expiry);
    this.jobContext = this.snapshotContext();
    this.session.warning = undefined; this.session.error = undefined; this.session.errorCode = undefined; this.session.delivery = 'none'; this.session.copied = false;
    this.session.status = this.session.rawText ? 'polishing' : 'transcribing'; this.emit(); await this.process();
  }
  async copy(source: 'result' | 'raw' = 'result') {
    const text = source === 'raw' ? this.session.rawText : this.session.text || this.session.rawText;
    if (!text || ['arming', 'recording', 'transcribing', 'polishing', 'inserting'].includes(this.session.status)) throw new Error('No finished result is available to copy.');
    if (this.abort.signal.aborted) { this.abort = new AbortController(); this.generation++; }
    const id = this.session.id; const generation = this.generation; const signal = this.abort.signal;
    await this.writeClipboard(text, id, generation, signal);
    if (!this.active(id, generation)) return;
    this.session.copied = true;
    if (!this.session.inserted) this.session.delivery = 'copied';
    if (this.session.errorCode === 'clipboard_copy_failed') { this.session.error = undefined; this.session.errorCode = undefined; this.session.status = 'ready'; }
    this.emit();
  }
  private async writeClipboard(text: string, id: string, generation: number, signal: AbortSignal) {
    if (this.active(id, generation)) await this.host.copy(text, signal);
  }
  private async deliver(paste: boolean) {
    const id = this.session.id; const generation = this.generation; const signal = this.abort.signal;
    this.session.status = 'inserting'; this.session.delivery = 'pending'; this.session.copied = false;
    this.session.error = undefined; this.session.errorCode = undefined; this.emit();
    try {
      await this.writeClipboard(this.session.text, id, generation, signal);
    } catch (error) {
      if (!this.active(id, generation)) return;
      this.session.status = 'error'; this.session.delivery = 'failed'; this.session.errorCode = 'clipboard_copy_failed';
      this.session.error = `Could not copy the result to the clipboard. ${error instanceof Error ? error.message : ''}`;
      this.emit(); return;
    }
    if (!this.active(id, generation)) return;
    this.session.copied = true; this.session.delivery = 'copied';
    if (paste) {
      this.consumed = true;
      this.session.delivery = 'pending'; this.emit();
      const processingWarning = this.session.warning;
      try {
        const result = await this.host.paste(this.session.text, signal);
        if (!this.active(id, generation)) return;
        this.session.inserted = result.ok;
        this.session.delivery = result.ok ? result.status === 'confirmed' ? 'confirmed' : 'dispatched' : 'copied';
        this.session.errorCode = result.code || (result.ok ? undefined : 'paste_failed');
        const deliveryWarning = result.ok && result.status === 'confirmed' ? undefined : result.message || (result.ok ? 'Paste was dispatched. Check the current app; it will not be automatically repeated.' : 'The result was copied. Automatic paste was not completed.');
        this.session.warning = [processingWarning, deliveryWarning].filter(Boolean).join(' ') || undefined;
      } catch (error) {
        if (!this.active(id, generation)) return;
        this.session.delivery = 'copied';
        this.session.errorCode = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? error.code : 'paste_uncertain';
        this.session.warning = [processingWarning, 'The result was copied, but paste could not be confirmed. Check the current app before pasting again.'].filter(Boolean).join(' ');
      }
    }
    if (this.active(id, generation)) { this.session.status = 'ready'; this.emit(); }
  }
}
