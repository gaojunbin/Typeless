import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const target = process.argv[2];
if (!['mac', 'win', 'installer'].includes(target)) throw new Error('Choose mac, win, or installer.');
const temporaryDirectory = path.join(root, '.cache', 'packaging-tmp');
mkdirSync(temporaryDirectory, { recursive: true });
const env = {
  ...process.env,
  TMPDIR: temporaryDirectory,
  TMP: temporaryDirectory,
  TEMP: temporaryDirectory,
  ELECTRON_CACHE: path.join(root, '.cache', 'electron'),
  electron_config_cache: path.join(root, '.cache', 'electron'),
  ELECTRON_BUILDER_CACHE: path.join(root, '.cache', 'electron-builder'),
  CSC_IDENTITY_AUTO_DISCOVERY: 'false',
};
const build = spawnSync(process.execPath, ['scripts/build.mjs'], { cwd: root, env, stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);
const args = target === 'mac' ? ['--mac', 'dmg', '--arm64'] : ['--win', target === 'installer' ? 'nsis' : 'zip', '--x64'];
if (target === 'mac' && process.platform === 'darwin' && process.arch === 'arm64') args.push('--config.electronDist=node_modules/electron/dist');
const packaged = spawnSync(process.execPath, [require.resolve('electron-builder/out/cli/cli.js'), ...args], { cwd: root, env, stdio: 'inherit' });
process.exitCode = packaged.status ?? 1;
