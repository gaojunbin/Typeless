import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { UpdateChecker } from '../electron/update-checker';
import { UpdateFailure } from '../src/core/update';
import type { UpdateState } from '../src/shared/contracts';

const dirs: string[] = [];
afterEach(() => { dirs.splice(0).forEach(dir => rmSync(dir, { recursive: true, force: true })); });

const releaseUrl = 'https://api.example/releases/latest';
const assetUrl = 'https://github.com/gaojunbin/Typeless/releases/download/v9.0.0/Typeless-9.0.0-arm64.dmg';
const payload = Buffer.from('not really a disk image, but long enough to stream in more than one chunk '.repeat(40));
const digest = `sha256:${createHash('sha256').update(payload).digest('hex')}`;

function release(version: string, options: { digest?: string; asset?: boolean } = {}) {
  return { tag_name: `v${version}`, html_url: `https://github.com/gaojunbin/Typeless/releases/tag/v${version}`, assets: options.asset === false ? [] : [{ name: `Typeless-${version}-arm64.dmg`, browser_download_url: assetUrl, size: payload.length, ...(options.digest ? { digest: options.digest } : {}) }] };
}

function create(latest: unknown, body: Buffer = payload, extra: { installer?: (filePath: string, version: string) => Promise<void>; relaunch?: () => void } = {}) {
  mkdirSync('.local/tests', { recursive: true });
  const downloadsDir = mkdtempSync('.local/tests/update-'); dirs.push(downloadsDir);
  const states: UpdateState[] = [];
  const fetcher = vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url === releaseUrl) return new Response(JSON.stringify(latest), { status: 200, headers: { 'Content-Type': 'application/json' } });
    if (url === assetUrl) return new Response(new Uint8Array(body), { status: 200, headers: { 'Content-Length': String(body.length) } });
    return new Response('missing', { status: 404 });
  }) as unknown as typeof fetch;
  const opened: string[] = [];
  const checker = new UpdateChecker({ currentVersion: '2.1.1', platform: 'darwin', arch: 'arm64', downloadsDir, fetcher, onChange: state => states.push(state), openPath: async path => { opened.push(path); }, openExternal: async url => { opened.push(url); }, ...extra });
  return { checker, states, downloadsDir, opened, fetcher };
}

describe('release check', () => {
  it('reports a newer release with its installer', async () => {
    const { checker, states } = create(release('9.0.0'));
    const state = await checker.check(releaseUrl);
    expect(state).toMatchObject({ status: 'available', currentVersion: '2.1.1', latestVersion: '9.0.0', assetName: 'Typeless-9.0.0-arm64.dmg', releaseUrl: 'https://github.com/gaojunbin/Typeless/releases/tag/v9.0.0' });
    expect(states.map(item => item.status)).toEqual(['checking', 'available']);
  });
  it('reports none when the release is not newer', async () => {
    const { checker } = create(release('2.1.1'));
    expect((await checker.check(releaseUrl)).status).toBe('none');
    const { checker: older } = create(release('2.0.0'));
    expect((await older.check(releaseUrl)).status).toBe('none');
  });
  it('reports no_asset when a newer release lacks an installer for this platform', async () => {
    const { checker } = create(release('9.0.0', { asset: false }));
    expect(await checker.check(releaseUrl)).toMatchObject({ status: 'error', error: 'no_asset', latestVersion: '9.0.0' });
  });
  it('reports network and invalid_response failures', async () => {
    const { checker } = create(release('9.0.0'));
    expect(await checker.check('https://api.example/other')).toMatchObject({ status: 'error', error: 'network' });
    const { checker: garbage } = create({ nonsense: true });
    expect(await garbage.check(releaseUrl)).toMatchObject({ status: 'error', error: 'invalid_response' });
  });
  it('only opens the release page on github.com', async () => {
    const { checker, opened } = create(release('9.0.0'));
    await checker.check(releaseUrl);
    await checker.openRelease();
    expect(opened).toEqual(['https://github.com/gaojunbin/Typeless/releases/tag/v9.0.0']);
  });
});

describe('installer download', () => {
  it('streams the asset, verifies the digest and reports progress then downloaded', async () => {
    const { checker, states, downloadsDir, opened } = create(release('9.0.0', { digest }));
    await checker.check(releaseUrl);
    const state = await checker.download();
    const target = join(downloadsDir, 'Typeless-9.0.0-arm64.dmg');
    expect(state).toMatchObject({ status: 'downloaded', filePath: target, assetName: 'Typeless-9.0.0-arm64.dmg' });
    expect(readFileSync(target).equals(payload)).toBe(true);
    expect(existsSync(`${target}.part`)).toBe(false);
    const progress = states.filter(item => item.status === 'downloading');
    expect(progress.length).toBeGreaterThanOrEqual(1);
    expect(progress[0].progress).toBe(0);
    await checker.open();
    expect(opened).toEqual([target]);
  });
  it('deletes the partial file and reports checksum when the digest does not match', async () => {
    const { checker, downloadsDir } = create(release('9.0.0', { digest: `sha256:${'0'.repeat(64)}` }));
    await checker.check(releaseUrl);
    expect(await checker.download()).toMatchObject({ status: 'error', error: 'checksum' });
    expect(readdirSync(downloadsDir)).toEqual([]);
  });
  it('ignores download requests outside the available state', async () => {
    const { checker, fetcher } = create(release('2.1.1'));
    await checker.check(releaseUrl);
    expect((await checker.download()).status).toBe('none');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe('in-place install', () => {
  it('installs the downloaded release and relaunches', async () => {
    const installer = vi.fn(async () => {});
    const relaunch = vi.fn();
    const { checker, states, downloadsDir } = create(release('9.0.0', { digest }), payload, { installer, relaunch });
    await checker.check(releaseUrl); await checker.download();
    await checker.install();
    expect(installer).toHaveBeenCalledWith(join(downloadsDir, 'Typeless-9.0.0-arm64.dmg'), '9.0.0');
    expect(relaunch).toHaveBeenCalledTimes(1);
    expect(states.at(-1)).toMatchObject({ status: 'installing', latestVersion: '9.0.0', filePath: join(downloadsDir, 'Typeless-9.0.0-arm64.dmg') });
  });
  it('keeps the installer for a manual open and allows a retry when the install fails', async () => {
    const installer = vi.fn<(filePath: string, version: string) => Promise<void>>(async () => { throw new UpdateFailure('install_failed'); });
    const relaunch = vi.fn();
    const { checker, downloadsDir, opened } = create(release('9.0.0', { digest }), payload, { installer, relaunch });
    await checker.check(releaseUrl); await checker.download();
    const failed = await checker.install();
    const target = join(downloadsDir, 'Typeless-9.0.0-arm64.dmg');
    expect(failed).toMatchObject({ status: 'error', error: 'install_failed', filePath: target, latestVersion: '9.0.0' });
    expect(relaunch).not.toHaveBeenCalled();
    await checker.open();
    expect(opened).toEqual([target]);
    installer.mockImplementation(async () => {});
    await checker.install();
    expect(installer).toHaveBeenCalledTimes(2);
    expect(relaunch).toHaveBeenCalledTimes(1);
  });
  it('reports not_installed without an installer and ignores requests before a download', async () => {
    const { checker, downloadsDir } = create(release('9.0.0', { digest }));
    await checker.check(releaseUrl);
    expect((await checker.install()).status).toBe('available');
    await checker.download();
    expect(await checker.install()).toMatchObject({ status: 'error', error: 'not_installed', filePath: join(downloadsDir, 'Typeless-9.0.0-arm64.dmg') });
  });
});
