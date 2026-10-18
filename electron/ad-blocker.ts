import * as electron from 'electron';
import type { Session } from 'electron';
import path from 'path';
import fs from 'fs';
import { ElectronBlocker } from '@ghostery/adblocker-electron';

const electronApp = (electron as unknown as { app?: typeof electron.app }).app;
const electronSession = (electron as unknown as { session?: typeof electron.session }).session;

/**
 * Manages uBlock- and EasyList-compatible ad and tracker blocking for Eclipse.
 * Blocks network requests before they start and injects cosmetic filters.
 */
export class AdBlockerManager {
  private blocker: ElectronBlocker | null = null;
  private blockedCount = 0;
  private isEnabled = true;
  private isInitializing = false;
  private attachedSessions = new Set<Session>();

  constructor(initialEnabled = true) {
    this.isEnabled = initialEnabled;
  }

  public async initialize(targetSession?: Session): Promise<void> {
    if (this.isInitializing) return;
    this.isInitializing = true;

    try {
      const userData = electronApp?.getPath ? electronApp.getPath('userData') : process.cwd();
      const cachePath = path.join(userData, 'adblocker-engine.bin');

      // Fast initialization with local disk cache
      this.blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch, {
        path: cachePath,
        read: fs.promises.readFile,
        write: fs.promises.writeFile,
      });

      // Pure network-layer blocking in Electron 34
      this.blocker.config.loadCosmeticFilters = false;

      this.blocker.on('request-blocked', () => {
        this.blockedCount++;
      });

      this.blocker.on('request-redirected', () => {
        this.blockedCount++;
      });

      const ses = targetSession || electronSession?.defaultSession;
      if (this.isEnabled && ses) {
        this.enableInSession(ses);
      }
    } catch (err) {
      console.warn('[AdBlocker] Failed to load prebuilt adblock rules, falling back:', err);
      try {
        this.blocker = ElectronBlocker.empty();
      } catch {
        // ignore
      }
    } finally {
      this.isInitializing = false;
    }
  }

  public enableInSession(ses: Session): void {
    if (!this.blocker) return;
    try {
      this.blocker.enableBlockingInSession(ses);
      this.attachedSessions.add(ses);
    } catch (err) {
      console.warn('[AdBlocker] Error enabling in session:', err);
    }
  }

  public disableInSession(ses: Session): void {
    if (!this.blocker) return;
    try {
      this.blocker.disableBlockingInSession(ses);
      this.attachedSessions.delete(ses);
    } catch (err) {
      console.warn('[AdBlocker] Error disabling in session:', err);
    }
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    for (const ses of this.attachedSessions) {
      if (enabled) {
        this.enableInSession(ses);
      } else {
        this.disableInSession(ses);
      }
    }
  }

  public getBlockedCount(): number {
    return this.blockedCount;
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }
}
