import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const entryScript = path.join(root, 'scripts', 'test-webcontents-entry.cjs');

async function main() {
  const electronPkg = await import('electron');
  const electronBinary = electronPkg.default;

  console.log('[RUNNER] Spawning Electron with strict 4000ms timeout...');
  console.log('[RUNNER] Binary:', electronBinary);
  console.log('[RUNNER] Entry:', entryScript);

  const child = spawn(electronBinary, [entryScript], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (d) => {
    stdout += d.toString();
  });

  child.stderr.on('data', (d) => {
    stderr += d.toString();
  });

  const exitCode = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch {}
      reject(new Error('Test timed out after 4000ms'));
    }, 4000);

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve(code);
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

  console.log('\n--- Test Execution Output ---');
  console.log(stdout.trim());
  if (stderr.trim()) {
    console.log('--- Stderr ---');
    console.log(stderr.trim());
  }
  console.log('--- Exit Code ---');
  console.log('Exit Code:', exitCode);

  if (exitCode !== 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[RUNNER_FAILED]', err);
  process.exit(1);
});
