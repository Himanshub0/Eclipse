import fs from 'fs';
import path from 'path';

export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  visitedAt: number;
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

export class HistoryStore {
  private filePath: string;
  private entries: HistoryEntry[] = [];
  private maxEntries = 500;

  constructor(customPath?: string) {
    if (customPath) {
      this.filePath = customPath;
    } else {
      const userData = resolveUserDataDirectory();
      this.filePath = path.join(userData, 'eclipse-history.json');
    }
    this.entries = this.loadFromDisk();
  }

  private loadFromDisk(): HistoryEntry[] {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (item) =>
              item &&
              typeof item.id === 'string' &&
              typeof item.url === 'string' &&
              typeof item.title === 'string' &&
              typeof item.visitedAt === 'number'
          );
        }
      }
    } catch (err) {
      console.warn('[HistoryStore] Could not load history from disk:', err);
    }
    return [];
  }

  private saveToDisk(): void {
    try {
      const data = JSON.stringify(this.entries, null, 2);
      const tmpPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tmpPath, data, 'utf8');
      fs.renameSync(tmpPath, this.filePath);
    } catch (err) {
      console.error('[HistoryStore] Failed to save history to disk:', err);
    }
  }

  public getHistory(): HistoryEntry[] {
    return [...this.entries];
  }

  public addEntry(url: string, title: string): HistoryEntry | null {
    const trimmedUrl = url.trim();
    if (!trimmedUrl || trimmedUrl === 'about:blank' || trimmedUrl.startsWith('view-source:')) {
      return null;
    }

    // Skip if last entry has the same URL within 5 seconds (deduplicate)
    if (this.entries.length > 0) {
      const last = this.entries[0];
      if (last.url === trimmedUrl && Date.now() - last.visitedAt < 5000) {
        if (title && title !== 'New Tab' && last.title !== title) {
          last.title = title;
          this.saveToDisk();
        }
        return last;
      }
    }

    const entry: HistoryEntry = {
      id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      url: trimmedUrl,
      title: title.trim() || trimmedUrl,
      visitedAt: Date.now(),
    };

    this.entries.unshift(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.length = this.maxEntries;
    }

    this.saveToDisk();
    return entry;
  }

  public deleteEntry(id: string): boolean {
    const prevLen = this.entries.length;
    this.entries = this.entries.filter((e) => e.id !== id);
    if (this.entries.length !== prevLen) {
      this.saveToDisk();
      return true;
    }
    return false;
  }

  public clearHistory(): void {
    this.entries = [];
    this.saveToDisk();
  }
}
