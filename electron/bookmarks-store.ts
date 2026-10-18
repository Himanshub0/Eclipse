import fs from 'fs';
import path from 'path';

export interface BookmarkEntry {
  id: string;
  url: string;
  title: string;
  createdAt: number;
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

export class BookmarksStore {
  private filePath: string;
  private bookmarks: BookmarkEntry[] = [];

  constructor(customPath?: string) {
    if (customPath) {
      this.filePath = customPath;
    } else {
      const userData = resolveUserDataDirectory();
      this.filePath = path.join(userData, 'eclipse-bookmarks.json');
    }
    this.bookmarks = this.loadFromDisk();
  }

  private loadFromDisk(): BookmarkEntry[] {
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
              typeof item.createdAt === 'number'
          );
        }
      }
    } catch (err) {
      console.warn('[BookmarksStore] Could not load bookmarks from disk:', err);
    }
    return [];
  }

  private saveToDisk(): void {
    try {
      const data = JSON.stringify(this.bookmarks, null, 2);
      const tmpPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tmpPath, data, 'utf8');
      fs.renameSync(tmpPath, this.filePath);
    } catch (err) {
      console.error('[BookmarksStore] Failed to save bookmarks to disk:', err);
    }
  }

  public getBookmarks(): BookmarkEntry[] {
    return [...this.bookmarks];
  }

  public isBookmarked(url: string): boolean {
    const trimmed = url.trim();
    if (!trimmed || trimmed === 'about:blank') return false;
    return this.bookmarks.some((b) => b.url === trimmed);
  }

  public addBookmark(url: string, title: string): BookmarkEntry | null {
    const trimmedUrl = url.trim();
    if (!trimmedUrl || trimmedUrl === 'about:blank') return null;

    const existing = this.bookmarks.find((b) => b.url === trimmedUrl);
    if (existing) {
      existing.title = title.trim() || existing.title;
      this.saveToDisk();
      return existing;
    }

    const bookmark: BookmarkEntry = {
      id: `bm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      url: trimmedUrl,
      title: title.trim() || trimmedUrl,
      createdAt: Date.now(),
    };

    this.bookmarks.unshift(bookmark);
    this.saveToDisk();
    return bookmark;
  }

  public removeBookmark(urlOrId: string): boolean {
    const target = urlOrId.trim();
    const prevLen = this.bookmarks.length;
    this.bookmarks = this.bookmarks.filter((b) => b.id !== target && b.url !== target);
    if (this.bookmarks.length !== prevLen) {
      this.saveToDisk();
      return true;
    }
    return false;
  }

  public toggleBookmark(url: string, title: string): { isBookmarked: boolean; bookmark: BookmarkEntry | null } {
    if (this.isBookmarked(url)) {
      this.removeBookmark(url);
      return { isBookmarked: false, bookmark: null };
    } else {
      const created = this.addBookmark(url, title);
      return { isBookmarked: Boolean(created), bookmark: created };
    }
  }
}
