import type { UpdateError } from '../shared/contracts';

export interface ReleaseAsset {
  name: string;
  url: string;
  size: number;
  /** GitHub asset digest, `sha256:<hex>`, when the API provides one. */
  digest?: string;
}

export interface LatestRelease {
  version: string;
  releaseUrl: string;
  assets: ReleaseAsset[];
}

/** A release-check failure whose message is the `UpdateError` code the renderer maps to copy. */
export class UpdateFailure extends Error {
  constructor(readonly code: UpdateError) { super(code); this.name = 'UpdateFailure'; }
}

function parseVersion(version: string): { numbers: number[]; prerelease: boolean } {
  const trimmed = version.trim().replace(/^v/i, '');
  const separator = trimmed.search(/[-+]/);
  const main = separator >= 0 ? trimmed.slice(0, separator) : trimmed;
  const numbers = main.split('.').map(part => { const value = Number.parseInt(part, 10); return Number.isFinite(value) ? value : 0; });
  return { numbers, prerelease: separator >= 0 && trimmed[separator] === '-' };
}

/** Numeric dot-separated comparison; a missing part is 0 and a prerelease sorts below its plain version. */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const left = parseVersion(a);
  const right = parseVersion(b);
  const length = Math.max(left.numbers.length, right.numbers.length);
  for (let index = 0; index < length; index++) {
    const difference = (left.numbers[index] ?? 0) - (right.numbers[index] ?? 0);
    if (difference) return difference < 0 ? -1 : 1;
  }
  if (left.prerelease !== right.prerelease) return left.prerelease ? -1 : 1;
  return 0;
}

export function assetSuffix(platform: string, arch: string): string | undefined {
  if (platform === 'darwin') return arch === 'arm64' ? '-arm64.dmg' : arch === 'x64' ? '-x64.dmg' : undefined;
  if (platform === 'win32') return '-win.zip';
  return undefined;
}

export function pickAsset(assets: ReleaseAsset[], platform: string, arch: string): ReleaseAsset | undefined {
  const suffix = assetSuffix(platform, arch);
  return suffix ? assets.find(asset => asset.name.endsWith(suffix)) : undefined;
}

function invalid(): never { throw new UpdateFailure('invalid_response'); }

/** HTTPS anywhere, or HTTP on a loopback host, matching the provider endpoint rule. */
export function trustedDownloadUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  } catch { return false; }
}

function parseAsset(value: unknown): ReleaseAsset {
  if (!value || typeof value !== 'object') invalid();
  const record = value as Record<string, unknown>;
  const { name, browser_download_url: url, size, digest } = record;
  if (typeof name !== 'string' || !name || /[\\/]/.test(name) || name.startsWith('.')) invalid();
  if (typeof url !== 'string' || !trustedDownloadUrl(url)) invalid();
  if (digest !== undefined && (typeof digest !== 'string' || !/^sha256:[0-9a-f]{64}$/i.test(digest))) invalid();
  return { name, url, size: typeof size === 'number' && Number.isFinite(size) && size >= 0 ? size : 0, ...(typeof digest === 'string' ? { digest: digest.toLowerCase() } : {}) };
}

/** Validates the GitHub `releases/latest` document and keeps only the fields the checker uses. */
export function parseLatestRelease(json: unknown): LatestRelease {
  if (!json || typeof json !== 'object' || Array.isArray(json)) invalid();
  const record = json as Record<string, unknown>;
  const tag = record.tag_name;
  const html = record.html_url;
  if (typeof tag !== 'string' || !/^v?\d+(\.\d+)*/.test(tag.trim())) invalid();
  if (typeof html !== 'string' || !html.startsWith('https://github.com/')) invalid();
  if (!Array.isArray(record.assets)) invalid();
  return { version: tag.trim().replace(/^v/i, ''), releaseUrl: html, assets: record.assets.map(parseAsset) };
}
