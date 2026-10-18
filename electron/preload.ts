import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import type { BrowserApi, BrowserNavState } from '../src/types/browser';
import { IPC_CHANNELS } from './ipc';

/**
 * Preload script exposing a strictly scoped, type-safe API to the React UI.
 *
 * Security guarantees:
 * - contextIsolation: true, sandbox: true.
 * - ipcRenderer is NEVER exposed directly to window or DOM.
 * - Only explicit, whitelisted methods with defined signatures are exposed.
 */
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
  getState: (): Promise<BrowserNavState> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_STATE);
  },
  onStateChange: (callback: (state: BrowserNavState) => void): (() => void) => {
    const subscription = (_event: IpcRendererEvent, state: BrowserNavState) => {
      callback(state);
    };
    ipcRenderer.on(IPC_CHANNELS.STATE_CHANGED, subscription);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.STATE_CHANGED, subscription);
    };
  },
  setToolbarHeight: (height: number): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SET_TOOLBAR_HEIGHT, height);
  },
};

contextBridge.exposeInMainWorld('browserApi', browserApi);
