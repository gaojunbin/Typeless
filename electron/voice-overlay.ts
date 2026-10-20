import type { DictationSession } from '../src/shared/contracts';

export interface Rectangle { x: number; y: number; width: number; height: number }
export interface OverlayWindow {
  setBounds(bounds: Rectangle, animate?: boolean): void;
  showInactive(): void;
  hide(): void;
  isDestroyed(): boolean;
  destroy(): void;
}

export const voiceWindowSize = { width: 240, height: 76 };
export const recoveryWindowSize = { width: 400, height: 76 };

export function overlayBounds(area: Rectangle, recovery: boolean): Rectangle {
  const size = recovery ? recoveryWindowSize : voiceWindowSize;
  return { ...size, x: Math.round(area.x + (area.width - size.width) / 2), y: Math.round(area.y + area.height - size.height - 16) };
}

export class VoiceOverlay<W extends OverlayWindow = OverlayWindow> {
  private sessionId = '';
  private anchor?: Rectangle;
  private shownRecovery?: boolean;
  private shownSinceCreated = false;
  private stale = false;
  private renewing = false;
  private recoveryKey = '';
  private dismissedKey = '';
  private timer?: ReturnType<typeof setTimeout>;

  // workArea is the immediate fallback; locate may later refine the anchor for the session.
  // create builds a fresh hidden window for invalidate(); without it the window is never replaced.
  constructor(private current: W, private workArea: () => Rectangle, private locate: () => Promise<Rectangle | undefined> = async () => undefined, private create?: () => Promise<W>) {}

  get window(): W { return this.current; }

  publish(session: DictationSession) {
    if (this.current.isDestroyed()) return;
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
    this.current.setBounds(overlayBounds(this.anchor, recovery), false);
    this.current.showInactive(); this.shownRecovery = recovery; this.shownSinceCreated = true;
  }

  hide() {
    clearTimeout(this.timer); this.shownRecovery = undefined;
    if (!this.current.isDestroyed()) this.current.hide();
    if (this.stale) void this.renew();
  }

  // macOS keeps the Space assignment of a shown window while it is hidden and can pin it to a single Space, so
  // after the active Space or the displays change, a window that has been shown is replaced by one that never was.
  invalidate() {
    if (!this.create || !this.shownSinceCreated) return;
    this.stale = true;
    if (this.shownRecovery === undefined) void this.renew();
  }

  private async renew() {
    if (this.renewing || !this.create) return;
    this.renewing = true;
    try {
      const next = await this.create();
      // A session took the current window meanwhile; it is replaced once that session hides.
      if (this.shownRecovery !== undefined) { next.destroy(); return; }
      const previous = this.current;
      this.current = next; this.shownSinceCreated = false; this.stale = false;
      if (!previous.isDestroyed()) previous.destroy();
    } catch {
      this.stale = false; // The shown window stays in use until the next change.
    } finally { this.renewing = false; }
  }

  private relocate(id: string) {
    this.locate().then(area => {
      if (!area || this.sessionId !== id || this.current.isDestroyed()) return;
      this.anchor = area;
      if (this.shownRecovery !== undefined) this.current.setBounds(overlayBounds(area, this.shownRecovery), false);
    }, () => {});
  }
}
