import type { AppAction, ActionResult, AppSnapshot, CaptureCommand, CaptureEvent, Permissions } from '../src/shared/contracts';
import { Store, bounded } from '../src/core/store';
import { Providers } from '../src/core/providers';
import { Sessions } from '../src/core/session';
export interface ControllerHost {
  capture(command: CaptureCommand): void;
  publish(snapshot: AppSnapshot): void;
  context(): Promise<{ appName: string }>;
  paste(text: string, signal?: AbortSignal): Promise<{ ok: boolean; status?: string; message?: string; code?: string }>;
  permissions(request?: 'microphone' | 'accessibility'): Promise<Permissions>;
  copy(text: string, signal?: AbortSignal): Promise<void>;
  show(): void;
  hide(): void;
  quit(): void;
  settingsChanged(loginChanged: boolean): Promise<void>;
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
      if (action.type === 'dictation.toggle' || action.type === 'text.process') {
        if (action.mode !== undefined && !['dictate', 'translate'].includes(action.mode)) throw new Error('Invalid dictation mode.');
      }
      switch (action.type) {
        case 'settings.save': {
          const previousLogin = this.store.snapshot().settings.general.launchAtLogin;
          this.store.saveSettings(action.patch, action.secrets);
          await this.host.settingsChanged(previousLogin !== this.store.snapshot().settings.general.launchAtLogin); break;
        }
        case 'dictation.toggle': await this.sessions.toggle(action.mode, action.practice); break;
        case 'dictation.cancel': this.sessions.cancel(); break;
        case 'dictation.retry': await this.sessions.retry(); break;
        case 'dictation.useRaw': await this.sessions.useRaw(); break;
        case 'dictation.copy': {
          if (action.text === undefined) await this.sessions.copy();
          else { const text = bounded(action.text, 50000); if (!text) throw new Error('No text to copy.'); await this.host.copy(text); }
          break;
        }
        case 'text.process': await this.sessions.processText(action.text, action.mode); break;
        case 'dictionary.save': this.store.saveDictionary(action.entry); break;
        case 'dictionary.delete': this.store.delete('dictionary', bounded(action.id, 100)); break;
        case 'dictionary.import': { const count = this.store.importDictionary(action.csv); this.publish(); return { ok: true, message: `Imported ${count} dictionary entries.` }; }
        case 'dictionary.export': return { ok: true, text: this.store.exportDictionary() };
        case 'memory.save': this.store.saveMemory(action.entry); break;
        case 'memory.delete': this.store.delete('memories', bounded(action.id, 100)); break;
        case 'profile.save': this.store.saveProfile(action.profile); break;
        case 'profile.delete': this.store.delete('profiles', bounded(action.id, 100)); break;
        case 'history.delete': this.store.deleteHistory(bounded(action.id, 100)); break;
        case 'history.clear': this.store.deleteHistory(); break;
        case 'history.export': return { ok: true, text: this.store.exportHistory() };
        case 'history.reprocess': { const entry = this.store.history(bounded(action.id, 100)); if (!entry) throw new Error('History entry was not found.'); await this.sessions.processText(entry.rawText, entry.mode); break; }
        case 'history.correct': this.store.correctHistory(bounded(action.id, 100), action.text, Boolean(action.remember)); break;
        case 'permissions.refresh': await this.refreshPermissions(); break;
        case 'permissions.request': if (!['microphone', 'accessibility'].includes(action.permission)) throw new Error('Invalid permission.'); await this.refreshPermissions(action.permission); break;
        case 'provider.test': {
          if (!['asr', 'cleanup'].includes(action.provider)) throw new Error('Invalid provider.');
          const settings = this.store.snapshot().settings;
          const profile = settings[action.provider];
          const message = await this.providers.test(profile.baseUrl, profile.model, this.store.secret(action.provider), action.provider === 'asr' ? settings.asr.kind : 'openai', new AbortController().signal);
          return { ok: true, message };
        }
        case 'window.show': this.host.show(); break;
        case 'window.hide': this.host.hide(); break;
        case 'app.quit': this.host.quit(); break;
        default: throw new Error('Unsupported action.');
      }
      this.publish(); return { ok: true };
    } catch (error) { return { ok: false, message: error instanceof Error ? error.message.slice(0, 1000) : 'The action failed.' }; }
  }
}
