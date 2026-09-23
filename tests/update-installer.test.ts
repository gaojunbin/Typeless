import { afterEach, describe, expect, it } from 'vitest';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { installMacUpdate, type CommandRunner } from '../electron/update-installer';
import { UpdateFailure } from '../src/core/update';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

function plist(id: string, version: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<plist version="1.0"><dict><key>CFBundleIdentifier</key><string>${id}</string><key>CFBundleShortVersionString</key><string>${version}</string></dict></plist>\n`;
}

function bundle(dir: string, name: string, id: string, version: string, marker: string) {
  const app = join(dir, name);
  mkdirSync(join(app, 'Contents', 'MacOS'), { recursive: true });
  writeFileSync(join(app, 'Contents', 'Info.plist'), plist(id, version));
  writeFileSync(join(app, 'Contents', 'MacOS', 'Typeless'), marker);
  return app;
}

/** A fake `hdiutil` / `codesign` / `ditto` that mounts a prepared folder and copies with the file system. */
function fakeTools(mountDir: string, options: { codesignFails?: boolean; dittoFails?: boolean; attachFails?: boolean; installedRequirement?: string; incomingRequirement?: string } = {}) {
  const calls: string[][] = [];
  const run: CommandRunner = async (command, args) => {
    calls.push([command, ...args]);
    if (command.endsWith('hdiutil') && args[0] === 'attach') {
      if (options.attachFails) throw new Error('hdiutil: attach failed - no mountable file systems');
      return `<plist><array><dict><key>dev-entry</key><string>/dev/disk9</string></dict><dict><key>mount-point</key><string>${mountDir}</string></dict></array></plist>`;
    }
    if (command.endsWith('hdiutil') && args[0] === 'detach') return '';
    if (command.endsWith('codesign') && args[0] === '-d') {
      const requirement = args[2].includes('Volumes') ? options.incomingRequirement ?? 'cdhash H"bbbb"' : options.installedRequirement ?? 'cdhash H"aaaa"';
      return `Executable=${args[2]}/Contents/MacOS/Typeless\ndesignated => ${requirement}\n`;
    }
    if (command.endsWith('codesign')) { if (options.codesignFails) throw new Error('code object is not signed at all'); return ''; }
    if (command.endsWith('ditto')) { if (options.dittoFails) throw new Error('ditto: Permission denied'); cpSync(args[0], args[1], { recursive: true }); return ''; }
    if (command === '/bin/rm') { rmSync(args[1], { recursive: true, force: true }); return ''; }
    throw new Error(`unexpected command ${command}`);
  };
  return { run, calls };
}

function setup(options: { incomingVersion?: string; incomingId?: string } & NonNullable<Parameters<typeof fakeTools>[1]> = {}) {
  const root = mkdtempSync(join(process.cwd(), '.local', 'tests', 'installer-')); roots.push(root);
  const applications = join(root, 'Applications'); mkdirSync(applications);
  const mount = join(root, 'Volumes', 'Typeless'); mkdirSync(mount, { recursive: true });
  const target = bundle(applications, 'Typeless.app', 'dev.typeless.app', '2.3.0', 'old binary');
  bundle(mount, 'Typeless.app', options.incomingId ?? 'dev.typeless.app', options.incomingVersion ?? '9.0.0', 'new binary');
  const dmg = join(root, 'Typeless-9.0.0-arm64.dmg'); writeFileSync(dmg, 'not really a dmg');
  const tools = fakeTools(mount, options);
  const log: string[] = [];
  return { root, applications, target, dmg, tools, log, install: () => installMacUpdate(dmg, '9.0.0', { bundlePath: target, run: tools.run, log: line => log.push(line) }) };
}

const failsWith = async (promise: Promise<unknown>, code: string) => {
  try { await promise; throw new Error('expected failure'); }
  catch (error) { expect(error).toBeInstanceOf(UpdateFailure); expect((error as UpdateFailure).code).toBe(code); }
};

describe('macOS in-place install', () => {
  it('mounts, validates, swaps the bundle, unmounts and removes the disk image', async () => {
    const { target, dmg, tools, install, applications } = setup();
    await install();
    expect(readFileSync(join(target, 'Contents', 'MacOS', 'Typeless'), 'utf8')).toBe('new binary');
    expect(readFileSync(join(target, 'Contents', 'Info.plist'), 'utf8')).toContain('9.0.0');
    expect(existsSync(dmg)).toBe(false);
    expect(readFileSync(join(applications, '..', 'Volumes', 'Typeless', 'Typeless.app', 'Contents', 'MacOS', 'Typeless'), 'utf8')).toBe('new binary');
    const names = tools.calls.map(call => `${call[0].split('/').pop()} ${call[1]}`);
    expect(names).toEqual(['hdiutil attach', 'codesign --verify', 'codesign -d', 'rm -rf', 'ditto ' + join(applications, '..', 'Volumes', 'Typeless', 'Typeless.app'), 'rm -rf', 'hdiutil detach']);
    expect(existsSync(join(applications, `.Typeless.app.previous-${process.pid}`))).toBe(false);
    expect(existsSync(join(applications, `.Typeless.app.update-${process.pid}`))).toBe(false);
  });

  it('refuses when not running from an installed bundle', async () => {
    const { dmg, tools } = setup();
    await failsWith(installMacUpdate(dmg, '9.0.0', { bundlePath: undefined, run: tools.run }), 'not_installed');
    await failsWith(installMacUpdate(dmg, '9.0.0', { bundlePath: '/Volumes/Typeless/Typeless.app', run: tools.run }), 'not_installed');
    expect(tools.calls).toHaveLength(0);
  });

  it('rejects a disk image whose app has another version or identifier, and still unmounts', async () => {
    for (const variant of [{ incomingVersion: '8.9.9' }, { incomingId: 'com.example.other' }]) {
      const { target, dmg, tools, install } = setup(variant);
      await failsWith(install(), 'invalid_installer');
      expect(readFileSync(join(target, 'Contents', 'MacOS', 'Typeless'), 'utf8')).toBe('old binary');
      expect(existsSync(dmg)).toBe(true);
      expect(tools.calls.at(-1)?.slice(0, 2).join(' ')).toBe('/usr/bin/hdiutil detach');
    }
  });

  it('rejects an app whose signature does not verify', async () => {
    const { target, install } = setup({ codesignFails: true });
    await failsWith(install(), 'invalid_installer');
    expect(readFileSync(join(target, 'Contents', 'MacOS', 'Typeless'), 'utf8')).toBe('old binary');
  });

  it('requires the same signing certificate once the installation is certificate-signed', async () => {
    const signed = 'identifier "dev.typeless.desktop" and certificate leaf = H"1111"';
    const same = setup({ installedRequirement: signed, incomingRequirement: signed });
    await same.install();
    expect(readFileSync(join(same.target, 'Contents', 'MacOS', 'Typeless'), 'utf8')).toBe('new binary');
    for (const incoming of ['cdhash H"cccc"', 'identifier "dev.typeless.desktop" and certificate leaf = H"2222"']) {
      const other = setup({ installedRequirement: signed, incomingRequirement: incoming });
      await failsWith(other.install(), 'invalid_installer');
      expect(readFileSync(join(other.target, 'Contents', 'MacOS', 'Typeless'), 'utf8')).toBe('old binary');
      expect(other.log.some(line => line.startsWith('signer mismatch'))).toBe(true);
    }
    // An ad-hoc installation is the state before the fixed identity existed; it accepts the first signed build.
    const migrating = setup({ installedRequirement: 'cdhash H"aaaa"', incomingRequirement: signed });
    await migrating.install();
    expect(readFileSync(join(migrating.target, 'Contents', 'MacOS', 'Typeless'), 'utf8')).toBe('new binary');
  });

  it('reports mount_failed when the image cannot be attached', async () => {
    const { install, tools } = setup({ attachFails: true });
    await failsWith(install(), 'mount_failed');
    expect(tools.calls.some(call => call[1] === 'detach')).toBe(false);
  });

  it('leaves the installed bundle untouched and cleans the staging copy when copying fails', async () => {
    const { target, applications, install, dmg } = setup({ dittoFails: true });
    await failsWith(install(), 'install_failed');
    expect(readFileSync(join(target, 'Contents', 'MacOS', 'Typeless'), 'utf8')).toBe('old binary');
    expect(existsSync(join(applications, `.Typeless.app.update-${process.pid}`))).toBe(false);
    expect(existsSync(dmg)).toBe(true);
  });
});
