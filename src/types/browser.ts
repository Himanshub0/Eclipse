import type { EclipseSettings, RuntimeVersions, DownloadItemInfo } from './settings';

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

export interface ClearDataOptions {
  cache: boolean;
  cookies: boolean;
  storage: boolean;
}

export interface BrowserApi {
  // Navigation & Tabs
  navigate: (url: string) => Promise<boolean>;
  goBack: () => Promise<boolean>;
  goForward: () => Promise<boolean>;
  reload: () => Promise<boolean>;
  stopLoading: () => Promise<boolean>;
  createTab: (url?: string) => Promise<string>;
  closeTab: (tabId: string) => Promise<void>;
  switchTab: (tabId: string) => Promise<void>;
  getState: () => Promise<BrowserAppState>;
  onStateChange: (callback: (state: BrowserAppState) => void) => () => void;
  setLayoutBounds: (layout: LayoutBoundsPayload) => Promise<void>;
  setSettingsOpen: (open: boolean) => Promise<void>;

  // Settings & Runtime
  getSettings: () => Promise<EclipseSettings>;
  updateSettings: (partial: Partial<EclipseSettings>) => Promise<EclipseSettings>;
  onSettingsChange: (callback: (settings: EclipseSettings) => void) => () => void;
  getRuntimeVersions: () => Promise<RuntimeVersions>;

  // Privacy & Data
  clearBrowsingData: (options: ClearDataOptions) => Promise<boolean>;

  // Downloads
  getDownloads: () => Promise<DownloadItemInfo[]>;
  onDownloadsChange: (callback: (downloads: DownloadItemInfo[]) => void) => () => void;
  openDownload: (id: string) => Promise<boolean>;
  showDownloadInFolder: (id: string) => Promise<boolean>;
  cancelDownload: (id: string) => Promise<boolean>;
}

declare global {
  interface Window {
    browserApi: BrowserApi;
  }
}
