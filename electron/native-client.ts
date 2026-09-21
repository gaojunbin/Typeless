import { randomUUID } from 'node:crypto';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';

export class NativeError extends Error {
  constructor(readonly code: string, message: string) { super(message); this.name = 'NativeError'; }
}

export interface NativeContext {
  appName: string;
}
export interface NativeStatus {
  platform: string;
  accessibility: boolean;
  inputMonitoring: boolean;
  shortcutAvailable: boolean;
  binding: string;
  error?: string;
  tapEnabled?: boolean;
  shortcutReason?: string;
  fnTransitions?: number;
  shortcutActivations?: number;
  helperPid?: number;
  restartsExhausted?: boolean;
}
export interface NativeInsertResult {
  ok: boolean;
  status?: 'dispatched' | 'confirmed';
  message?: string;
  code?: string;
}
interface Options {
  onShortcut: () => void;
  onStatus?: (status: NativeStatus) => void;
}
interface Pending {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class NativeClient {
  private child?: ChildProcessWithoutNullStreams;
  private pending = new Map<string, Pending>();
  private counter = 0;
  private buffer = '';
  private startup?: Promise<void>;
  private stopped = false;
  private nextRecoveryAt = 0;
  private staleRestarts: number[] = [];
  private binding = process.platform === 'darwin' ? 'fn' : 'right-alt';

  constructor(private readonly options: Options) {}

  start(): Promise<void> {
    this.stopped = false;
    if (this.startup) return this.startup;
    this.startup = this.launch().catch(error => { this.startup = undefined; throw error; });
    return this.startup;
  }

