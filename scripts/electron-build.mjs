import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export async function bundleElectron() {
  await build({
    absWorkingDir: root,
    entryPoints: { main: 'electron/main.ts', preload: 'electron/preload.ts' },
    bundle: true, platform: 'node', format: 'cjs', target: 'node22',
    external: ['electron'], outdir: 'dist-electron', outExtension: { '.js': '.cjs' },
    sourcemap: true, logLevel: 'info',
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await bundleElectron();
