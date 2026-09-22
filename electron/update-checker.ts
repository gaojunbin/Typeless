import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import type { UpdateState } from '../src/shared/contracts';
import { compareVersions, parseLatestRelease, pickAsset, trustedDownloadUrl, UpdateFailure, type LatestRelease, type ReleaseAsset } from '../src/core/update';

export interface UpdateCheckerOptions {
  currentVersion: string;
  platform: string;
  arch: string;
  downloadsDir: string;
  fetcher?: typeof fetch;
  onChange: (state: UpdateState) => void;
  openPath: (path: string) => Promise<unknown>;
  openExternal: (url: string) => Promise<unknown>;
}

const releaseDocumentLimit = 1_000_000;
const assetLimit = 500 * 1024 * 1024;
const checkTimeoutMs = 10_000;
const progressIntervalMs = 250;

/**
 * Looks up the latest GitHub release and downloads its installer for the user to open.
 * It never replaces the running application: the app is ad-hoc signed, so an in-place update
 * would lose the system permission grants anyway.
 */
export class UpdateChecker {
  state: UpdateState;
  private release?: LatestRelease;
  private asset?: ReleaseAsset;
  private abort?: AbortController;
  private lastEmit = 0;
  private emitTimer?: ReturnType<typeof setTimeout>;

  constructor(private readonly options: UpdateCheckerOptions) {
    this.state = { status: 'idle', currentVersion: options.currentVersion };
  }

  private headers(accept: string): Record<string, string> {
    return { Accept: accept, 'User-Agent': `Typeless/${this.options.currentVersion}` };
  }

  private emit(state: UpdateState, throttled = false) {
    this.state = state;
    const now = Date.now();
    if (!throttled || now - this.lastEmit >= progressIntervalMs) {
      clearTimeout(this.emitTimer); this.emitTimer = undefined;
      this.lastEmit = now;
      this.options.onChange(state);
      return;
    }
    if (!this.emitTimer) this.emitTimer = setTimeout(() => { this.emitTimer = undefined; this.lastEmit = Date.now(); this.options.onChange(this.state); }, progressIntervalMs - (now - this.lastEmit));
  }

  async check(url: string): Promise<UpdateState> {
    if (this.state.status === 'checking' || this.state.status === 'downloading') return this.state;
    const { currentVersion, platform, arch } = this.options;
    this.emit({ status: 'checking', currentVersion });
    try {
      const release = parseLatestRelease(await this.fetchReleaseDocument(url));
      const checkedAt = Date.now();
      const base = { currentVersion, latestVersion: release.version, releaseUrl: release.releaseUrl, checkedAt };
      if (compareVersions(release.version, currentVersion) <= 0) { this.emit({ status: 'none', ...base }); return this.state; }
      const asset = pickAsset(release.assets, platform, arch);
      if (!asset) { this.emit({ status: 'error', error: 'no_asset', ...base }); return this.state; }
      this.release = release; this.asset = asset;
      this.emit({ status: 'available', assetName: asset.name, ...base });
    } catch (error) {
      this.emit({ status: 'error', error: error instanceof UpdateFailure ? error.code : 'network', currentVersion, checkedAt: Date.now() });
    }
    return this.state;
  }

  private async fetchReleaseDocument(url: string): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), checkTimeoutMs);
    let response: Response;
    try { response = await (this.options.fetcher ?? fetch)(url, { headers: this.headers('application/vnd.github+json'), redirect: 'error', signal: controller.signal }); }
    catch { throw new UpdateFailure('network'); }
    finally { clearTimeout(timer); }
    if (!response.ok) throw new UpdateFailure('network');
    const text = await response.text().catch(() => { throw new UpdateFailure('network'); });
    if (text.length > releaseDocumentLimit) throw new UpdateFailure('invalid_response');
    try { return JSON.parse(text) as unknown; } catch { throw new UpdateFailure('invalid_response'); }
  }

  async download(): Promise<UpdateState> {
    if (this.state.status !== 'available' || !this.asset || !this.release) return this.state;
    const asset = this.asset;
    const base = { currentVersion: this.options.currentVersion, latestVersion: this.release.version, releaseUrl: this.release.releaseUrl, assetName: asset.name, checkedAt: this.state.checkedAt };
    const partial = join(this.options.downloadsDir, `${asset.name}.part`);
    const target = join(this.options.downloadsDir, asset.name);
    this.abort = new AbortController();
    this.emit({ status: 'downloading', progress: 0, ...base });
    try {
      await mkdir(this.options.downloadsDir, { recursive: true }).catch(() => { throw new UpdateFailure('write_failed'); });
      const digest = await this.stream(asset, partial, base);
      if (asset.digest && asset.digest !== `sha256:${digest}`) throw new UpdateFailure('checksum');
      await rename(partial, target).catch(() => { throw new UpdateFailure('write_failed'); });
      this.emit({ status: 'downloaded', filePath: target, ...base });
    } catch (error) {
      await rm(partial, { force: true }).catch(() => {});
      this.emit({ status: 'error', error: error instanceof UpdateFailure ? error.code : 'write_failed', ...base });
    } finally {
      this.abort = undefined;
    }
    return this.state;
  }

  /** Streams the asset to `partial`, reporting progress, and returns its SHA-256 hex digest. */
  private async stream(asset: ReleaseAsset, partial: string, base: Omit<UpdateState, 'status'>): Promise<string> {
    let response: Response;
    try { response = await (this.options.fetcher ?? fetch)(asset.url, { headers: this.headers('application/octet-stream'), redirect: 'follow', signal: this.abort?.signal }); }
    catch { throw new UpdateFailure('network'); }
    if (!response.ok || !response.body || (response.url && !trustedDownloadUrl(response.url))) throw new UpdateFailure('network');
    const declared = Number(response.headers.get('content-length')) || asset.size || 0;
    if (declared > assetLimit) throw new UpdateFailure('network');
    const hash = createHash('sha256');
    let received = 0;
    let sourceFailed = false;
    const source = Readable.fromWeb(response.body as unknown as NodeReadableStream<Uint8Array>);
    source.on('data', (chunk: Buffer) => {
      received += chunk.length;
      hash.update(chunk);
      if (received > assetLimit) { sourceFailed = true; source.destroy(new UpdateFailure('network')); return; }
      if (declared) this.emit({ status: 'downloading', progress: Math.min(1, received / declared), ...base }, true);
    });
    source.on('error', () => { sourceFailed = true; });
    try { await pipeline(source, createWriteStream(partial, { mode: 0o600 })); }
    catch (error) {
      if (error instanceof UpdateFailure) throw error;
      throw new UpdateFailure(sourceFailed || this.abort?.signal.aborted ? 'network' : 'write_failed');
    }
    return hash.digest('hex');
  }

  async open(): Promise<void> {
    if (this.state.status === 'downloaded' && this.state.filePath) await this.options.openPath(this.state.filePath);
  }

  async openRelease(): Promise<void> {
    const url = this.state.releaseUrl;
    if (!url) return;
    let host = '';
    try { host = new URL(url).host; } catch { return; }
    if (host === 'github.com') await this.options.openExternal(url);
  }

  cancel(): void {
    this.abort?.abort();
    clearTimeout(this.emitTimer); this.emitTimer = undefined;
  }
}
