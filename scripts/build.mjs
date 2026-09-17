import { bundleElectron } from './electron-build.mjs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
for (const args of [['run', 'build:native'], ['run', 'typecheck'], ['exec', '--', 'vite', 'build']]) {
  const result = spawnSync(npm, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
await bundleElectron();
