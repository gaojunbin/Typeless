import { describe, expect, it } from 'vitest';
import { compareVersions, parseLatestRelease, pickAsset, UpdateFailure } from '../src/core/update';

const asset = (name: string) => ({ name, url: `https://github.com/gaojunbin/Typeless/releases/download/v9.0.0/${name}`, size: 1 });

describe('version comparison', () => {
  it('orders dot-separated numbers and ignores a leading v', () => {
    expect(compareVersions('2.1.1', '2.1.0')).toBe(1);
    expect(compareVersions('v2.2.0', '2.1.9')).toBe(1);
    expect(compareVersions('2.1', '2.1.0')).toBe(0);
    expect(compareVersions('2.10.0', '2.9.9')).toBe(1);
    expect(compareVersions('1.9.9', '2.0.0')).toBe(-1);
  });
  it('sorts a prerelease below its plain version', () => {
    expect(compareVersions('2.2.0-beta.1', '2.2.0')).toBe(-1);
    expect(compareVersions('2.2.0', '2.2.0-rc.1')).toBe(1);
    expect(compareVersions('2.2.0+build.5', '2.2.0')).toBe(0);
  });
});

describe('asset selection', () => {
  const assets = [asset('Typeless-9.0.0-arm64.dmg'), asset('Typeless-9.0.0-win.zip'), asset('Typeless-9.0.0-arm64.dmg.blockmap')];
  it('picks the platform installer', () => {
    expect(pickAsset(assets, 'darwin', 'arm64')?.name).toBe('Typeless-9.0.0-arm64.dmg');
    expect(pickAsset(assets, 'win32', 'x64')?.name).toBe('Typeless-9.0.0-win.zip');
  });
  it('returns nothing for platforms or architectures without a build', () => {
    expect(pickAsset(assets, 'darwin', 'x64')).toBeUndefined();
    expect(pickAsset(assets, 'linux', 'x64')).toBeUndefined();
  });
});

describe('latest release parsing', () => {
  const release = { tag_name: 'v9.0.0', html_url: 'https://github.com/gaojunbin/Typeless/releases/tag/v9.0.0', assets: [{ name: 'Typeless-9.0.0-arm64.dmg', browser_download_url: 'https://github.com/x/y.dmg', size: 12, digest: 'sha256:' + 'a'.repeat(64) }] };
  it('keeps the version, page and validated assets', () => {
    const parsed = parseLatestRelease(release);
    expect(parsed.version).toBe('9.0.0');
    expect(parsed.releaseUrl).toBe(release.html_url);
    expect(parsed.assets).toEqual([{ name: 'Typeless-9.0.0-arm64.dmg', url: 'https://github.com/x/y.dmg', size: 12, digest: 'sha256:' + 'a'.repeat(64) }]);
  });
  it('rejects documents that are not a GitHub release', () => {
    for (const bad of [null, [], { tag_name: 'latest', html_url: release.html_url, assets: [] }, { ...release, html_url: 'https://evil.example/' }, { ...release, assets: 'none' },
      { ...release, assets: [{ name: '../escape.dmg', browser_download_url: 'https://github.com/x', size: 1 }] },
      { ...release, assets: [{ name: 'a.dmg', browser_download_url: 'http://github.com/x', size: 1 }] },
      { ...release, assets: [{ name: 'a.dmg', browser_download_url: 'https://github.com/x', size: 1, digest: 'md5:abc' }] }]) {
      expect(() => parseLatestRelease(bad)).toThrow(UpdateFailure);
      try { parseLatestRelease(bad); } catch (error) { expect((error as UpdateFailure).code).toBe('invalid_response'); }
    }
  });
});

describe('download URL trust', () => {
  it('accepts https anywhere and http only on loopback', () => {
    expect(parseLatestRelease({ tag_name: 'v9.0.0', html_url: 'https://github.com/x/y/releases/tag/v9.0.0', assets: [{ name: 'a.dmg', browser_download_url: 'http://127.0.0.1:8080/a.dmg', size: 1 }] }).assets[0].url).toBe('http://127.0.0.1:8080/a.dmg');
    expect(() => parseLatestRelease({ tag_name: 'v9.0.0', html_url: 'https://github.com/x/y/releases/tag/v9.0.0', assets: [{ name: 'a.dmg', browser_download_url: 'http://example.com/a.dmg', size: 1 }] })).toThrow(UpdateFailure);
  });
});
