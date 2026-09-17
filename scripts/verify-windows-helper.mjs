import { existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cache = join(root, '.cache');
const local = join(cache, 'dotnet', process.platform === 'win32' ? 'dotnet.exe' : 'dotnet');
const executable = existsSync(local) ? local : 'dotnet';
const output = join(cache, 'windows-compile');
mkdirSync(output, { recursive: true });
const env = {
  ...process.env,
  DOTNET_CLI_HOME: join(cache, 'dotnet-cli'),
  NUGET_PACKAGES: join(cache, 'nuget'),
  DOTNET_CLI_TELEMETRY_OPTOUT: '1',
  DOTNET_SKIP_FIRST_TIME_EXPERIENCE: '1',
  DOTNET_GENERATE_ASPNET_CERTIFICATE: 'false',
  DOTNET_CLI_UI_LANGUAGE: 'en',
  TMPDIR: cache,
};
const result = spawnSync(executable, ['build', join(root, 'native/windows/Helper.csproj'),
  '--configuration', 'Release', '--nologo',
  `-p:BaseIntermediateOutputPath=${join(output, 'obj')}/`,
  `-p:OutputPath=${join(output, 'bin')}/`], { cwd: root, env, stdio: 'inherit' });
if (result.error) throw new Error('Install a .NET SDK into .cache/dotnet or make dotnet available, then rerun this verifier.', { cause: result.error });
process.exitCode = result.status ?? 1;
if (result.status === 0) console.log('Windows helper compiled against .NET Framework 4.8 references with C# 5. Windows runtime behavior was not tested.');
