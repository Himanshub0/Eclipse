import { app, BrowserWindow, ipcMain, Menu, session } from 'electron';
import path from 'path';
import { BrowserViewManager } from './browser-view';
import { SettingsStore } from './settings-store';
import { DownloadsManager } from './downloads-manager';
import {
  IPC_CHANNELS,
  validateUrlPayload,
  validateTabIdPayload,
  validateLayoutBoundsPayload,
  validateSettingsPayload,
  validateClearDataPayload,
} from './ipc';
import type { RuntimeVersions } from '../src/types/settings';

let mainWindow: BrowserWindow | null = null;
let browserViewManager: BrowserViewManager | null = null;
const settingsStore = new SettingsStore();
const downloadsManager = new DownloadsManager();

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
  // Navigation & Tabs
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

  ipcMain.handle(IPC_CHANNELS.STOP_LOADING, async () => {
    if (!browserViewManager) return false;
    return browserViewManager.stopLoading();
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

  ipcMain.handle(IPC_CHANNELS.SET_SETTINGS_OPEN, async (_event, rawOpen: unknown) => {
    if (!browserViewManager) return;
    browserViewManager.setSettingsOpen(Boolean(rawOpen));
  });

  // Settings
  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, async () => {
    return settingsStore.getSettings();
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_SETTINGS, async (_event, rawSettings: unknown) => {
    const updated = settingsStore.updateSettings(validateSettingsPayload(rawSettings));
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.SETTINGS_CHANGED, updated);
    }
    return updated;
  });

  ipcMain.handle(IPC_CHANNELS.GET_RUNTIME_VERSIONS, async (): Promise<RuntimeVersions> => {
    return {
      eclipse: '0.1.0',
      electron: process.versions.electron || '34.5.8',
      chrome: process.versions.chrome || '134.0.6998.35',
      node: process.versions.node || '22.0.0',
      platform: process.platform,
    };
  });

  // Privacy
  ipcMain.handle(IPC_CHANNELS.CLEAR_BROWSING_DATA, async (_event, rawOptions: unknown) => {
    const opts = validateClearDataPayload(rawOptions);
    try {
      if (opts.cache) {
        await session.defaultSession.clearCache();
      }
      if (opts.cookies || opts.storage) {
        const storages: ('cookies' | 'localstorage' | 'indexdb' | 'websql' | 'serviceworkers' | 'cachestorage')[] = [];
        if (opts.cookies) storages.push('cookies');
        if (opts.storage) {
          storages.push('localstorage', 'indexdb', 'websql', 'serviceworkers', 'cachestorage');
        }
        await session.defaultSession.clearStorageData({ storages });
      }
      return true;
    } catch (err) {
      console.error('[Privacy] Failed to clear browsing data:', err);
      return false;
    }
  });

  // Downloads
  ipcMain.handle(IPC_CHANNELS.GET_DOWNLOADS, async () => {
    return downloadsManager.getDownloads();
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_DOWNLOAD, async (_event, rawId: unknown) => {
    const id = validateTabIdPayload(rawId);
    return downloadsManager.openDownload(id);
  });

  ipcMain.handle(IPC_CHANNELS.SHOW_DOWNLOAD_IN_FOLDER, async (_event, rawId: unknown) => {
    const id = validateTabIdPayload(rawId);
    return downloadsManager.showInFolder(id);
  });

  ipcMain.handle(IPC_CHANNELS.CANCEL_DOWNLOAD, async (_event, rawId: unknown) => {
    const id = validateTabIdPayload(rawId);
    return downloadsManager.cancelDownload(id);
  });
}

async function initializeApp(): Promise<void> {
  Menu.setApplicationMenu(null);
  registerIpcHandlers();

  mainWindow = createMainWindow();
  downloadsManager.initialize();
  downloadsManager.setWindow(mainWindow);
  browserViewManager = new BrowserViewManager(mainWindow, settingsStore, 240, 44);

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
      app.exit(0);
    }, 1000);
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
