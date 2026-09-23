// macOS in-place update acceptance: installs a fake newer build over a packaged copy kept under .local/,
// through the real UpdateChecker → installer → relaunch path, and checks that the swapped bundle comes back up.
// Requires `npm run package:mac` output at release/mac-arm64/Typeless.app. It never touches /Applications
// or the real profile: TYPELESS_DATA_DIR and TYPELESS_UPDATE_URL isolate the copy and are forwarded through the relaunch.
import { _electron as electron } from 'playwright';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';

const root = process.cwd();
if (process.platform !== 'darwin') { console.log('[update-e2e] macOS only; nothing to run here.'); process.exit(0); }
const source = resolve(root, 'release', 'mac-arm64', 'Typeless.app');
if (!existsSync(source)) throw new Error('release/mac-arm64/Typeless.app is missing; run npm run package:mac first.');

const stage = name => console.log(`[update-e2e] ${name}`);
const run = (command, args) => execFileSync(command, args, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
const plistValue = (bundle, key) => run('/usr/bin/defaults', ['read', join(bundle, 'Contents', 'Info.plist'), key]).trim();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const processesOf = executable => run('/bin/sh', ['-c', `pgrep -f "${executable}" || true`]).split('\n').map(Number).filter(Boolean);
const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };

mkdirSync(join(root, '.local'), { recursive: true });
const dataRoot = mkdtempSync(join(root, '.local', 'update-e2e-'));
const checks = [];
let server; let app;
try {
  stage('prepare an installed copy and a newer build');
  const applications = join(dataRoot, 'Applications'); mkdirSync(applications);
  const installed = join(applications, 'Typeless.app');
  run('/usr/bin/ditto', [source, installed]);
  const currentVersion = plistValue(installed, 'CFBundleShortVersionString');
  const newerRoot = join(dataRoot, 'newer'); mkdirSync(newerRoot);
  const newer = join(newerRoot, 'Typeless.app');
  run('/usr/bin/ditto', [source, newer]);
  for (const key of ['CFBundleShortVersionString', 'CFBundleVersion']) run('/usr/bin/plutil', ['-replace', key, '-string', '9.0.0', join(newer, 'Contents', 'Info.plist')]);
  // The edited Info.plist breaks the seal, so the bundle is sealed again with the identity the source carries
  // (the release certificate when present, ad hoc otherwise), which is what the installer's signer check expects.
  const signature = run('/bin/sh', ['-c', `/usr/bin/codesign -dvv "${source}" 2>&1`]);
  const authority = signature.match(/^Authority=(.+)$/m)?.[1];
  const identity = /^Signature=adhoc$/m.test(signature) || !authority ? '-' : authority;
  run('/usr/bin/codesign', ['--force', '--deep', '--options', 'runtime', '--entitlements', join(root, 'build', 'entitlements.mac.plist'), '--sign', identity, newer]);
  run('/usr/bin/codesign', ['--verify', '--deep', '--strict', newer]);
  const dmg = join(dataRoot, 'Typeless-9.0.0-arm64.dmg');
  run('/usr/bin/hdiutil', ['create', '-quiet', '-volname', 'Typeless', '-srcfolder', newerRoot, '-format', 'UDZO', dmg]);
  const image = readFileSync(dmg);
  const digest = `sha256:${createHash('sha256').update(image).digest('hex')}`;
  checks.push('fake-newer-build-sealed');

  stage('serve the release document and the image on loopback');
  server = createServer((request, response) => {
    if (request.url === '/releases/latest') {
      const port = server.address().port;
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ tag_name: 'v9.0.0', html_url: 'https://github.com/gaojunbin/Typeless/releases/tag/v9.0.0', assets: [{ name: 'Typeless-9.0.0-arm64.dmg', browser_download_url: `http://127.0.0.1:${port}/download/Typeless-9.0.0-arm64.dmg`, size: image.length, digest }] }));
    } else if (request.url === '/download/Typeless-9.0.0-arm64.dmg') {
      response.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': String(image.length) });
      response.end(image);
    } else { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const updateUrl = `http://127.0.0.1:${server.address().port}/releases/latest`;

  stage('launch the installed copy with an isolated profile');
  const profile = join(dataRoot, 'data'); mkdirSync(join(profile, 'settings'), { recursive: true });
  writeFileSync(join(profile, 'settings', 'state.json'), JSON.stringify({ settings: { general: { setupCompleted: true } }, secrets: {} }), { mode: 0o600 });
  const executable = join(installed, 'Contents', 'MacOS', 'Typeless');
  const env = { ...process.env, TYPELESS_DATA_DIR: profile, TYPELESS_UPDATE_URL: updateUrl };
  app = await electron.launch({ executablePath: executable, args: [], env, timeout: 30000 });
  const firstPid = app.process().pid;
  // The installer logs each step on the main process's stdout; keep those lines for the receipt.
  const installerLog = [];
  for (const stream of [app.process().stdout, app.process().stderr]) stream?.on('data', chunk => { for (const line of chunk.toString().split('\n')) if (line.includes('[update]')) { installerLog.push(line.trim()); console.log(`[main] ${line.trim()}`); } });
  let page;
  for (let attempt = 0; attempt < 150 && !page; attempt++) { page = app.windows().find(window => window.url().endsWith('#default')); if (!page) await sleep(100); }
  assert.ok(page, 'main window');
  await page.waitForFunction(() => Boolean(window.typeless), undefined, { timeout: 15000 });
  const snapshot = () => page.evaluate(() => window.typeless.getSnapshot());
  const settle = async (accept, timeoutMs) => { const deadline = Date.now() + timeoutMs; for (;;) { const update = (await snapshot()).update; if (accept(update)) return update; if (Date.now() > deadline) throw new Error(`timed out waiting for update state, last ${JSON.stringify(update)}`); await sleep(250); } };
  assert.equal((await snapshot()).version, currentVersion);

  stage('check, download and install through the real actions');
  await page.evaluate(() => window.typeless.dispatch({ type: 'update.check' }));
  const available = await settle(update => update.status === 'available' || update.status === 'error', 20000);
  assert.equal(available.status, 'available'); assert.equal(available.latestVersion, '9.0.0');
  checks.push('release-check-against-mock');
  await page.evaluate(() => window.typeless.dispatch({ type: 'update.download' }));
  const downloaded = await settle(update => update.status === 'downloaded' || update.status === 'error', 120000);
  assert.equal(downloaded.status, 'downloaded', JSON.stringify(downloaded));
  assert.ok(downloaded.filePath.startsWith(join(profile, 'downloads')));
  checks.push('image-downloaded-with-digest');
  const exited = new Promise(resolve => app.process().once('exit', resolve));
  await page.evaluate(() => { void window.typeless.dispatch({ type: 'update.install' }); });
  await Promise.race([exited, sleep(180000).then(() => { throw new Error('the application did not quit after installing'); })]);
  app = undefined;
  checks.push('old-instance-quit-after-install');

  stage('verify the swapped bundle and the relaunch');
  assert.equal(plistValue(installed, 'CFBundleShortVersionString'), '9.0.0', 'the installed bundle carries the new version');
  run('/usr/bin/codesign', ['--verify', '--deep', '--strict', installed]);
  assert.ok(!existsSync(downloaded.filePath), 'the disk image is removed after a successful install');
  assert.ok(!existsSync(join(applications, `.Typeless.app.previous-${firstPid}`)), 'the old bundle is removed');
  assert.ok(!existsSync(join(applications, `.Typeless.app.update-${firstPid}`)), 'no staging copy is left');
  assert.equal(run('/bin/sh', ['-c', 'mount | grep -c "/Volumes/Typeless" || true']).trim(), '0', 'the image is unmounted');
  checks.push('bundle-swapped-sealed-and-cleaned');
  let relaunched = [];
  for (let attempt = 0; attempt < 120 && relaunched.length === 0; attempt++) { await sleep(500); relaunched = processesOf(executable).filter(pid => pid !== firstPid); }
  assert.equal(relaunched.length, 1, `exactly one relaunched instance, found ${relaunched.join(',')}`);
  await sleep(4000);
  assert.ok(alive(relaunched[0]), 'the relaunched instance stays alive');
  // The relaunched instance received the isolation variables through `open --env`, so it wrote nothing outside the profile.
  assert.ok(existsSync(join(profile, 'logs')), 'the relaunched instance uses the isolated profile');
  checks.push('relaunched-instance-alive-in-isolated-profile');
  process.kill(relaunched[0], 'SIGTERM');
  for (let attempt = 0; attempt < 40 && alive(relaunched[0]); attempt++) await sleep(250);
  if (alive(relaunched[0])) process.kill(relaunched[0], 'SIGKILL');

  const receipt = { ok: true, checks, currentVersion, installedVersion: '9.0.0', signingIdentity: identity, installerLog, dataRoot, limitations: `The newer build is the same application with a bumped version, sealed with ${identity === '-' ? 'an ad-hoc signature' : `the same identity as the source (${identity})`}; the mock serves the image on loopback. TCC grants for the relaunched instance are not exercised.` };
  writeFileSync(join(dataRoot, 'result.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt, null, 2));
} catch (error) {
  writeFileSync(join(dataRoot, 'result.json'), JSON.stringify({ ok: false, checks, error: String(error?.stack || error), dataRoot }, null, 2) + '\n');
  console.error('[update-e2e] failed:', error);
  process.exitCode = 1;
} finally {
  if (app) await app.close().catch(() => {});
  server?.close();
  // The bundles and the image take several hundred megabytes; the receipt and the profile logs stay.
  for (const name of ['Applications', 'newer', 'Typeless-9.0.0-arm64.dmg']) rmSync(join(dataRoot, name), { recursive: true, force: true });
}
