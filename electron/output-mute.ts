import type { AppSettings, SessionStatus } from '../src/shared/contracts';
import type { OutputMuteResult } from './native-client';

export interface OutputControl {
  muteOutput(): Promise<OutputMuteResult>;
  restoreOutput(): Promise<{ restored: boolean }>;
}

/** Long enough for the renderer's 100 ms start cue to finish before the output goes silent. */
export const cueGuardMs = 300;

// Mutes the system output while a dictation records, so media playing in the background does not reach the
// microphone, and restores it when recording ends. The helper only ever unmutes a device it muted itself.
export class OutputMute {
  private wanted = false;
  private holding = false;
  private timer?: ReturnType<typeof setTimeout>;
  private queue: Promise<void> = Promise.resolve();
  /** The last helper answers, for the diagnostics report. */
  readonly last = { mute: 'none', restore: 'none' };

  constructor(private control: OutputControl, private guardMs = cueGuardMs) {}

  /** True from a mute request until its restore request has been sent. */
  get held() { return this.holding; }

  sync(status: SessionStatus, audio: AppSettings['audio']) {
    const wanted = status === 'recording' && audio.muteDuringRecording;
    if (wanted === this.wanted) return;
    this.wanted = wanted;
    clearTimeout(this.timer);
    // The start cue plays as recording begins, so with sounds on the mute waits for it.
    if (wanted && audio.interactionSounds) this.timer = setTimeout(() => { void this.apply(); }, this.guardMs);
    else void this.apply();
  }

  /** Restores the output before quitting; settles within `timeoutMs` even when the helper does not answer. */
  release(timeoutMs = 1000): Promise<void> {
    this.wanted = false; clearTimeout(this.timer);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<void>(resolve => { timer = setTimeout(resolve, timeoutMs); });
    return Promise.race([this.apply(), timeout]).finally(() => clearTimeout(timer));
  }

  // One request at a time, so a restore always follows the mute it undoes. Every mute request is paired with a
  // restore, even an unanswered one: the helper may have muted before its answer was lost.
  private apply(): Promise<void> {
    const operation = this.queue.then(async () => {
      if (this.wanted && !this.holding) {
        this.holding = true;
        try { const result = await this.control.muteOutput(); this.last.mute = result.muted ? 'muted' : result.reason ?? 'unchanged'; }
        catch { this.last.mute = 'unavailable'; }
      } else if (!this.wanted && this.holding) {
        this.holding = false;
        try { this.last.restore = (await this.control.restoreOutput()).restored ? 'restored' : 'unchanged'; }
        catch { this.last.restore = 'unavailable'; }
      }
    });
    this.queue = operation;
    return operation;
  }
}
