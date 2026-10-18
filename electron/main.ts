import { app, BrowserWindow, ipcMain, Menu, session, dialog } from 'electron';
import path from 'path';
import { performance } from 'perf_hooks';
import { BrowserViewManager, WindowDelegate } from './browser-view';
import { SettingsStore } from './settings-store';
import { BookmarksStore } from './bookmarks-store';
import { HistoryStore } from './history-store';
import { DownloadsManager } from './downloads-manager';
import { runPerformanceBenchmark } from './benchmark';
import {
  IPC_CHANNELS,
  validateUrlPayload,
  validateTabIdPayload,
  validateLayoutBoundsPayload,
  validateSettingsPayload,
  validateClearDataPayload,
  validateFindInPageOptions,
  validateMoveTabDirection,
} from './ipc';
import type { RuntimeVersions } from '../src/types/settings';

const processStartTime = performance.now();

// Chromium performance & hardware acceleration switches
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-background-timer-throttling');

let mainWindow: BrowserWindow | null = null;
let browserViewManager: BrowserViewManager | null = null;
const windowManagers = new Map<number, BrowserViewManager>();

const settingsStore = new SettingsStore();
const bookmarksStore = new BookmarksStore();
const historyStore = new HistoryStore();
const downloadsManager = new DownloadsManager();

function getManagerForEvent(event: Electron.IpcMainInvokeEvent): BrowserViewManager | null {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && windowManagers.has(win.id)) {
    return windowManagers.get(win.id)!;
  }
  return browserViewManager;
}

function showTaskManager(): void {
  const metrics = app.getAppMetrics();
  let msg = 'Process Metrics:\n\n';
  for (const m of metrics) {
    const memoryMB = Math.round((m.memory.workingSetSize || 0) / 1024);
    msg += `• [${m.type}] PID ${m.pid}: CPU ${m.cpu.percentCPUUsage.toFixed(1)}%, Mem ${memoryMB} MB\n`;
  }
  dialog.showMessageBox({
    type: 'info',
    title: 'Eclipse Task Manager',
    message: 'Active Processes & System Performance',
    detail: msg,
    buttons: ['OK'],
  });
}

const windowDelegate: WindowDelegate = {
  onNewWindow: (url?: string, isPrivate = false) => {
    createAppWindow(url, isPrivate);
  },
  onOpenTaskManager: () => {
    showTaskManager();
  },
};

function createAppWindow(initialUrl?: string, isPrivate = false): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: isPrivate ? 'Eclipse (Private)' : 'Eclipse',
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
      partition: isPrivate ? `private-${Date.now()}` : undefined,
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

  const manager = new BrowserViewManager(
    win,
    settingsStore,
    bookmarksStore,
    historyStore,
    windowDelegate,
    240,
    44
  );
  windowManagers.set(win.id, manager);

  if (!mainWindow) {
    mainWindow = win;
    browserViewManager = manager;
    downloadsManager.setWindow(win);
  }

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    void win.loadURL(devServerUrl);
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    void win.loadFile(indexPath);
  }

  win.once('ready-to-show', () => {
    win.show();
    win.focus();
    if (initialUrl) {
      manager.createTab(initialUrl);
    }
  });

  win.on('closed', () => {
    manager.destroy();
    windowManagers.delete(win.id);
    if (mainWindow === win) {
      const remaining = BrowserWindow.getAllWindows();
      if (remaining.length > 0) {
        mainWindow = remaining[0];
        browserViewManager = windowManagers.get(mainWindow.id) || null;
      } else {
        mainWindow = null;
        browserViewManager = null;
      }
    }
  });

  return win;
}

