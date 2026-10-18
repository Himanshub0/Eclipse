import { BrowserWindow, WebContentsView } from 'electron';
import type { BrowserAppState, TabItem } from '../src/types/browser';
import { normalizeUrl } from '../src/utils/url';
import { IPC_CHANNELS } from './ipc';
import type { SettingsStore } from './settings-store';

interface TabEntry {
  id: string;
  view: WebContentsView;
  lastError: string | null;
}

const DEFAULT_HOMEPAGE = 'https://duckduckgo.com';

/**
 * Manages multiple WebContentsViews and sidebar layout for Eclipse.
 */
export class BrowserViewManager {
  private win: BrowserWindow;
  private settingsStore: SettingsStore;
  private tabs: Map<string, TabEntry> = new Map();
  private tabOrder: string[] = [];
  private activeTabId: string = '';
  private sidebarWidth: number = 240;
  private topBarHeight: number = 44;
  private nextTabNumber: number = 1;
  private isSettingsOpen: boolean = false;

  constructor(
    win: BrowserWindow,
    settingsStore: SettingsStore,
    initialSidebarWidth = 240,
    initialTopBarHeight = 44
  ) {
    this.win = win;
    this.settingsStore = settingsStore;
    this.sidebarWidth = initialSidebarWidth;
    this.topBarHeight = initialTopBarHeight;

    const startupUrl =
      this.settingsStore.getSettings().startupMode === 'homepage'
        ? this.settingsStore.getSettings().homepage || DEFAULT_HOMEPAGE
        : 'about:blank';

    // Create initial tab
    this.createTab(startupUrl);

    // Synchronize bounds on window resize
    this.win.on('resize', () => {
      this.updateBounds();
    });
  }

  public updateBounds(): void {
    if (this.win.isDestroyed()) return;
    const [width, height] = this.win.getContentSize();
    const availableWidth = Math.max(0, width - this.sidebarWidth);
    const availableHeight = Math.max(0, height - this.topBarHeight);

    const active = this.tabs.get(this.activeTabId);
    if (!active) return;

    const currentUrl = active.view.webContents.getURL() || '';
    const isBlank = !currentUrl || currentUrl === 'about:blank';

    if (this.isSettingsOpen || isBlank) {
      // Hide external website while settings overlay or new-tab page is active
      active.view.setVisible(false);
      return;
    }

    active.view.setBounds({
      x: this.sidebarWidth,
      y: this.topBarHeight,
      width: availableWidth,
      height: availableHeight,
    });
    active.view.setVisible(true);
  }

  public setSettingsOpen(open: boolean): void {
    this.isSettingsOpen = open;
    this.updateBounds();
  }

  public setLayoutBounds(sidebarWidth: number, topBarHeight: number): void {
    this.sidebarWidth = sidebarWidth;
    this.topBarHeight = topBarHeight;
    this.updateBounds();
  }