  private async launch(): Promise<void> {
    this.nextRecoveryAt = Date.now() + 2000;
    this.buffer = '';
    const root = app.isPackaged ? join(process.resourcesPath, 'native') : join(app.getAppPath(), 'native');
    let command: string;
    let args: string[];
    const environment: NodeJS.ProcessEnv = { ...process.env };
    // The helper may only restart itself on a stale tap while this client still has restart budget left.
    if (this.staleBudgetRemaining()) environment.TYPELESS_HELPER_RESTART_ON_STALE = '1';
    else delete environment.TYPELESS_HELPER_RESTART_ON_STALE;
    if (process.platform === 'darwin') {
      command = join(root, 'bin', 'typeless-native');
      if (!existsSync(command)) throw new NativeError('helper_unavailable', 'Build the macOS native helper with npm run build:native.');
      args = [];
    } else if (process.platform === 'win32') {
      const staged = join(root, 'bin', 'Helper.cs');
      environment.TYPELESS_NATIVE_SOURCE = existsSync(staged) ? staged : join(root, 'windows', 'Helper.cs');
      // Do not override execution policy or request administrator privileges.
      command = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
      const launcher = `$ErrorActionPreference = 'Stop';
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false);
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false);
$references = @('System.Windows.Forms', 'System.Web.Extensions');
Add-Type -Path $env:TYPELESS_NATIVE_SOURCE -ReferencedAssemblies $references;
[TypelessNative]::Run();`;
      args = ['-NoLogo', '-NoProfile', '-NonInteractive', '-STA', '-Command', launcher];
    } else {
      throw new Error('Native dictation supports macOS and Windows only.');
    }
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, env: environment });
    this.child = child;
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => { if (this.child === child) this.receive(chunk); });
    // Helpers emit only sanitized diagnostics. Do not forward them to content logs.
    child.stderr.resume();
    const lost = (message: string) => {
      if (this.child !== child) return;
      this.child = undefined;
      this.startup = undefined;
      this.buffer = '';
      this.fail(new NativeError('helper_unavailable', message));
      this.options.onStatus?.(this.unavailable());
    };
    child.on('error', () => lost('Native helper could not start. Manual copy remains available.'));
    child.on('exit', (code: number | null) => {
      if (this.child === child && code === 3) { this.staleRestarts.push(Date.now()); this.nextRecoveryAt = Date.now() + 500; }
      lost('Native helper stopped. Manual copy remains available.');
    });
    try {
      await this.request<NativeStatus>('status', {}, 20_000);
      await this.request('configureShortcut', { binding: this.binding });
      this.options.onStatus?.(this.track(await this.request<NativeStatus>('status')));
    } catch (error) {
      child.kill();
      throw error;
    }
  }

  private staleBudgetRemaining(): boolean {
    const cutoff = Date.now() - 120_000;
    this.staleRestarts = this.staleRestarts.filter(at => at > cutoff);
    return this.staleRestarts.length < 3;
  }

  private track(status: NativeStatus): NativeStatus {
    if (status.shortcutReason === 'ready') this.staleRestarts = [];
    return this.staleBudgetRemaining() ? status : { ...status, restartsExhausted: true };
  }

  private unavailable(): NativeStatus {
    return { platform: process.platform, accessibility: false, inputMonitoring: false,
      shortcutAvailable: false, binding: 'disabled', error: 'Native integration is unavailable; use manual copy.' };
  }

  private receive(chunk: string): void {
    this.buffer += chunk;
    if (this.buffer.length > 2_000_000) {
      this.fail(new NativeError('native_protocol_error', 'Native response exceeded the size limit.'));
      this.child?.kill();
      return;
    }
    let newline: number;
    while ((newline = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, newline);
      this.buffer = this.buffer.slice(newline + 1);
      let message: Record<string, unknown>;
      try { message = JSON.parse(line) as Record<string, unknown>; } catch { continue; }
      if (message.event === 'shortcut') this.options.onShortcut();
      if (typeof message.id !== 'string') continue;
      const pending = this.pending.get(message.id);
      if (!pending) continue;
      clearTimeout(pending.timer);
      this.pending.delete(message.id);
      if (message.error) {
        const error = message.error as { code?: string; message?: string };
        pending.reject(new NativeError(error.code ?? 'native_error', error.message ?? 'Native operation failed.'));
      } else pending.resolve(message.result);
    }
  }

  private request<T>(method: string, params: Record<string, unknown> = {}, timeout = 5_000): Promise<T> {
    const child = this.child;
    if (!child?.stdin.writable) return Promise.reject(new NativeError('helper_unavailable', 'Native helper is unavailable.'));
    const id = String(++this.counter);
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new NativeError(method === 'pasteText' ? 'insertion_uncertain' : 'native_timeout', method === 'pasteText' ? 'Insertion status is uncertain. Check the target before retrying.' : 'Native operation timed out.'));
      }, timeout);
      this.pending.set(id, { resolve: value => resolve(value as T), reject, timer });
      child.stdin.write(JSON.stringify({ id, method, params }) + '\n', error => {
        if (error) {
          clearTimeout(timer);
          this.pending.delete(id);
          reject(new NativeError('helper_unavailable', 'Native request could not be delivered.'));
        }
      });
    });
  }

  private fail(error: Error): void {
    for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(error); }
    this.pending.clear();
  }

  async status(): Promise<NativeStatus> {
    if (!this.child && !this.stopped && Date.now() >= this.nextRecoveryAt) {
      try { await this.start(); } catch { return this.track(this.unavailable()); }
    }
    if (!this.child) return this.track(this.unavailable());
    if (this.startup) {
      try { await this.startup; } catch { return this.track(this.unavailable()); }
    }
    const child = this.child;
    if (!child) return this.track(this.unavailable());
    try { return this.track(await this.request<NativeStatus>('status')); }
    catch (error) {
      if (error instanceof NativeError && error.code === 'native_timeout' && this.child === child) {
        this.child = undefined; this.startup = undefined; this.buffer = '';
        this.nextRecoveryAt = Date.now() + 2000;
        this.fail(new NativeError('helper_unavailable', 'Native helper stopped responding. Check the foreground application before retrying paste.'));
        child.kill();
        this.options.onStatus?.(this.unavailable());
        return this.track(this.unavailable());
      }
      throw error;
    }
  }

  context(): Promise<NativeContext> { return this.request<NativeContext>('context', {}, 1000); }

  async paste(text: string, options: { clipboardOwner: string; signal?: AbortSignal }): Promise<NativeInsertResult> {
    const requestId = randomUUID();
    const signal = options.signal;
    const cancel = () => { void this.request('cancelPaste', { requestId }).catch(() => {}); };
    if (signal?.aborted) return { ok: false, code: 'cancelled', message: 'Paste was cancelled.' };
    signal?.addEventListener('abort', cancel, { once: true });
    try {
      const result = await this.request<{ status: 'dispatched' | 'confirmed' }>('pasteText', {
        text, clipboardOwner: options.clipboardOwner, requestId, deadlineMs: Date.now() + 4000,
      });
      return { ok: true, status: result.status };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Paste could not be confirmed; the result remains on the clipboard.';
      return { ok: false, message, code: error instanceof NativeError ? error.code : 'native_error' };
    } finally { signal?.removeEventListener('abort', cancel); }
  }

  requestAccessibility(): Promise<NativeStatus> { return this.request<NativeStatus>('requestPermissions'); }

  configureShortcut(binding: string): Promise<{ binding: string; available: boolean }> {
    const normalized = binding.toLowerCase().replace(/[ _-]/g, '');
    const nativeBinding = normalized === 'fn' ? 'fn' : normalized === 'rightalt' ? 'right-alt' : 'disabled';
    this.binding = nativeBinding;
    return this.request('configureShortcut', { binding: nativeBinding });
  }

  stop(): void {
    this.stopped = true;
    this.child?.stdin.end();
    this.child?.kill();
    this.child = undefined;
    this.startup = undefined;
    this.fail(new NativeError('helper_unavailable', 'Native helper stopped.'));
  }
}
