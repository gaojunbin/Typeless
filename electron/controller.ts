import type { AppAction, ActionResult, AppSnapshot, CaptureCommand, CaptureEvent, Permissions, UpdateState } from '../src/shared/contracts';
import { Store } from '../src/core/store';
import { Providers } from '../src/core/providers';
import { Sessions } from '../src/core/session';
export interface ControllerHost {
  capture(command: CaptureCommand): void;
  publish(snapshot: AppSnapshot): void;
  paste(text: string, signal?: AbortSignal): Promise<{ ok: boolean; status?: string; message?: string; code?: string }>;
  permissions(request?: 'microphone' | 'accessibility'): Promise<Permissions>;
  openPane(pane: 'microphone' | 'accessibility' | 'inputMonitoring'): void;
  microphoneTest(active: boolean): void;
  copy(text: string, signal?: AbortSignal): Promise<void>;
  show(): void;
  hide(): void;
  quit(): void;
  relaunch(): void;
  copyDiagnostics(): Promise<void>;
  checkUpdate(): Promise<void>;
  downloadUpdate(): Promise<void>;
  openUpdate(): Promise<void>;
  installUpdate(): Promise<void>;
  openReleasePage(): Promise<void>;
  settingsChanged(changes: { login: boolean; shortcut: boolean }): Promise<void>;
  selectSyncFolder?(): Promise<string | undefined>;
}
export class Controller {
  readonly sessions: Sessions;
  private permissions: Permissions = { microphone: 'unknown', accessibility: false, nativeAvailable: false, nativeMessage: '', inputMonitoring: false, primaryShortcutAvailable: false, fallbackShortcutAvailable: false, shortcutMessage: 'helper_unavailable', shortcutPresses: 0 };
  private update: UpdateState;
  constructor(private store: Store, private providers: Providers, private host: ControllerHost, private version: string) {
    this.update = { status: 'idle', currentVersion: version };
    this.sessions = new Sessions(store, providers, { ...host, changed: () => this.publish() });
  }
  snapshot(): AppSnapshot { return { ...this.store.snapshot(), version: this.version, platform: process.platform as AppSnapshot['platform'], session: structuredClone(this.sessions.session), permissions: this.permissions, update: this.update, vocabulary: this.store.vocabulary(), history: this.store.history(), sync: this.store.syncState() }; }
  /** Main owns the release check; it pushes each transition here so every window sees it. */
  setUpdate(update: UpdateState) { this.update = update; this.publish(); }
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
        case 'dictation.correct':
          if (typeof action.heard !== 'string' || typeof action.term !== 'string' || (action.start !== undefined && (!Number.isInteger(action.start) || action.start < 0))) throw new Error('Invalid correction.');
          this.sessions.correct(action.heard, action.term, action.start); break;
        case 'vocabulary.save': this.store.saveVocabulary(action.entry); break;
        case 'vocabulary.delete': this.store.deleteVocabulary(action.id); break;
        case 'history.delete': this.store.deleteHistory(action.id); break;
        case 'history.clear': this.store.clearHistory(); break;
        case 'history.copy': {
          if (typeof action.id !== 'string' || !action.id) throw new Error('Invalid history entry.');
          if (action.source !== undefined && !['result', 'raw'].includes(action.source)) throw new Error('Invalid copy source.');
          const item = this.store.history().find(entry => entry.id === action.id);
          if (!item) throw new Error('This history entry is no longer available.');
          const text = action.source === 'raw' ? item.rawText : item.text || item.rawText;
          await this.host.copy(text);
          break;
        }
        case 'sync.selectFolder': {
          const chosen = await this.host.selectSyncFolder?.();
          if (!chosen) return { ok: true };
          this.store.setSyncFolder(chosen);
          break;
        }
        case 'sync.useIcloud': this.store.useIcloudSync(); break;
        case 'sync.setFolder':
          if (typeof action.path !== 'string') throw new Error('Invalid sync folder.');
          this.store.setSyncFolder(action.path);
          break;
        case 'sync.disable': this.store.disableSync(); break;
        case 'sync.now': this.store.syncNow(); break;
        case 'permissions.refresh': await this.refreshPermissions(); break;
        case 'permissions.request': if (!['microphone', 'accessibility'].includes(action.permission)) throw new Error('Invalid permission.'); await this.refreshPermissions(action.permission); break;
        case 'permissions.open': if (!['microphone', 'accessibility', 'inputMonitoring'].includes(action.pane)) throw new Error('Invalid pane.'); this.host.openPane(action.pane); break;
        case 'microphone.test': if (typeof action.active !== 'boolean') throw new Error('Invalid value.'); this.host.microphoneTest(action.active); break;
        case 'window.show': this.host.show(); break;
        case 'window.hide': this.host.hide(); break;
        case 'app.quit': this.host.quit(); break;
        case 'app.relaunch': this.host.relaunch(); break;
        case 'diagnostics.copy': await this.host.copyDiagnostics(); break;
        case 'update.check': await this.host.checkUpdate(); break;
        case 'update.download': await this.host.downloadUpdate(); break;
        case 'update.open': await this.host.openUpdate(); break;
        case 'update.install': await this.host.installUpdate(); break;
        case 'update.openRelease': await this.host.openReleasePage(); break;
        default: throw new Error('Unsupported action.');
      }
      this.publish(); return { ok: true };
    } catch (error) { return { ok: false, message: error instanceof Error ? error.message.slice(0, 1000) : 'The action failed.' }; }
  }
}
