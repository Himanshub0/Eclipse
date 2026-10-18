import fs from 'fs';
import path from 'path';
import type {
  EclipseSettings,
  ThemeMode,
  AccentChoice,
  SearchProviderId,
  StartupMode,
} from '../src/types/settings';

export const STORE_DEFAULT_SETTINGS: EclipseSettings = {
  version: 1,
  theme: 'dark',
  accentColor: 'arsenic-green',
  searchProvider: 'duckduckgo',
  customSearchUrl: 'https://duckduckgo.com/?q=%s',
  homepage: 'https://duckduckgo.com',
  startupMode: 'homepage',
};

export const STORE_SEARCH_TEMPLATES: Record<Exclude<SearchProviderId, 'custom'>, string> = {
  duckduckgo: 'https://duckduckgo.com/?q=%s',
  google: 'https://www.google.com/search?q=%s',
  bing: 'https://www.bing.com/search?q=%s',
};

const VALID_THEMES: ReadonlyArray<ThemeMode> = ['dark', 'light', 'system'];
const VALID_ACCENTS: ReadonlyArray<AccentChoice> = ['arsenic-green', 'ash-grey', 'badge-green'];
const VALID_SEARCH: ReadonlyArray<SearchProviderId> = ['duckduckgo', 'google', 'bing', 'custom'];
const VALID_STARTUP: ReadonlyArray<StartupMode> = ['homepage', 'newtab'];

function validateSettings(value: unknown): Partial<EclipseSettings> {
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

function resolveUserDataDirectory(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const electron = require('electron');
    if (electron?.app?.getPath) {
      return electron.app.getPath('userData');
    }
  } catch {}
  return process.cwd();
}

export class SettingsStore {
  private filePath: string;
  private currentSettings: EclipseSettings;

  constructor(customPath?: string) {
    // Determine path in Electron user profile directory or test override
    if (customPath) {
      this.filePath = customPath;
    } else {
      const userData = resolveUserDataDirectory();
      this.filePath = path.join(userData, 'eclipse-settings.json');
    }
    this.currentSettings = this.loadFromDisk();
  }

  private loadFromDisk(): EclipseSettings {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const validated = validateSettings(parsed);
          return {
            ...STORE_DEFAULT_SETTINGS,
            ...validated,
            version: 1,
          };
        }
      }
    } catch (err) {
      console.warn('[SettingsStore] Warning: could not parse settings from disk, applying defaults:', err);
    }
    return { ...STORE_DEFAULT_SETTINGS };
  }

  private saveToDisk(): void {
    try {
      const data = JSON.stringify(this.currentSettings, null, 2);
      const tmpPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tmpPath, data, 'utf8');
      fs.renameSync(tmpPath, this.filePath);
    } catch (err) {
      console.error('[SettingsStore] Failed to save settings to disk:', err);
    }
  }

  public getSettings(): EclipseSettings {
    return { ...this.currentSettings };
  }

  public updateSettings(partial: Partial<EclipseSettings>): EclipseSettings {
    const validated = validateSettings(partial);
    this.currentSettings = {
      ...this.currentSettings,
      ...validated,
      version: 1,
    };
    this.saveToDisk();
    return this.getSettings();
  }

  public getSearchTemplate(): string {
    const provider = this.currentSettings.searchProvider;
    if (provider === 'custom' && this.currentSettings.customSearchUrl) {
      const custom = this.currentSettings.customSearchUrl;
      return custom.includes('%s') ? custom : `${custom}%s`;
    }
    return STORE_SEARCH_TEMPLATES[provider as keyof typeof STORE_SEARCH_TEMPLATES] || STORE_SEARCH_TEMPLATES.duckduckgo;
  }
}