function registerIpcHandlers(): void {
  // Navigation & Tabs
  ipcMain.handle(IPC_CHANNELS.NAVIGATE, async (event, rawUrl: unknown) => {
    const mgr = getManagerForEvent(event);
    if (!mgr) return false;
    const validated = validateUrlPayload(rawUrl);
    return mgr.navigate(validated);
  });

  ipcMain.handle(IPC_CHANNELS.GO_BACK, async (event) => {
    const mgr = getManagerForEvent(event);
    if (!mgr) return false;
    return mgr.goBack();
  });

  ipcMain.handle(IPC_CHANNELS.GO_FORWARD, async (event) => {
    const mgr = getManagerForEvent(event);
    if (!mgr) return false;
    return mgr.goForward();
  });

  ipcMain.handle(IPC_CHANNELS.RELOAD, async (event) => {
    const mgr = getManagerForEvent(event);
    if (!mgr) return false;
    return mgr.reload();
  });

  ipcMain.handle(IPC_CHANNELS.RELOAD_IGNORING_CACHE, async (event) => {
    const mgr = getManagerForEvent(event);
    if (!mgr) return false;
    return mgr.reloadIgnoringCache();
  });

  ipcMain.handle(IPC_CHANNELS.STOP_LOADING, async (event) => {
    const mgr = getManagerForEvent(event);
    if (!mgr) return false;
    return mgr.stopLoading();
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_HOMEPAGE, async (event) => {
    const mgr = getManagerForEvent(event);
    if (!mgr) return false;
    return mgr.openHomepage();
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_LOCAL_FILE, async (event) => {
    const mgr = getManagerForEvent(event);
    if (!mgr) return false;
    return mgr.openLocalFile();
  });

  ipcMain.handle(IPC_CHANNELS.VIEW_SOURCE, async (event) => {
    const mgr = getManagerForEvent(event);
    if (!mgr) return false;
    return mgr.viewSource();
  });

  ipcMain.handle(IPC_CHANNELS.PRINT, async (event) => {
    const mgr = getManagerForEvent(event);
    if (!mgr) return false;
    return mgr.print();
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_PAGE, async (event) => {
    const mgr = getManagerForEvent(event);
    if (!mgr) return false;
    return mgr.savePage();
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_TAB, async (event, rawUrl?: unknown) => {
    const mgr = getManagerForEvent(event);
    if (!mgr) return '';
    const initialUrl = typeof rawUrl === 'string' ? validateUrlPayload(rawUrl) : undefined;
    return mgr.createTab(initialUrl);
  });

  ipcMain.handle(IPC_CHANNELS.CLOSE_TAB, async (event, rawTabId: unknown) => {
    const mgr = getManagerForEvent(event);
    if (!mgr) return;
    const tabId = validateTabIdPayload(rawTabId);
    mgr.closeTab(tabId);
  });

  ipcMain.handle(IPC_CHANNELS.SWITCH_TAB, async (event, rawTabId: unknown) => {
    const mgr = getManagerForEvent(event);
    if (!mgr) return;
    const tabId = validateTabIdPayload(rawTabId);
    mgr.switchTab(tabId);
  });

  ipcMain.handle(IPC_CHANNELS.REOPEN_CLOSED_TAB, async (event) => {
    const mgr = getManagerForEvent(event);
    if (!mgr) return null;
    return mgr.reopenClosedTab();
  });

  ipcMain.handle(IPC_CHANNELS.MOVE_TAB, async (event, rawDirection: unknown) => {
    const mgr = getManagerForEvent(event);
    if (!mgr) return;
    const dir = validateMoveTabDirection(rawDirection);
    mgr.moveTab(dir);
  });

  ipcMain.handle(IPC_CHANNELS.GET_STATE, async (event) => {
    const mgr = getManagerForEvent(event);
    if (!mgr) {
      return { tabs: [], activeTabId: '' };
    }
    return mgr.getAppState();
  });

  ipcMain.handle(IPC_CHANNELS.SET_LAYOUT_BOUNDS, async (event, rawLayout: unknown) => {
    const mgr = getManagerForEvent(event);
    if (!mgr) return;
    const { sidebarWidth, topBarHeight } = validateLayoutBoundsPayload(rawLayout);
    mgr.setLayoutBounds(sidebarWidth, topBarHeight);
  });

  ipcMain.handle(IPC_CHANNELS.SET_SETTINGS_OPEN, async (event, rawOpen: unknown) => {
    const mgr = getManagerForEvent(event);
    if (!mgr) return;
    mgr.setSettingsOpen(Boolean(rawOpen));
  });

  // Windows & Screen
  ipcMain.handle(IPC_CHANNELS.NEW_WINDOW, async (_event, rawUrl?: unknown, isPrivate?: unknown) => {
    const url = typeof rawUrl === 'string' ? validateUrlPayload(rawUrl) : undefined;
    createAppWindow(url, Boolean(isPrivate));
  });

  ipcMain.handle(IPC_CHANNELS.TOGGLE_FULLSCREEN, async (event) => {
    const mgr = getManagerForEvent(event);
    if (!mgr) return false;
    return mgr.toggleFullscreen();
  });

  // Zoom
  ipcMain.handle(IPC_CHANNELS.ZOOM_IN, async (event) => {
    const mgr = getManagerForEvent(event);
    return mgr ? mgr.zoomIn() : 0;
  });

  ipcMain.handle(IPC_CHANNELS.ZOOM_OUT, async (event) => {
    const mgr = getManagerForEvent(event);
    return mgr ? mgr.zoomOut() : 0;
  });

  ipcMain.handle(IPC_CHANNELS.RESET_ZOOM, async (event) => {
    const mgr = getManagerForEvent(event);
    return mgr ? mgr.resetZoom() : 0;
  });

  ipcMain.handle(IPC_CHANNELS.GET_ZOOM, async (event) => {
    const mgr = getManagerForEvent(event);
    return mgr ? mgr.getZoomLevel() : 0;
  });

  // Find In Page
  ipcMain.handle(IPC_CHANNELS.FIND_IN_PAGE, async (event, rawText: unknown, rawOptions: unknown) => {
    const mgr = getManagerForEvent(event);
    if (!mgr || typeof rawText !== 'string') return 0;
    const options = validateFindInPageOptions(rawOptions);
    return mgr.findInPage(rawText, options);
  });

  ipcMain.handle(IPC_CHANNELS.STOP_FIND_IN_PAGE, async (event, rawAction: unknown) => {
    const mgr = getManagerForEvent(event);
    if (!mgr) return;
    const action =
      rawAction === 'keepSelection' || rawAction === 'activateSelection'
        ? rawAction
        : 'clearSelection';
    mgr.stopFindInPage(action);
  });

  // Bookmarks
  ipcMain.handle(IPC_CHANNELS.GET_BOOKMARKS, async () => {
    return bookmarksStore.getBookmarks();
  });

  ipcMain.handle(IPC_CHANNELS.TOGGLE_BOOKMARK, async (_event, rawUrl: unknown, rawTitle: unknown) => {
    const url = validateUrlPayload(rawUrl);
    const title = typeof rawTitle === 'string' ? rawTitle.trim() : url;
    const result = bookmarksStore.toggleBookmark(url, title);
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC_CHANNELS.BOOKMARKS_CHANGED, bookmarksStore.getBookmarks());
    }
    return result;
  });

  ipcMain.handle(IPC_CHANNELS.REMOVE_BOOKMARK, async (_event, rawUrlOrId: unknown) => {
    if (typeof rawUrlOrId !== 'string') return false;
    const ok = bookmarksStore.removeBookmark(rawUrlOrId);
    if (ok) {
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send(IPC_CHANNELS.BOOKMARKS_CHANGED, bookmarksStore.getBookmarks());
      }
    }
    return ok;
  });

  ipcMain.handle(IPC_CHANNELS.IS_BOOKMARKED, async (_event, rawUrl: unknown) => {
    if (typeof rawUrl !== 'string') return false;
    return bookmarksStore.isBookmarked(rawUrl);
  });

  // History
  ipcMain.handle(IPC_CHANNELS.GET_HISTORY, async () => {
    return historyStore.getHistory();
  });

  ipcMain.handle(IPC_CHANNELS.CLEAR_HISTORY, async () => {
    historyStore.clearHistory();
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC_CHANNELS.HISTORY_CHANGED, []);
    }
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_HISTORY_ENTRY, async (_event, rawId: unknown) => {
    if (typeof rawId !== 'string') return false;
    const ok = historyStore.deleteEntry(rawId);
    if (ok) {
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send(IPC_CHANNELS.HISTORY_CHANGED, historyStore.getHistory());
      }
    }
    return ok;
  });

  // Settings
  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, async () => {
    return settingsStore.getSettings();
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_SETTINGS, async (_event, rawSettings: unknown) => {
    const updated = settingsStore.updateSettings(validateSettingsPayload(rawSettings));
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC_CHANNELS.SETTINGS_CHANGED, updated);
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
  const readyTime = performance.now();
  Menu.setApplicationMenu(null);
  registerIpcHandlers();

  downloadsManager.initialize();
  createAppWindow();

  if (process.env.BENCHMARK === '1') {
    if (mainWindow && browserViewManager) {
      mainWindow.webContents.once('did-finish-load', () => {
        const firstPageTime = performance.now();
        void runPerformanceBenchmark(processStartTime, readyTime, firstPageTime, browserViewManager!, mainWindow!);
      });
    }
    return;
  }

  if (process.env.SMOKE_TEST === '1') {
    console.log('[SMOKE_TEST] Window and WebContentsView initialized successfully.');
    setTimeout(() => {
      console.log('[SMOKE_TEST] Exiting smoke test cleanly.');
      app.exit(0);
    }, 1000);
  }
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
