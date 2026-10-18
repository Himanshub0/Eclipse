import esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const isDev = process.argv.includes('--dev');

async function build() {
  await esbuild.build({
    entryPoints: [
      path.join(root, 'electron/main.ts'),
      path.join(root, 'electron/preload.ts'),
    ],
    bundle: true,
    platform: 'node',
    target: 'node22',
    outdir: path.join(root, 'dist-electron'),
    outExtension: { '.js': '.cjs' },
    external: ['electron', '@ghostery/adblocker-electron'],
    sourcemap: isDev ? 'inline' : false,
    minify: !isDev,
    logLevel: 'info',
  });
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
