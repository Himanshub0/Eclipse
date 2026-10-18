/**
 * Typed configuration and settings model for Eclipse Browser.
 */

export type ThemeMode = 'dark' | 'light' | 'system';
export type AccentChoice = 'arsenic-green' | 'ash-grey' | 'badge-green';
export type SearchProviderId = 'duckduckgo' | 'google' | 'bing' | 'custom';
export type StartupMode = 'homepage' | 'newtab';

export interface EclipseSettings {
  version: 1;
  theme: ThemeMode;
  accentColor: AccentChoice;
  searchProvider: SearchProviderId;
  customSearchUrl: string;
  homepage: string;
  startupMode: StartupMode;
  adBlockerEnabled?: boolean;
  tabDiscardingEnabled?: boolean;
}

export const SEARCH_TEMPLATES: Record<Exclude<SearchProviderId, 'custom'>, string> = {
  duckduckgo: 'https://duckduckgo.com/?q=%s',
  google: 'https://www.google.com/search?q=%s',
  bing: 'https://www.bing.com/search?q=%s',
};

export const DEFAULT_SETTINGS: EclipseSettings = {
  version: 1,
  theme: 'dark',
  accentColor: 'arsenic-green',
  searchProvider: 'duckduckgo',
  customSearchUrl: 'https://duckduckgo.com/?q=%s',
  homepage: 'https://duckduckgo.com',
  startupMode: 'homepage',
  adBlockerEnabled: true,
  tabDiscardingEnabled: true,
};

export interface RuntimeVersions {
  eclipse: string;
  electron: string;
  chrome: string;
  node: string;
  platform: string;
}

export interface DownloadItemInfo {
  id: string;
  filename: string;
  url: string;
  savePath: string;
  receivedBytes: number;
  totalBytes: number;
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted';
  startTime: number;
}
