import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import type {
  BrowserApi,
  BrowserAppState,
  ClearDataOptions,
  LayoutBoundsPayload,
  FindInPageOptions,
  FindInPageResult,
  BookmarkItem,
  HistoryItem,
  BrowserAction,
} from '../src/types/browser';
import type { EclipseSettings, RuntimeVersions, DownloadItemInfo } from '../src/types/settings';
import { IPC_CHANNELS } from './ipc';

const browserApi: BrowserApi = {
  navigate: (url: string): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.NAVIGATE, url);
  },
  goBack: (): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GO_BACK);
  },
  goForward: (): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GO_FORWARD);
  },
  reload: (): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.RELOAD);
  },
  reloadIgnoringCache: (): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.RELOAD_IGNORING_CACHE);
  },
  stopLoading: (): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.STOP_LOADING);
  },
  openHomepage: (): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.OPEN_HOMEPAGE);
  },
  openLocalFile: (): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.OPEN_LOCAL_FILE);
  },
  viewSource: (): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.VIEW_SOURCE);
  },
  print: (): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PRINT);
  },
  savePage: (): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SAVE_PAGE);
  },
  createTab: (url?: string): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CREATE_TAB, url);
  },
  closeTab: (tabId: string): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CLOSE_TAB, tabId);
  },
  switchTab: (tabId: string): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SWITCH_TAB, tabId);
  },
  reopenClosedTab: (): Promise<string | null> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REOPEN_CLOSED_TAB);
  },
  moveTab: (direction: 'left' | 'right'): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.MOVE_TAB, direction);
  },
  getState: (): Promise<BrowserAppState> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_STATE);
  },
  onStateChange: (callback: (state: BrowserAppState) => void): (() => void) => {
    const subscription = (_event: IpcRendererEvent, state: BrowserAppState) => {
      callback(state);
    };
    ipcRenderer.on(IPC_CHANNELS.STATE_CHANGED, subscription);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.STATE_CHANGED, subscription);
    };
  },
  setLayoutBounds: (layout: LayoutBoundsPayload): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SET_LAYOUT_BOUNDS, layout);
  },
  setSettingsOpen: (open: boolean): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SET_SETTINGS_OPEN, open);
  },

  // Windows & Screen
  newWindow: (url?: string, isPrivate?: boolean): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.NEW_WINDOW, url, isPrivate);
  },
  toggleFullscreen: (): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TOGGLE_FULLSCREEN);
  },

  // Zoom
  zoomIn: (): Promise<number> => {
    return ipcRenderer.invoke(IPC_CHANNELS.ZOOM_IN);
  },
  zoomOut: (): Promise<number> => {
    return ipcRenderer.invoke(IPC_CHANNELS.ZOOM_OUT);
  },
  resetZoom: (): Promise<number> => {
    return ipcRenderer.invoke(IPC_CHANNELS.RESET_ZOOM);
  },
  getZoomLevel: (): Promise<number> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_ZOOM);
  },

  // Find In Page
  findInPage: (text: string, options?: FindInPageOptions): Promise<number> => {
    return ipcRenderer.invoke(IPC_CHANNELS.FIND_IN_PAGE, text, options);
  },
  stopFindInPage: (action?: 'clearSelection' | 'keepSelection' | 'activateSelection'): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.STOP_FIND_IN_PAGE, action);
  },
  onFindResult: (callback: (result: FindInPageResult) => void): (() => void) => {
    const subscription = (_event: IpcRendererEvent, result: FindInPageResult) => {
      callback(result);
    };
    ipcRenderer.on(IPC_CHANNELS.FOUND_IN_PAGE, subscription);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.FOUND_IN_PAGE, subscription);
    };
  },

  // Bookmarks
  getBookmarks: (): Promise<BookmarkItem[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_BOOKMARKS);
  },
  toggleBookmark: (url: string, title: string): Promise<{ isBookmarked: boolean; bookmark: BookmarkItem | null }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TOGGLE_BOOKMARK, url, title);
  },
  removeBookmark: (urlOrId: string): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REMOVE_BOOKMARK, urlOrId);
  },
  isBookmarked: (url: string): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.IS_BOOKMARKED, url);
  },
  onBookmarksChange: (callback: (bookmarks: BookmarkItem[]) => void): (() => void) => {
    const subscription = (_event: IpcRendererEvent, bookmarks: BookmarkItem[]) => {
      callback(bookmarks);
    };
    ipcRenderer.on(IPC_CHANNELS.BOOKMARKS_CHANGED, subscription);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.BOOKMARKS_CHANGED, subscription);
    };
  },

  // History
  getHistory: (): Promise<HistoryItem[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_HISTORY);
  },
  clearHistory: (): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CLEAR_HISTORY);
  },
  deleteHistoryEntry: (id: string): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DELETE_HISTORY_ENTRY, id);
  },
  onHistoryChange: (callback: (history: HistoryItem[]) => void): (() => void) => {
    const subscription = (_event: IpcRendererEvent, history: HistoryItem[]) => {
      callback(history);
    };
    ipcRenderer.on(IPC_CHANNELS.HISTORY_CHANGED, subscription);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.HISTORY_CHANGED, subscription);
    };
  },

  // Centralized action triggers from keyboard shortcuts
  onActionTriggered: (callback: (action: BrowserAction) => void): (() => void) => {
    const subscription = (_event: IpcRendererEvent, action: BrowserAction) => {
      callback(action);
    };
    ipcRenderer.on(IPC_CHANNELS.TRIGGER_ACTION, subscription);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.TRIGGER_ACTION, subscription);
    };
  },

  // Settings
  getSettings: (): Promise<EclipseSettings> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS);
  },
  updateSettings: (partial: Partial<EclipseSettings>): Promise<EclipseSettings> => {
    return ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SETTINGS, partial);
  },
  onSettingsChange: (callback: (settings: EclipseSettings) => void): (() => void) => {
    const subscription = (_event: IpcRendererEvent, settings: EclipseSettings) => {
      callback(settings);
    };
    ipcRenderer.on(IPC_CHANNELS.SETTINGS_CHANGED, subscription);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.SETTINGS_CHANGED, subscription);
    };
  },
  getRuntimeVersions: (): Promise<RuntimeVersions> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_RUNTIME_VERSIONS);
  },

  // Privacy
  clearBrowsingData: (options: ClearDataOptions): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CLEAR_BROWSING_DATA, options);
  },

  // Downloads
  getDownloads: (): Promise<DownloadItemInfo[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_DOWNLOADS);
  },
  onDownloadsChange: (callback: (downloads: DownloadItemInfo[]) => void): (() => void) => {
    const subscription = (_event: IpcRendererEvent, downloads: DownloadItemInfo[]) => {
      callback(downloads);
    };
    ipcRenderer.on(IPC_CHANNELS.DOWNLOADS_CHANGED, subscription);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.DOWNLOADS_CHANGED, subscription);
    };
  },
  openDownload: (id: string): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.OPEN_DOWNLOAD, id);
  },
  showDownloadInFolder: (id: string): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SHOW_DOWNLOAD_IN_FOLDER, id);
  },
  cancelDownload: (id: string): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CANCEL_DOWNLOAD, id);
  },
};

contextBridge.exposeInMainWorld('browserApi', browserApi);
