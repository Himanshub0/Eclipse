import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

async function run() {
  const electronPkg = await import('electron');
  const electronBinary = electronPkg.default;

  console.log('[RUNNER] Launching Electron in BENCHMARK mode...');

  const child = spawn(electronBinary, ['.'], {
    cwd: root,
    env: {
      ...process.env,
      BENCHMARK: '1',
      ELECTRON_ENABLE_LOGGING: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (d) => {
    const s = d.toString();
    stdout += s;
    process.stdout.write(s);
  });

  child.stderr.on('data', (d) => {
    const s = d.toString();
    stderr += s;
    process.stderr.write(s);
  });

  await new Promise((resolve, reject) => {
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Benchmark exited with code ${code}`));
    });
    child.on('error', reject);
  });

  console.log('[RUNNER] Benchmark completed successfully.');
}

run().catch((err) => {
  console.error('[RUNNER_ERROR]', err);
  process.exit(1);
});
