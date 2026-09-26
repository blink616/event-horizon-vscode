import { build } from 'esbuild';
import { mkdir, copyFile, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const companion = path.join(root, 'companion');
const output = path.join(companion, 'dist');
await mkdir(output, { recursive: true });
await Promise.all([
  build({
    entryPoints: [path.join(companion, 'src/extension.ts')],
    outfile: path.join(output, 'extension.cjs'),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    external: ['vscode'],
    logLevel: 'warning',
  }),
  build({
    entryPoints: [path.join(companion, 'src/webview/visualizer.ts')],
    outfile: path.join(output, 'visualizer.js'),
    bundle: true,
    platform: 'browser',
    format: 'iife',
    target: 'es2022',
    logLevel: 'warning',
  }),
  copyFile(path.join(root, 'images/icon.png'), path.join(companion, 'media/icon.png')),
]);

if (!process.argv.includes('--web-only')) {
  if (process.platform !== 'darwin')
    throw new Error(
      'Build the native helper on macOS, or pass --web-only to validate the TypeScript UI.',
    );
  const app = path.join(output, 'native/HorizonAudio.app');
  const contents = path.join(app, 'Contents');
  const binary = path.join(contents, 'MacOS/horizon-audio');
  const cache = path.join(output, 'swift-cache');
  await mkdir(path.dirname(binary), { recursive: true });
  await mkdir(cache, { recursive: true });
  const plist = path.join(contents, 'Info.plist');
  await copyFile(path.join(companion, 'native/Info.plist'), plist);
  execFileSync(
    'xcrun',
    [
      'swiftc',
      '-swift-version',
      '5',
      '-O',
      '-target',
      `${process.arch === 'arm64' ? 'arm64' : 'x86_64'}-apple-macos14.2`,
      '-module-cache-path',
      cache,
      '-framework',
      'CoreAudio',
      '-framework',
      'Foundation',
      '-Xlinker',
      '-sectcreate',
      '-Xlinker',
      '__TEXT',
      '-Xlinker',
      '__info_plist',
      '-Xlinker',
      plist,
      path.join(companion, 'native/HorizonAudio.swift'),
      '-o',
      binary,
    ],
    { stdio: 'inherit' },
  );
  // Local development signature. Public releases require Developer ID signing + notarization.
  execFileSync('codesign', ['--force', '--sign', '-', app], { stdio: 'inherit' });
  execFileSync(binary, ['--self-test'], { stdio: 'inherit' });
}

if (process.argv.includes('--package')) {
  const manifest = JSON.parse(await readFile(path.join(companion, 'package.json'), 'utf8')) as {
    version: string;
  };
  await mkdir(path.join(root, 'dist'), { recursive: true });
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules/@vscode/vsce/vsce'),
      'package',
      '--no-dependencies',
      '--target',
      `darwin-${process.arch}`,
      '--out',
      path.join(root, `dist/horizon-pulse-${manifest.version}-darwin-${process.arch}.vsix`),
    ],
    { cwd: companion, stdio: 'inherit' },
  );
}
console.log('Built Horizon Pulse. System audio remains off until Start is pressed.');
