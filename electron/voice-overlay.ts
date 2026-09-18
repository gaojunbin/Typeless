import type { DictationSession } from '../src/shared/contracts';

export interface Rectangle { x: number; y: number; width: number; height: number }
interface OverlayWindow {
  setBounds(bounds: Rectangle, animate?: boolean): void;
  showInactive(): void;
  hide(): void;
  isDestroyed(): boolean;
}

export const voiceWindowSize = { width: 144, height: 60 };
export const recoveryWindowSize = { width: 320, height: 64 };

export function overlayBounds(area: Rectangle, recovery: boolean): Rectangle {
  const size = recovery ? recoveryWindowSize : voiceWindowSize;
  return { ...size, x: Math.round(area.x + (area.width - size.width) / 2), y: Math.round(area.y + area.height - size.height - 8) };
}

export class VoiceOverlay {
  private sessionId = '';
  private anchor?: Rectangle;
  private recoveryKey = '';
  private dismissedKey = '';
  private timer?: ReturnType<typeof setTimeout>;

  constructor(private window: OverlayWindow, private workArea: () => Rectangle) {}

  publish(session: DictationSession) {
    if (this.window.isDestroyed()) return;
    if (this.sessionId !== session.id) {
      this.sessionId = session.id; this.anchor = this.workArea();
      this.recoveryKey = ''; this.dismissedKey = ''; clearTimeout(this.timer);
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
    this.window.showInactive();
  }

  hide() { clearTimeout(this.timer); if (!this.window.isDestroyed()) this.window.hide(); }
}
