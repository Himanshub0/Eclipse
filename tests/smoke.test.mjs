import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

test('Electron runtime smoke test', async (t) => {
  await t.test('boots Electron, initializes window and WebContentsView, and exits cleanly', async () => {
    const electronPkg = await import('electron');
    const electronBinary = electronPkg.default;

    const child = spawn(electronBinary, ['.'], {
      cwd: root,
      env: {
        ...process.env,
        SMOKE_TEST: '1',
        ELECTRON_ENABLE_LOGGING: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    const exitCode = await new Promise((resolve) => {
      child.on('close', resolve);
    });

    console.log('Smoke test stdout:', stdout);
    if (stderr) console.log('Smoke test stderr:', stderr);

    assert.equal(exitCode, 0, `Expected Electron to exit with code 0, received ${exitCode}`);
    assert.match(
      stdout,
      /\[SMOKE_TEST\] Window and WebContentsView initialized successfully\./,
      'Expected confirmation that Window and WebContentsView initialized'
    );
  });
});