  public createTab(initialUrl = 'about:blank'): string {
    const tabId = `tab-${this.nextTabNumber++}`;
    const view = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });

    const entry: TabEntry = {
      id: tabId,
      view,
      lastError: null,
    };

    this.tabs.set(tabId, entry);
    this.tabOrder.push(tabId);
    this.win.contentView.addChildView(view);

    this.setupSecurityPolicies(entry);
    this.setupNavigationLifecycle(entry);

    if (initialUrl && initialUrl !== 'about:blank') {
      void this.navigateTab(entry, initialUrl);
    }

    this.switchTab(tabId);
    return tabId;
  }

  public switchTab(tabId: string): void {
    if (!this.tabs.has(tabId)) return;

    this.activeTabId = tabId;

    for (const [id, entry] of this.tabs) {
      if (id !== tabId) {
        entry.view.setVisible(false);
      }
    }

    this.updateBounds();
    this.emitState();
  }

  public closeTab(tabId: string): void {
    const entry = this.tabs.get(tabId);
    if (!entry) return;

    try {
      this.win.contentView.removeChildView(entry.view);
    } catch {
      // ignore
    }

    this.tabs.delete(tabId);
    const index = this.tabOrder.indexOf(tabId);
    if (index !== -1) {
      this.tabOrder.splice(index, 1);
    }

    if (this.activeTabId === tabId) {
      if (this.tabOrder.length > 0) {
        const nextIndex = Math.min(index, this.tabOrder.length - 1);
        this.switchTab(this.tabOrder[nextIndex]);
      } else {
        this.createTab(this.settingsStore.getSettings().homepage || DEFAULT_HOMEPAGE);
      }
    } else {
      this.emitState();
    }
  }

  private setupSecurityPolicies(entry: TabEntry): void {
    const wc = entry.view.webContents;

    wc.setWindowOpenHandler(({ url }) => {
      if (/^https?:\/\//i.test(url)) {
        this.createTab(url);
      }
      return { action: 'deny' };
    });

    wc.on('will-navigate', (event, navigationUrl) => {
      if (!/^https?:\/\//i.test(navigationUrl) && navigationUrl !== 'about:blank') {
        event.preventDefault();
        entry.lastError = `Blocked navigation to unsafe protocol: ${navigationUrl}`;
        this.emitState();
      }
    });

    wc.session.setPermissionRequestHandler((_wc, _perm, callback) => {
      callback(false);
    });
  }

  private setupNavigationLifecycle(entry: TabEntry): void {
    const wc = entry.view.webContents;

    wc.on('did-start-loading', () => {
      entry.lastError = null;
      this.emitState();
    });

    wc.on('did-stop-loading', () => {
      this.emitState();
    });

    wc.on('did-finish-load', () => {
      entry.lastError = null;
      this.emitState();
    });

    wc.on('did-fail-load', (_e, errorCode, errorDescription) => {
      if (errorCode !== -3) {
        entry.lastError = `${errorDescription} (${errorCode})`;
      }
      this.emitState();
    });

    wc.on('page-title-updated', () => {
      this.emitState();
    });

    wc.on('did-navigate', () => {
      this.emitState();
    });

    wc.on('did-navigate-in-page', () => {
      this.emitState();
    });
  }

  public getAppState(): BrowserAppState {
    const tabs: TabItem[] = this.tabOrder.map((id) => {
      const entry = this.tabs.get(id)!;
      const wc = entry.view.webContents;
      const canBack = wc.navigationHistory ? wc.navigationHistory.canGoBack() : wc.canGoBack();
      const canForward = wc.navigationHistory ? wc.navigationHistory.canGoForward() : wc.canGoForward();

      return {
        id,
        url: wc.getURL() || '',
        title: wc.getTitle() || 'New Tab',
        isLoading: wc.isLoading(),
        canGoBack: Boolean(canBack),
        canGoForward: Boolean(canForward),
        error: entry.lastError,
      };
    });

    return {
      tabs,
      activeTabId: this.activeTabId,
    };
  }

  public emitState(): void {
    if (this.win.isDestroyed()) return;
    const state = this.getAppState();
    this.win.webContents.send(IPC_CHANNELS.STATE_CHANGED, state);
  }

  public async navigate(rawUrl: string): Promise<boolean> {
    const active = this.tabs.get(this.activeTabId);
    if (!active) return false;
    return this.navigateTab(active, rawUrl);
  }

  private async navigateTab(entry: TabEntry, rawUrl: string): Promise<boolean> {
    const template = this.settingsStore.getSearchTemplate();
    const normalized = normalizeUrl(rawUrl, template);
    try {
      entry.lastError = null;
      await entry.view.webContents.loadURL(normalized);
      return true;
    } catch (err: unknown) {
      entry.lastError = err instanceof Error ? err.message : String(err);
      this.emitState();
      return false;
    }
  }

  public goBack(): boolean {
    const active = this.tabs.get(this.activeTabId);
    if (!active) return false;
    const wc = active.view.webContents;
    const canBack = wc.navigationHistory ? wc.navigationHistory.canGoBack() : wc.canGoBack();
    if (canBack) {
      if (wc.navigationHistory) wc.navigationHistory.goBack();
      else wc.goBack();
      return true;
    }
    return false;
  }

  public goForward(): boolean {
    const active = this.tabs.get(this.activeTabId);
    if (!active) return false;
    const wc = active.view.webContents;
    const canForward = wc.navigationHistory ? wc.navigationHistory.canGoForward() : wc.canGoForward();
    if (canForward) {
      if (wc.navigationHistory) wc.navigationHistory.goForward();
      else wc.goForward();
      return true;
    }
    return false;
  }

  public reload(): boolean {
    const active = this.tabs.get(this.activeTabId);
    if (!active) return false;
    active.view.webContents.reload();
    return true;
  }

  public stopLoading(): boolean {
    const active = this.tabs.get(this.activeTabId);
    if (!active) return false;
    active.view.webContents.stop();
    return true;
  }
}
