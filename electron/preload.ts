import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import type { BrowserApi, BrowserAppState, LayoutBoundsPayload } from '../src/types/browser';
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
};

contextBridge.exposeInMainWorld('browserApi', browserApi);
