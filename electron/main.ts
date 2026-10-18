import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import path from 'path';
import { BrowserViewManager } from './browser-view';
import {
  IPC_CHANNELS,
  validateUrlPayload,
  validateTabIdPayload,
  validateLayoutBoundsPayload,
} from './ipc';

let mainWindow: BrowserWindow | null = null;
let browserViewManager: BrowserViewManager | null = null;

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Eclipse',
    backgroundColor: '#101312',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#101312',
      symbolColor: '#E2E6E2',
      height: 44,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  win.removeMenu();

  win.webContents.on('will-navigate', (event, targetUrl) => {
    const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
    if (isDev && targetUrl.startsWith(process.env.VITE_DEV_SERVER_URL!)) {
      return;
    }
    if (!targetUrl.startsWith('file://')) {
      event.preventDefault();
    }
  });

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

  ipcMain.handle(IPC_CHANNELS.CREATE_TAB, async (_event, rawUrl?: unknown) => {
    if (!browserViewManager) return '';
    const initialUrl = typeof rawUrl === 'string' ? validateUrlPayload(rawUrl) : undefined;
    return browserViewManager.createTab(initialUrl);
  });

  ipcMain.handle(IPC_CHANNELS.CLOSE_TAB, async (_event, rawTabId: unknown) => {
    if (!browserViewManager) return;
    const tabId = validateTabIdPayload(rawTabId);
    browserViewManager.closeTab(tabId);
  });

  ipcMain.handle(IPC_CHANNELS.SWITCH_TAB, async (_event, rawTabId: unknown) => {
    if (!browserViewManager) return;
    const tabId = validateTabIdPayload(rawTabId);
    browserViewManager.switchTab(tabId);
  });

  ipcMain.handle(IPC_CHANNELS.GET_STATE, async () => {
    if (!browserViewManager) {
      return { tabs: [], activeTabId: '' };
    }
    return browserViewManager.getAppState();
  });

  ipcMain.handle(IPC_CHANNELS.SET_LAYOUT_BOUNDS, async (_event, rawLayout: unknown) => {
    if (!browserViewManager) return;
    const { sidebarWidth, topBarHeight } = validateLayoutBoundsPayload(rawLayout);
    browserViewManager.setLayoutBounds(sidebarWidth, topBarHeight);
  });
}

async function initializeApp(): Promise<void> {
  Menu.setApplicationMenu(null);
  registerIpcHandlers();

  mainWindow = createMainWindow();
  browserViewManager = new BrowserViewManager(mainWindow, 240, 48);

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    void mainWindow.loadURL(devServerUrl);
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    void mainWindow.loadFile(indexPath);
  }

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
