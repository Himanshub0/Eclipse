import type { ClearDataOptions } from '../src/types/browser';
import type { EclipseSettings, ThemeMode, AccentChoice, SearchProviderId, StartupMode } from '../src/types/settings';

export const IPC_CHANNELS = {
  NAVIGATE: 'browser:navigate',
  GO_BACK: 'browser:go-back',
  GO_FORWARD: 'browser:go-forward',
  RELOAD: 'browser:reload',
  STOP_LOADING: 'browser:stop-loading',
  CREATE_TAB: 'browser:create-tab',
  CLOSE_TAB: 'browser:close-tab',
  SWITCH_TAB: 'browser:switch-tab',
  GET_STATE: 'browser:get-state',
  STATE_CHANGED: 'browser:state-changed',
  SET_LAYOUT_BOUNDS: 'browser:set-layout-bounds',
  SET_SETTINGS_OPEN: 'browser:set-settings-open',

  // Settings
  GET_SETTINGS: 'settings:get',
  UPDATE_SETTINGS: 'settings:update',
  SETTINGS_CHANGED: 'settings:changed',
  GET_RUNTIME_VERSIONS: 'system:get-versions',

  // Privacy
  CLEAR_BROWSING_DATA: 'privacy:clear-data',

  // Downloads
  GET_DOWNLOADS: 'downloads:get',
  DOWNLOADS_CHANGED: 'downloads:changed',
  OPEN_DOWNLOAD: 'downloads:open',
  SHOW_DOWNLOAD_IN_FOLDER: 'downloads:show-in-folder',
  CANCEL_DOWNLOAD: 'downloads:cancel',
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];

export function validateUrlPayload(value: unknown): string {
  if (typeof value !== 'string') {
    throw new TypeError(`Invalid URL payload: expected string, received ${typeof value}`);
  }
  const trimmed = value.trim();
  if (trimmed.length > 4096) {
    throw new RangeError('URL payload exceeds maximum permitted length of 4096 characters');
  }
  return trimmed;
}

export function validateTabIdPayload(value: unknown): string {
  if (typeof value !== 'string') {
    throw new TypeError(`Invalid tab ID payload: expected string, received ${typeof value}`);
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 64) {
    throw new RangeError('Tab ID must be a non-empty string <= 64 characters');
  }
  return trimmed;
}

export function validateLayoutBoundsPayload(value: unknown): {
  sidebarWidth: number;
  topBarHeight: number;
} {
  if (!value || typeof value !== 'object') {
    throw new TypeError('Layout payload must be an object');
  }
  const obj = value as Record<string, unknown>;
  const sidebarWidth = Number(obj.sidebarWidth);
  const topBarHeight = Number(obj.topBarHeight);

  if (!Number.isFinite(sidebarWidth) || sidebarWidth < 0 || sidebarWidth > 600) {
    throw new RangeError(`Invalid sidebar width ${sidebarWidth}`);
  }
  if (!Number.isFinite(topBarHeight) || topBarHeight < 0 || topBarHeight > 300) {
    throw new RangeError(`Invalid top bar height ${topBarHeight}`);
  }

  return {
    sidebarWidth: Math.round(sidebarWidth),
    topBarHeight: Math.round(topBarHeight),
  };
}

export function validateClearDataPayload(value: unknown): ClearDataOptions {
  if (!value || typeof value !== 'object') {
    throw new TypeError('Clear data options must be an object');
  }
  const obj = value as Record<string, unknown>;
  return {
    cache: Boolean(obj.cache),
    cookies: Boolean(obj.cookies),
    storage: Boolean(obj.storage),
  };
}

const VALID_THEMES: ReadonlyArray<ThemeMode> = ['dark', 'light', 'system'];
const VALID_ACCENTS: ReadonlyArray<AccentChoice> = ['arsenic-green', 'ash-grey', 'badge-green'];
const VALID_SEARCH: ReadonlyArray<SearchProviderId> = ['duckduckgo', 'google', 'bing', 'custom'];
const VALID_STARTUP: ReadonlyArray<StartupMode> = ['homepage', 'newtab'];

export function validateSettingsPayload(value: unknown): Partial<EclipseSettings> {
  if (!value || typeof value !== 'object') {
    throw new TypeError('Settings payload must be an object');
  }
  const obj = value as Record<string, unknown>;
  const out: Partial<EclipseSettings> = {};

  if (typeof obj.theme === 'string' && VALID_THEMES.includes(obj.theme as ThemeMode)) {
    out.theme = obj.theme as ThemeMode;
  }
  if (typeof obj.accentColor === 'string' && VALID_ACCENTS.includes(obj.accentColor as AccentChoice)) {
    out.accentColor = obj.accentColor as AccentChoice;
  }
  if (typeof obj.searchProvider === 'string' && VALID_SEARCH.includes(obj.searchProvider as SearchProviderId)) {
    out.searchProvider = obj.searchProvider as SearchProviderId;
  }
  if (typeof obj.startupMode === 'string' && VALID_STARTUP.includes(obj.startupMode as StartupMode)) {
    out.startupMode = obj.startupMode as StartupMode;
  }
  if (typeof obj.homepage === 'string') {
    out.homepage = obj.homepage.trim().slice(0, 4096);
  }
  if (typeof obj.customSearchUrl === 'string') {
    out.customSearchUrl = obj.customSearchUrl.trim().slice(0, 4096);
  }

  return out;
}
