import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { BrowserViewManager } from './browser-view';
import { IPC_CHANNELS, validateUrlPayload, validateHeightPayload } from './ipc';

let mainWindow: BrowserWindow | null = null;
let browserViewManager: BrowserViewManager | null = null;

const INITIAL_HOMEPAGE = 'https://duckduckgo.com';

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Project Browser',
    backgroundColor: '#18181b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Security: Prevent navigation of the main application chrome window to external websites
  win.webContents.on('will-navigate', (event, targetUrl) => {
    const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
    if (isDev && targetUrl.startsWith(process.env.VITE_DEV_SERVER_URL!)) {
      return;
    }
    // In production, only allow loading local files
    if (!targetUrl.startsWith('file://')) {
      event.preventDefault();
    }
  });

  // Security: Deny window.open requests from the UI window
  win.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  return win;
}

function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.NAVIGATE, async (_event, rawUrl: unknown) => {
    if (!browserViewManager) return false;
    const validated = validateUrlPayload(rawUrl);
    return browserViewManager.navigate(validated);
  });

  ipcMain.handle(IPC_CHANNELS.GO_BACK, async () => {
    if (!browserViewManager) return false;
    return browserViewManager.goBack();
  });

  ipcMain.handle(IPC_CHANNELS.GO_FORWARD, async () => {
    if (!browserViewManager) return false;
    return browserViewManager.goForward();
  });

  ipcMain.handle(IPC_CHANNELS.RELOAD, async () => {
    if (!browserViewManager) return false;
    return browserViewManager.reload();
  });

  ipcMain.handle(IPC_CHANNELS.GET_STATE, async () => {
    if (!browserViewManager) {
      return {
        url: '',
        title: '',
        isLoading: false,
        canGoBack: false,
        canGoForward: false,
        error: null,
      };
    }
    return browserViewManager.getState();
  });

  ipcMain.handle(IPC_CHANNELS.SET_TOOLBAR_HEIGHT, async (_event, rawHeight: unknown) => {
    if (!browserViewManager) return;
    const height = validateHeightPayload(rawHeight);
    browserViewManager.setToolbarHeight(height);
  });
}

async function initializeApp(): Promise<void> {
  registerIpcHandlers();

  mainWindow = createMainWindow();
  browserViewManager = new BrowserViewManager(mainWindow, 76);

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    void mainWindow.loadURL(devServerUrl);
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    void mainWindow.loadFile(indexPath);
  }

  // Initial navigation to homepage in browser view
  void browserViewManager.navigate(INITIAL_HOMEPAGE);

  mainWindow.show();
  mainWindow.focus();

  if (process.env.SMOKE_TEST === '1') {
    console.log('[SMOKE_TEST] Window and WebContentsView initialized successfully.');
    setTimeout(() => {
      console.log('[SMOKE_TEST] Exiting smoke test cleanly.');
      app.quit();
    }, 2500);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    browserViewManager = null;
  });
}

// App lifecycle
app.whenReady().then(initializeApp).catch((err) => {
  const fs = require('fs');
  fs.writeFileSync('startup_error.log', `Fatal error during application startup: ${err?.stack || err}\n`);
  console.error('Fatal error during application startup:', err);
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void initializeApp();
  }
});
