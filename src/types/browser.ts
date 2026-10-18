import type { EclipseSettings, RuntimeVersions, DownloadItemInfo } from './settings';

export interface TabItem {
  id: string;
  url: string;
  title: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  error?: string | null;
  favicon?: string | null;
  isDiscarded?: boolean;
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

export interface BookmarkItem {
  id: string;
  url: string;
  title: string;
  createdAt: number;
}

export interface HistoryItem {
  id: string;
  url: string;
  title: string;
  visitedAt: number;
}

export interface FindInPageOptions {
  forward?: boolean;
  findNext?: boolean;
  matchCase?: boolean;
}

export interface FindInPageResult {
  activeMatchOrdinal: number;
  matches: number;
  finalUpdate: boolean;
}

export type BrowserAction =
  | 'focus-address-bar'
  | 'find-in-page'
  | 'find-next'
  | 'find-prev'
  | 'open-history'
  | 'open-downloads'
  | 'open-bookmarks'
  | 'toggle-bookmarks-bar'
  | 'open-clear-data'
  | 'open-settings'
  | 'toggle-sidebar'
  | 'cycle-focus';

export interface BrowserApi {
  // Navigation & Tabs
  navigate: (url: string) => Promise<boolean>;
  goBack: () => Promise<boolean>;
  goForward: () => Promise<boolean>;
  reload: () => Promise<boolean>;
  reloadIgnoringCache: () => Promise<boolean>;
  stopLoading: () => Promise<boolean>;
  openHomepage: () => Promise<boolean>;
  openLocalFile: () => Promise<boolean>;
  viewSource: () => Promise<boolean>;
  print: () => Promise<boolean>;
  savePage: () => Promise<boolean>;
  createTab: (url?: string) => Promise<string>;
  closeTab: (tabId: string) => Promise<void>;
  switchTab: (tabId: string) => Promise<void>;
  reopenClosedTab: () => Promise<string | null>;
  moveTab: (direction: 'left' | 'right') => Promise<void>;
  getState: () => Promise<BrowserAppState>;
  onStateChange: (callback: (state: BrowserAppState) => void) => () => void;
  setLayoutBounds: (layout: LayoutBoundsPayload) => Promise<void>;
  setSettingsOpen: (open: boolean) => Promise<void>;

  // Windows & Screen
  newWindow: (url?: string, isPrivate?: boolean) => Promise<void>;
  toggleFullscreen: () => Promise<boolean>;

  // Zoom
  zoomIn: () => Promise<number>;
  zoomOut: () => Promise<number>;
  resetZoom: () => Promise<number>;
  getZoomLevel: () => Promise<number>;

  // Find In Page
  findInPage: (text: string, options?: FindInPageOptions) => Promise<number>;
  stopFindInPage: (action?: 'clearSelection' | 'keepSelection' | 'activateSelection') => Promise<void>;
  onFindResult: (callback: (result: FindInPageResult) => void) => () => void;

  // Bookmarks
  getBookmarks: () => Promise<BookmarkItem[]>;
  toggleBookmark: (url: string, title: string) => Promise<{ isBookmarked: boolean; bookmark: BookmarkItem | null }>;
  removeBookmark: (urlOrId: string) => Promise<boolean>;
  isBookmarked: (url: string) => Promise<boolean>;
  onBookmarksChange: (callback: (bookmarks: BookmarkItem[]) => void) => () => void;

  // History
  getHistory: () => Promise<HistoryItem[]>;
  clearHistory: () => Promise<void>;
  deleteHistoryEntry: (id: string) => Promise<boolean>;
  onHistoryChange: (callback: (history: HistoryItem[]) => void) => () => void;

  // Centralized action triggers from keyboard shortcuts
  onActionTriggered: (callback: (action: BrowserAction) => void) => () => void;

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

  // Performance & AdBlocker
  preresolveHost?: (host: string) => Promise<boolean>;
  getAdBlockerStats?: () => Promise<{ blockedCount: number; isEnabled: boolean }>;
  discardTab?: (tabId: string) => Promise<boolean>;
  getSystemMetrics?: () => Promise<any>;
}

declare global {
  interface Window {
    browserApi: BrowserApi;
  }
}
