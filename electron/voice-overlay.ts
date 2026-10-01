import type { DictationSession } from '../src/shared/contracts';

export interface Rectangle { x: number; y: number; width: number; height: number }
interface OverlayWindow {
  setBounds(bounds: Rectangle, animate?: boolean): void;
  showInactive(): void;
  hide(): void;
  isDestroyed(): boolean;
}

export const voiceWindowSize = { width: 240, height: 76 };
export const recoveryWindowSize = { width: 400, height: 76 };

export function overlayBounds(area: Rectangle, recovery: boolean): Rectangle {
  const size = recovery ? recoveryWindowSize : voiceWindowSize;
  return { ...size, x: Math.round(area.x + (area.width - size.width) / 2), y: Math.round(area.y + area.height - size.height - 16) };
}

export class VoiceOverlay {
  private sessionId = '';
  private anchor?: Rectangle;
  private shownRecovery?: boolean;
  private recoveryKey = '';
  private dismissedKey = '';
  private timer?: ReturnType<typeof setTimeout>;

  // workArea is the immediate fallback; locate may later refine the anchor for the session.
  constructor(private window: OverlayWindow, private workArea: () => Rectangle, private locate: () => Promise<Rectangle | undefined> = async () => undefined) {}

  publish(session: DictationSession) {
    if (this.window.isDestroyed()) return;
    if (this.sessionId !== session.id) {
      this.sessionId = session.id; this.anchor = this.workArea();
      this.recoveryKey = ''; this.dismissedKey = ''; clearTimeout(this.timer);
      if (session.id) this.relocate(session.id);
    }
    const active = ['recording', 'transcribing', 'polishing', 'inserting'].includes(session.status);
    const recovery = session.status === 'error' || (session.status === 'ready' && !session.copied && Boolean(session.text));
    if (!active && !recovery) { this.hide(); return; }
    if (recovery) {
      const key = [session.id, session.status, session.errorCode, session.error, session.warning].join('|');
      if (this.dismissedKey === key) return;
      if (this.recoveryKey !== key) {
        clearTimeout(this.timer); this.recoveryKey = key;
        this.timer = setTimeout(() => { this.dismissedKey = key; this.hide(); }, 4000);
      }
    } else {
      clearTimeout(this.timer); this.recoveryKey = '';
    }
    this.anchor ??= this.workArea();
    this.window.setBounds(overlayBounds(this.anchor, recovery), false);
    this.window.showInactive(); this.shownRecovery = recovery;
  }

  hide() { clearTimeout(this.timer); this.shownRecovery = undefined; if (!this.window.isDestroyed()) this.window.hide(); }

  private relocate(id: string) {
    this.locate().then(area => {
      if (!area || this.sessionId !== id || this.window.isDestroyed()) return;
      this.anchor = area;
      if (this.shownRecovery !== undefined) this.window.setBounds(overlayBounds(area, this.shownRecovery), false);
    }, () => {});
  }
}
