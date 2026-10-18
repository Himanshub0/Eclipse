import { createServer } from 'vite';
import { spawn, execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

async function start() {
  console.log('[dev] Building Electron main and preload bundles...');
  execSync('node scripts/build-electron.mjs --dev', { stdio: 'inherit', cwd: root });

  console.log('[dev] Launching Vite development server...');
  const server = await createServer({
    configFile: path.join(root, 'vite.config.ts'),
    root,
    server: { port: 5173 },
  });
  await server.listen();
  const serverUrl = 'http://localhost:5173';
  console.log(`[dev] Vite server active at: ${serverUrl}`);

  const electronPkg = await import('electron');
  const electronBinary = electronPkg.default;

  console.log('[dev] Spawning Electron application process...');
  const child = spawn(electronBinary, ['.'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, VITE_DEV_SERVER_URL: serverUrl },
  });

  child.on('close', async (exitCode) => {
    console.log(`[dev] Electron process terminated with code: ${exitCode}`);
    await server.close();
    process.exit(exitCode || 0);
  });
}

start().catch((err) => {
  console.error('[dev] Startup failed:', err);
  process.exit(1);
});
