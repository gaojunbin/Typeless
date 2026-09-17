import { bundleElectron } from './electron-build.mjs';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const native = spawnSync(process.execPath, ['scripts/build-native.mjs'], { cwd: root, stdio: 'inherit' });
if (native.status !== 0) process.exit(native.status ?? 1);
await bundleElectron();
const server = await createServer();
await server.listen();
server.printUrls();
const child = spawn(process.execPath, ['scripts/launch.mjs'], {
  cwd: root,
  env: { ...process.env, VITE_DEV_SERVER_URL: 'http://127.0.0.1:5173' },
  stdio: 'inherit',
});
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  child.kill();
  await server.close();
}
child.on('exit', async code => { await close(); process.exitCode = code ?? 0; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, close);
