import { execFile } from 'node:child_process';
import { access, constants, readFile, rename, rm, stat } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { compareVersions, UpdateFailure } from '../src/core/update';

/** Runs a command and resolves with its stdout; rejects on a non-zero exit or timeout. */
export type CommandRunner = (command: string, args: string[], timeoutMs: number) => Promise<string>;

export interface MacInstallOptions {
  /** The running application bundle (`…/Typeless.app`); undefined when not running from a packaged bundle. */
  bundlePath?: string;
  run?: CommandRunner;
  log?: (line: string) => void;
}

const mountTimeoutMs = 120_000;
const copyTimeoutMs = 300_000;
const verifyTimeoutMs = 120_000;

export const defaultRunner: CommandRunner = (command, args, timeoutMs) => new Promise((resolve, reject) => {
  execFile(command, args, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
    if (error) reject(new Error(`${command} ${args.join(' ')} failed: ${stderr?.toString().trim() || error.message}`));
    else resolve(stdout.toString());
  });
});

function plistString(plist: string, key: string): string | undefined {
  const match = plist.match(new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`));
  return match?.[1];
}

/** The designated requirement codesign derived for the bundle: `cdhash H"…"` for ad-hoc seals, identifier plus certificate for signed ones. */
async function designatedRequirement(bundle: string, run: CommandRunner): Promise<string | undefined> {
  const output = await run('/usr/bin/codesign', ['-d', '-r-', bundle], verifyTimeoutMs);
  return output.split('\n').map(line => line.trim()).find(line => line.startsWith('designated =>'))?.slice('designated =>'.length).trim() || undefined;
}

async function bundleInfo(bundle: string): Promise<{ id: string; version: string }> {
  const plist = await readFile(join(bundle, 'Contents', 'Info.plist'), 'utf8');
  const id = plistString(plist, 'CFBundleIdentifier');
  const version = plistString(plist, 'CFBundleShortVersionString');
  if (!id || !version) throw new Error('Info.plist lacks the bundle identifier or version.');
  return { id, version };
}

/**
 * Replaces the running application bundle with the one inside a downloaded disk image.
 * Mount → validate (same bundle identifier, expected version, intact code signature) → copy beside the
 * installed bundle → swap with two renames → unmount. The caller relaunches afterwards; the running
 * process keeps its mapped files, so the swap is safe while it is still alive.
 */
export async function installMacUpdate(dmgPath: string, expectedVersion: string, options: MacInstallOptions): Promise<void> {
  const run = options.run ?? defaultRunner;
  const log = options.log ?? (() => {});
  // Electron's fs treats app.asar as a directory it cannot delete, so bundle trees are removed by /bin/rm instead.
  const removeTree = (path: string) => run('/bin/rm', ['-rf', path], copyTimeoutMs);
  const target = options.bundlePath;
  if (!target || !target.endsWith('.app') || target.startsWith('/Volumes/')) throw new UpdateFailure('not_installed');
  let current: { id: string; version: string };
  try { current = await bundleInfo(target); } catch { throw new UpdateFailure('not_installed'); }
  try { await access(dirname(target), constants.W_OK); } catch { throw new UpdateFailure('install_failed'); }

  let mountPoint: string | undefined;
  try {
    let plist: string;
    try { plist = await run('/usr/bin/hdiutil', ['attach', '-nobrowse', '-readonly', '-plist', dmgPath], mountTimeoutMs); }
    catch (error) { log(`mount failed: ${(error as Error).message}`); throw new UpdateFailure('mount_failed'); }
    mountPoint = [...plist.matchAll(/<key>mount-point<\/key>\s*<string>([^<]+)<\/string>/g)].map(match => match[1]).pop();
    if (!mountPoint) throw new UpdateFailure('mount_failed');
    log(`mounted ${dmgPath} at ${mountPoint}`);

    const source = join(mountPoint, basename(target));
    let incoming: { id: string; version: string };
    try { await stat(source); incoming = await bundleInfo(source); } catch { throw new UpdateFailure('invalid_installer'); }
    if (incoming.id !== current.id || compareVersions(incoming.version, expectedVersion) !== 0) {
      log(`installer mismatch: ${incoming.id} ${incoming.version}, expected ${current.id} ${expectedVersion}`);
      throw new UpdateFailure('invalid_installer');
    }
    try { await run('/usr/bin/codesign', ['--verify', '--deep', '--strict', source], verifyTimeoutMs); }
    catch (error) { log(`signature check failed: ${(error as Error).message}`); throw new UpdateFailure('invalid_installer'); }
    // A certificate-signed installation only accepts a bundle sealed by the same certificate; an ad-hoc
    // installation (releases before the fixed identity) accepts any intact bundle so it can move to it.
    const currentRequirement = await designatedRequirement(target, run).catch(() => undefined);
    if (currentRequirement && !currentRequirement.startsWith('cdhash')) {
      const incomingRequirement = await designatedRequirement(source, run).catch(() => undefined);
      if (incomingRequirement !== currentRequirement) {
        log(`signer mismatch: installed ${currentRequirement}, incoming ${incomingRequirement ?? 'none'}`);
        throw new UpdateFailure('invalid_installer');
      }
    }

    const staging = join(dirname(target), `.${basename(target)}.update-${process.pid}`);
    const previous = join(dirname(target), `.${basename(target)}.previous-${process.pid}`);
    await removeTree(staging).catch(() => {});
    try { await run('/usr/bin/ditto', [source, staging], copyTimeoutMs); }
    catch (error) {
      log(`copy failed: ${(error as Error).message}`);
      await removeTree(staging).catch(() => {});
      throw new UpdateFailure('install_failed');
    }
    try { await rename(target, previous); }
    catch (error) { log(`could not move the old bundle aside: ${(error as Error).message}`); await removeTree(staging).catch(() => {}); throw new UpdateFailure('install_failed'); }
    try { await rename(staging, target); }
    catch (error) {
      log(`could not move the new bundle into place: ${(error as Error).message}`);
      await rename(previous, target).catch(() => {});
      await removeTree(staging).catch(() => {});
      throw new UpdateFailure('install_failed');
    }
    await removeTree(previous).catch(error => log(`old bundle left at ${previous}: ${(error as Error).message}`));
    log(`installed ${incoming.version} over ${current.version} at ${target}`);
  } finally {
    if (mountPoint) {
      await run('/usr/bin/hdiutil', ['detach', mountPoint], mountTimeoutMs)
        .catch(() => run('/usr/bin/hdiutil', ['detach', mountPoint!, '-force'], mountTimeoutMs))
        .catch(error => log(`detach failed: ${(error as Error).message}`));
    }
  }
  await rm(dmgPath, { force: true }).catch(() => {});
}
