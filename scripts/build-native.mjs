import { spawnSync } from 'node:child_process';
import { mkdirSync, copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'native', 'bin');
mkdirSync(out, { recursive: true });
if (process.platform === 'darwin') {
  const architecture = { arm64: 'arm64', x64: 'x86_64' }[process.arch];
  if (!architecture) throw new Error(`Unsupported macOS architecture: ${process.arch}`);
  const cache = resolve(root, '.cache', 'swift-modules');
  mkdirSync(cache, { recursive: true });
  const result = spawnSync('xcrun', ['swiftc', '-O', '-target', `${architecture}-apple-macos13.0`, '-module-cache-path', cache,
    resolve(root, 'native/macos/Main.swift'), resolve(root, 'native/macos/Paste.swift'), resolve(root, 'native/macos/TapRecognizer.swift'),
    '-framework', 'AppKit', '-framework', 'ApplicationServices',
    '-o', resolve(out, 'typeless-native')], { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} else if (process.platform === 'win32') {
  for (const file of ['Helper.cs', 'launch.ps1']) copyFileSync(resolve(root, 'native/windows', file), resolve(out, file));
  console.log('Windows native helper sources staged. The launcher compiles in memory on Windows.');
} else {
  console.error('Native dictation supports macOS and Windows only.');
  process.exitCode = 1;
}
