import { session, shell, type DownloadItem, BrowserWindow } from 'electron';
import type { DownloadItemInfo } from '../src/types/settings';
import { IPC_CHANNELS } from './ipc';

interface ManagedDownload {
  info: DownloadItemInfo;
  item: DownloadItem;
}

export class DownloadsManager {
  private downloads: Map<string, ManagedDownload> = new Map();
  private win: BrowserWindow | null = null;
  private nextId = 1;
  private isInitialized = false;

  public initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    session.defaultSession.on('will-download', (_event, item) => {
      const id = `dl-${this.nextId++}`;
      const info: DownloadItemInfo = {
        id,
        filename: item.getFilename(),
        url: item.getURL(),
        savePath: item.getSavePath(),
        receivedBytes: 0,
        totalBytes: item.getTotalBytes(),
        state: 'progressing',
        startTime: Date.now(),
      };

      const entry: ManagedDownload = { info, item };
      this.downloads.set(id, entry);
      this.emitChange();

      item.on('updated', (_e, state) => {
        info.receivedBytes = item.getReceivedBytes();
        info.totalBytes = item.getTotalBytes();
        info.savePath = item.getSavePath();
        if (state === 'interrupted') {
          info.state = 'interrupted';
        } else if (state === 'progressing') {
          info.state = 'progressing';
        }
        this.emitChange();
      });

      item.once('done', (_e, state) => {
        info.receivedBytes = item.getReceivedBytes();
        info.savePath = item.getSavePath();
        if (state === 'completed') {
          info.state = 'completed';
        } else if (state === 'cancelled') {
          info.state = 'cancelled';
        } else {
          info.state = 'interrupted';
        }
        this.emitChange();
      });
    });
  }

  public setWindow(win: BrowserWindow): void {
    this.win = win;
  }

  private emitChange(): void {
    if (this.win && !this.win.isDestroyed()) {
      const list = this.getDownloads();
      this.win.webContents.send(IPC_CHANNELS.DOWNLOADS_CHANGED, list);
    }
  }

  public getDownloads(): DownloadItemInfo[] {
    return Array.from(this.downloads.values()).map((d) => ({ ...d.info }));
  }

  public async openDownload(id: string): Promise<boolean> {
    const entry = this.downloads.get(id);
    if (!entry || entry.info.state !== 'completed' || !entry.info.savePath) {
      return false;
    }
    const result = await shell.openPath(entry.info.savePath);
    return result === ''; // empty string means success in Electron
  }

  public showInFolder(id: string): boolean {
    const entry = this.downloads.get(id);
    if (!entry || !entry.info.savePath) return false;
    shell.showItemInFolder(entry.info.savePath);
    return true;
  }

  public cancelDownload(id: string): boolean {
    const entry = this.downloads.get(id);
    if (!entry || entry.info.state !== 'progressing') return false;
    entry.item.cancel();
    return true;
  }
}
