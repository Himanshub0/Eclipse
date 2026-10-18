import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import type {
  BrowserApi,
  BrowserAppState,
  ClearDataOptions,
  LayoutBoundsPayload,
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
  stopLoading: (): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.STOP_LOADING);
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
