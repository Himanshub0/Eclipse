/**
 * Core navigation, tab management, and IPC contract types for Eclipse.
 */

export interface TabItem {
  id: string;
  url: string;
  title: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  error?: string | null;
}

export interface BrowserAppState {
  tabs: TabItem[];
  activeTabId: string;
}

export interface LayoutBoundsPayload {
  sidebarWidth: number;
  topBarHeight: number;
}

export interface BrowserApi {
  navigate: (url: string) => Promise<boolean>;
  goBack: () => Promise<boolean>;
  goForward: () => Promise<boolean>;
  reload: () => Promise<boolean>;
  createTab: (url?: string) => Promise<string>;
  closeTab: (tabId: string) => Promise<void>;
  switchTab: (tabId: string) => Promise<void>;
  getState: () => Promise<BrowserAppState>;
  onStateChange: (callback: (state: BrowserAppState) => void) => () => void;
  setLayoutBounds: (layout: LayoutBoundsPayload) => Promise<void>;
}

declare global {
  interface Window {
    browserApi: BrowserApi;
  }
}
