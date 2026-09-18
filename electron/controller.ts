import type { AppAction, ActionResult, AppSnapshot, CaptureCommand, CaptureEvent, Permissions } from '../src/shared/contracts';
import { Store } from '../src/core/store';
import { Providers } from '../src/core/providers';
import { Sessions } from '../src/core/session';
export interface ControllerHost {
  capture(command: CaptureCommand): void;
  publish(snapshot: AppSnapshot): void;
  paste(text: string, signal?: AbortSignal): Promise<{ ok: boolean; status?: string; message?: string; code?: string }>;
  permissions(request?: 'microphone' | 'accessibility'): Promise<Permissions>;
  copy(text: string, signal?: AbortSignal): Promise<void>;
  show(): void;
  hide(): void;
  quit(): void;
  settingsChanged(changes: { login: boolean; shortcut: boolean }): Promise<void>;
}
export class Controller {
  readonly sessions: Sessions;
  private permissions: Permissions = { microphone: 'unknown', accessibility: false, nativeAvailable: false, nativeMessage: '', inputMonitoring: false, primaryShortcutAvailable: false, fallbackShortcutAvailable: false, shortcutMessage: 'helper_unavailable' };
  constructor(private store: Store, private providers: Providers, private host: ControllerHost, private version: string) {
    this.sessions = new Sessions(store, providers, { ...host, changed: () => this.publish() });
  }
  snapshot(): AppSnapshot { return { ...this.store.snapshot(), version: this.version, platform: process.platform as AppSnapshot['platform'], session: structuredClone(this.sessions.session), permissions: this.permissions }; }
  publish() { this.host.publish(this.snapshot()); }
  async refreshPermissions(request?: 'microphone' | 'accessibility') {
    const next = await this.host.permissions(request);
    if (JSON.stringify(next) !== JSON.stringify(this.permissions)) { this.permissions = next; this.publish(); }
  }
  async capture(event: CaptureEvent) {
    try { await this.sessions.capture(event); } catch { this.sessions.cancel(); }
  }
  async dispatch(action: AppAction): Promise<ActionResult> {
    try {
      if (!action || typeof action !== 'object' || typeof action.type !== 'string') throw new Error('Invalid action.');
      switch (action.type) {
        case 'settings.save': {
          const previous = this.store.snapshot().settings;
          this.store.saveSettings(action.patch, action.secrets);
          const next = this.store.snapshot().settings;
          const changes = { login: previous.general.launchAtLogin !== next.general.launchAtLogin, shortcut: JSON.stringify(previous.shortcut) !== JSON.stringify(next.shortcut) };
          if (changes.login || changes.shortcut) {
            try { await this.host.settingsChanged(changes); }
            catch { this.publish(); return { ok: true, message: 'Settings were saved, but the system setting could not be applied. Check permissions and retry.' }; }
          }
          break;
        }
        case 'dictation.toggle': await this.sessions.toggle(); break;
        case 'dictation.cancel': this.sessions.cancel(); break;
        case 'dictation.retry': await this.sessions.retry(); break;
        case 'dictation.copy':
          if (action.source !== undefined && !['result', 'raw'].includes(action.source)) throw new Error('Invalid copy source.');
          await this.sessions.copy(action.source); break;
        case 'permissions.refresh': await this.refreshPermissions(); break;
        case 'permissions.request': if (!['microphone', 'accessibility'].includes(action.permission)) throw new Error('Invalid permission.'); await this.refreshPermissions(action.permission); break;
        case 'window.show': this.host.show(); break;
        case 'window.hide': this.host.hide(); break;
        case 'app.quit': this.host.quit(); break;
        default: throw new Error('Unsupported action.');
      }
      this.publish(); return { ok: true };
    } catch (error) { return { ok: false, message: error instanceof Error ? error.message.slice(0, 1000) : 'The action failed.' }; }
  }
}
