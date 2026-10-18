import { BrowserWindow, WebContentsView, Menu, MenuItemConstructorOptions, clipboard, dialog } from 'electron';
import { pathToFileURL } from 'url';
import type { BrowserAppState, TabItem, FindInPageOptions } from '../src/types/browser';
import { normalizeUrl } from '../src/utils/url';
import { IPC_CHANNELS } from './ipc';
import type { SettingsStore } from './settings-store';
import type { BookmarksStore } from './bookmarks-store';
import type { HistoryStore } from './history-store';

interface TabEntry {
  id: string;
  view: WebContentsView | null;
  lastError: string | null;
  favicon: string | null;
  savedUrl?: string;
  savedTitle?: string;
  isDiscarded: boolean;
  lastActiveTime: number;
}

const DEFAULT_HOMEPAGE = 'https://duckduckgo.com';
const HELP_URL = 'https://github.com/Himanshub0/Eclipse#readme';

export interface WindowDelegate {
  onNewWindow: (url?: string, isPrivate?: boolean) => void;
  onOpenTaskManager: () => void;
}

/**
 * Manages multiple WebContentsViews, shortcut routing, and Chromium features for Eclipse.
 */
export class BrowserViewManager {
  private win: BrowserWindow;
  private settingsStore: SettingsStore;
  private bookmarksStore: BookmarksStore;
  private historyStore: HistoryStore;
  private delegate?: WindowDelegate;
  private tabs: Map<string, TabEntry> = new Map();
  private tabOrder: string[] = [];
  private activeTabId: string = '';
  private sidebarWidth: number = 240;
  private topBarHeight: number = 44;
  private nextTabNumber: number = 1;
  private isSettingsOpen: boolean = false;
  private closedTabs: { url: string; title: string }[] = [];
  private discardCheckTimer: NodeJS.Timeout | null = null;

  constructor(
    win: BrowserWindow,
    settingsStore: SettingsStore,
    bookmarksStore: BookmarksStore,
    historyStore: HistoryStore,
    delegate?: WindowDelegate,
    initialSidebarWidth = 240,
    initialTopBarHeight = 44,
    initialUrl?: string
  ) {
    this.win = win;
    this.settingsStore = settingsStore;
    this.bookmarksStore = bookmarksStore;
    this.historyStore = historyStore;
    this.delegate = delegate;
    this.sidebarWidth = initialSidebarWidth;
    this.topBarHeight = initialTopBarHeight;

    const startupUrl =
      initialUrl ||
      (this.settingsStore.getSettings().startupMode === 'homepage'
        ? this.settingsStore.getSettings().homepage || DEFAULT_HOMEPAGE
        : 'about:blank');

    // Create initial tab
    this.createTab(startupUrl);

    // Synchronize bounds on window resize
    this.win.on('resize', () => {
      this.updateBounds();
    });

    // Start background tab discard manager (evaluates every 60s)
    this.discardCheckTimer = setInterval(() => {
      this.manageBackgroundTabs();
    }, 60000);
    if (this.discardCheckTimer?.unref) {
      this.discardCheckTimer.unref();
    }
  }

  public updateBounds(): void {
    if (this.win.isDestroyed()) return;
    const [width, height] = this.win.getContentSize();
    const availableWidth = Math.max(0, width - this.sidebarWidth);
    const availableHeight = Math.max(0, height - this.topBarHeight);

    const active = this.tabs.get(this.activeTabId);
    if (!active) return;

    if (active.isDiscarded || !active.view) {
      this.restoreTab(active);
    }
    if (!active.view) return;

    const currentUrl = active.view.webContents.getURL() || '';
    const isBlank = !currentUrl || currentUrl === 'about:blank';

    if (this.isSettingsOpen || isBlank) {
      // Hide external website while settings overlay or new-tab page is active
      if (active.view.getVisible()) {
        active.view.setVisible(false);
      }
      return;
    }

    const currentBounds = active.view.getBounds();
    const isVisible = active.view.getVisible();
    if (
      !isVisible ||
      currentBounds.x !== this.sidebarWidth ||
      currentBounds.y !== this.topBarHeight ||
      currentBounds.width !== availableWidth ||
      currentBounds.height !== availableHeight
    ) {
      active.view.setBounds({
        x: this.sidebarWidth,
        y: this.topBarHeight,
        width: availableWidth,
        height: availableHeight,
      });
      active.view.setVisible(true);
    }
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
        backgroundThrottling: true,
        session: this.win.webContents.session,
      },
    });

    const entry: TabEntry = {
      id: tabId,
      view,
      lastError: null,
      favicon: null,
      isDiscarded: false,
      lastActiveTime: Date.now(),
    };

    this.tabs.set(tabId, entry);
    this.tabOrder.push(tabId);
    this.win.contentView.addChildView(view);

    this.setupSecurityPolicies(entry);
    this.setupNavigationLifecycle(entry);
    this.setupContextMenu(entry);
    this.setupShortcuts(entry);

    if (initialUrl && initialUrl !== 'about:blank') {
      void this.navigateTab(entry, initialUrl);
    }

    this.switchTab(tabId);
    return tabId;
  }

  public switchTab(tabId: string): void {
    const target = this.tabs.get(tabId);
    if (!target) return;

    this.activeTabId = tabId;
    target.lastActiveTime = Date.now();

    if (target.isDiscarded || !target.view) {
      this.restoreTab(target);
    }

    for (const [id, entry] of this.tabs) {
      if (id !== tabId && entry.view) {
        entry.view.setVisible(false);
      }
    }

    this.updateBounds();
    this.emitState();
  }

  public discardTab(tabId: string): boolean {
    const entry = this.tabs.get(tabId);
    if (!entry) return false;
    // Chromium Rule: Never discard active tab
    if (tabId === this.activeTabId) return false;
    // Already discarded
    if (entry.isDiscarded || !entry.view) return false;

    const wc = entry.view.webContents;
    // Chromium Rule: Never discard tabs actively playing audio or actively loading
    if (wc.isLoading() || wc.isCurrentlyAudible()) {
      return false;
    }

    const currentUrl = wc.getURL();
    if (!currentUrl || currentUrl === 'about:blank') {
      return false;
    }

    entry.savedUrl = currentUrl;
    entry.savedTitle = wc.getTitle() || currentUrl;

    try {
      this.win.contentView.removeChildView(entry.view);
    } catch {}

    try {
      wc.removeAllListeners();
      if (!wc.isDestroyed()) {
        wc.close();
      }
    } catch {}

    entry.view = null;
    entry.isDiscarded = true;
    this.emitState();
    return true;
  }

  public restoreTab(entry: TabEntry): void {
    if (!entry.isDiscarded && entry.view) return;

    const view = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        backgroundThrottling: true,
        session: this.win.webContents.session,
      },
    });

    entry.view = view;
    entry.isDiscarded = false;
    entry.lastActiveTime = Date.now();

    this.win.contentView.addChildView(view);
    this.setupSecurityPolicies(entry);
    this.setupNavigationLifecycle(entry);
    this.setupContextMenu(entry);
    this.setupShortcuts(entry);

    const targetUrl = entry.savedUrl || DEFAULT_HOMEPAGE;
    if (targetUrl && targetUrl !== 'about:blank') {
      void this.navigateTab(entry, targetUrl);
    }
  }

  public manageBackgroundTabs(): void {
    if (this.settingsStore.getSettings().tabDiscardingEnabled === false) return;
    if (this.tabs.size <= 4) return;

    const now = Date.now();
    const candidateEntries: TabEntry[] = [];

    for (const [id, entry] of this.tabs) {
      if (id === this.activeTabId) continue;
      if (entry.isDiscarded || !entry.view) continue;
      if (entry.view.webContents.isLoading()) continue;
      if (entry.view.webContents.isCurrentlyAudible()) continue;
      candidateEntries.push(entry);
    }

    // Sort by lastActiveTime ascending (oldest first)
    candidateEntries.sort((a, b) => a.lastActiveTime - b.lastActiveTime);

    // Keep active tab + up to 4 recent background tabs alive; discard older excess
    const maxBackground = 4;
    const excess = candidateEntries.length - maxBackground;

    for (let i = 0; i < candidateEntries.length; i++) {
      const entry = candidateEntries[i];
      const isExcess = i < excess;
      const isTimeout = now - entry.lastActiveTime > 10 * 60 * 1000;
      if (isExcess || isTimeout) {
        this.discardTab(entry.id);
      }
    }
  }

  public closeTab(tabId: string): void {
    const entry = this.tabs.get(tabId);
    if (!entry) return;

    const url = entry.view ? entry.view.webContents.getURL() : (entry.savedUrl || '');
    const title = entry.view ? entry.view.webContents.getTitle() : (entry.savedTitle || '');
    if (url && url !== 'about:blank') {
      this.closedTabs.push({
        url,
        title: title || url,
      });
      if (this.closedTabs.length > 50) {
        this.closedTabs.shift();
      }
    }

    if (entry.view) {
      try {
        this.win.contentView.removeChildView(entry.view);
      } catch {
        // ignore
      }

      try {
        entry.view.webContents.removeAllListeners();
        if (!entry.view.webContents.isDestroyed()) {
          entry.view.webContents.close();
        }
      } catch {
        // ignore
      }
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
        this.createTab('about:blank');
      }
    } else {
      this.emitState();
    }
  }

  public reopenClosedTab(): string | null {
    if (this.closedTabs.length === 0) return null;
    const last = this.closedTabs.pop()!;
    return this.createTab(last.url);
  }

  public switchAdjacentTab(direction: 'next' | 'prev'): void {
    if (this.tabOrder.length <= 1) return;
    const currentIndex = this.tabOrder.indexOf(this.activeTabId);
    if (currentIndex === -1) return;
    let nextIndex: number;
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % this.tabOrder.length;
    } else {
      nextIndex = (currentIndex - 1 + this.tabOrder.length) % this.tabOrder.length;
    }
    this.switchTab(this.tabOrder[nextIndex]);
  }

  public switchToTabNumber(num: number): void {
    const index = num - 1;
    if (index >= 0 && index < this.tabOrder.length) {
      this.switchTab(this.tabOrder[index]);
    }
  }

  public switchToLastTab(): void {
    if (this.tabOrder.length > 0) {
      this.switchTab(this.tabOrder[this.tabOrder.length - 1]);
    }
  }

  public moveTab(direction: 'left' | 'right'): void {
    const index = this.tabOrder.indexOf(this.activeTabId);
    if (index === -1) return;
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= this.tabOrder.length) return;
    const [removed] = this.tabOrder.splice(index, 1);
    this.tabOrder.splice(targetIndex, 0, removed);
    this.emitState();
  }

  private setupSecurityPolicies(entry: TabEntry): void {
    if (!entry.view) return;
    const wc = entry.view.webContents;

    wc.setWindowOpenHandler(({ url }) => {
      if (/^https?:\/\//i.test(url)) {
        this.createTab(url);
      }
      return { action: 'deny' };
    });

    wc.on('will-navigate', (event, navigationUrl) => {
      if (
        !/^https?:\/\//i.test(navigationUrl) &&
        navigationUrl !== 'about:blank' &&
        !navigationUrl.startsWith('file:') &&
        !navigationUrl.startsWith('view-source:')
      ) {
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
    if (!entry.view) return;
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
      entry.savedTitle = wc.getTitle();
      this.emitState();
    });

    wc.on('page-favicon-updated', (_e, favicons) => {
      if (favicons && favicons.length > 0) {
        entry.favicon = favicons[0];
        this.emitState();
      }
    });

    wc.on('did-navigate', (_e, url) => {
      entry.savedUrl = url;
      entry.savedTitle = wc.getTitle();
      this.historyStore.addEntry(url, wc.getTitle());
      this.emitState();
      if (!this.win.isDestroyed()) {
        this.win.webContents.send(IPC_CHANNELS.HISTORY_CHANGED, this.historyStore.getHistory());
      }
    });

    wc.on('did-navigate-in-page', (_e, url) => {
      entry.savedUrl = url;
      entry.savedTitle = wc.getTitle();
      this.historyStore.addEntry(url, wc.getTitle());
      this.emitState();
      if (!this.win.isDestroyed()) {
        this.win.webContents.send(IPC_CHANNELS.HISTORY_CHANGED, this.historyStore.getHistory());
      }
    });

    wc.on('render-process-gone', (_e, details) => {
      console.warn(`[Tab ${entry.id}] Render process gone: ${details.reason} (code: ${details.exitCode})`);
      entry.lastError = `Tab process terminated: ${details.reason}. Reload to restore.`;
      this.emitState();
    });

    wc.on('unresponsive', () => {
      console.warn(`[Tab ${entry.id}] Page is unresponsive`);
      entry.lastError = 'Page is unresponsive. You can wait or reload.';
      this.emitState();
    });

    wc.on('responsive', () => {
      if (entry.lastError?.includes('unresponsive')) {
        entry.lastError = null;
        this.emitState();
      }
    });

    wc.on('found-in-page', (_e, result) => {
      if (!this.win.isDestroyed()) {
        this.win.webContents.send(IPC_CHANNELS.FOUND_IN_PAGE, {
          activeMatchOrdinal: result.activeMatchOrdinal,
          matches: result.matches,
          finalUpdate: result.finalUpdate,
        });
      }
    });
  }

  private setupContextMenu(entry: TabEntry): void {
    if (!entry.view) return;
    const wc = entry.view.webContents;

    wc.on('context-menu', (_event, params) => {
      const template: MenuItemConstructorOptions[] = [];

      const canBack = wc.navigationHistory ? wc.navigationHistory.canGoBack() : wc.canGoBack();
      const canForward = wc.navigationHistory ? wc.navigationHistory.canGoForward() : wc.canGoForward();

      // Navigation Actions
      template.push(
        {
          label: 'Back',
          enabled: canBack,
          click: () => this.goBack(),
        },
        {
          label: 'Forward',
          enabled: canForward,
          click: () => this.goForward(),
        },
        {
          label: 'Reload',
          click: () => this.reload(),
        },
        { type: 'separator' }
      );

      // Links
      if (params.linkURL) {
        template.push(
          {
            label: 'Open Link in New Tab',
            click: () => this.createTab(params.linkURL),
          },
          {
            label: 'Open Link in New Window',
            click: () => this.delegate?.onNewWindow(params.linkURL),
          },
          {
            label: 'Copy Link Address',
            click: () => clipboard.writeText(params.linkURL),
          },
          { type: 'separator' }
        );
      }

      // Media / Images
      if (params.hasImageContents && params.srcURL) {
        template.push(
          {
            label: 'Open Image in New Tab',
            click: () => this.createTab(params.srcURL),
          },
          {
            label: 'Copy Image',
            click: () => wc.copyImageAt(params.x, params.y),
          },
          {
            label: 'Copy Image Address',
            click: () => clipboard.writeText(params.srcURL),
          },
          { type: 'separator' }
        );
      }

      // Selection Text
      if (params.selectionText) {
        const queryText = params.selectionText.trim();
        const displayQuery = queryText.length > 25 ? `${queryText.slice(0, 25)}...` : queryText;
        template.push(
          {
            label: 'Copy',
            role: 'copy',
          },
          {
            label: `Search for "${displayQuery}"`,
            click: () => {
              const searchTpl = this.settingsStore.getSearchTemplate();
              const targetUrl = searchTpl.replace('%s', encodeURIComponent(queryText));
              this.createTab(targetUrl);
            },
          },
          { type: 'separator' }
        );
      }

      // Editable Inputs
      if (params.isEditable) {
        template.push(
          { label: 'Undo', role: 'undo' },
          { label: 'Redo', role: 'redo' },
          { type: 'separator' },
          { label: 'Cut', role: 'cut' },
          { label: 'Copy', role: 'copy' },
          { label: 'Paste', role: 'paste' },
          { label: 'Paste and Match Style', role: 'pasteAndMatchStyle' },
          { label: 'Select All', role: 'selectAll' },
          { type: 'separator' }
        );
      }

      // Page inspection and tools
      template.push(
        {
          label: 'Print...',
          accelerator: 'CmdOrCtrl+P',
          click: () => wc.print(),
        },
        {
          label: 'View Page Source',
          accelerator: 'CmdOrCtrl+U',
          click: () => this.viewSource(),
        },
        { type: 'separator' },
        {
          label: 'Inspect Element',
          click: () => {
            wc.inspectElement(params.x, params.y);
            if (!wc.isDevToolsOpened()) {
              wc.openDevTools({ mode: 'detach' });
            }
          },
        }
      );

      const menu = Menu.buildFromTemplate(template);
      menu.popup({ window: this.win });
    });
  }

  private setupShortcuts(entry: TabEntry): void {
    if (!entry.view) return;
    const wc = entry.view.webContents;

    wc.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown') return;

      const isCtrlOrCmd = Boolean(input.control || input.meta);
      const isShift = Boolean(input.shift);
      const isAlt = Boolean(input.alt);
      const key = input.key;

      // Function keys (F1 - F12)
      if (!isCtrlOrCmd && !isAlt && !isShift) {
        if (key === 'F1') {
          event.preventDefault();
          this.createTab(HELP_URL);
          return;
        }
        if (key === 'F3') {
          event.preventDefault();
          this.win.webContents.send(IPC_CHANNELS.TRIGGER_ACTION, 'find-next');
          return;
        }
        if (key === 'F5') {
          event.preventDefault();
          this.reload();
          return;
        }
        if (key === 'F6') {
          event.preventDefault();
          this.win.webContents.send(IPC_CHANNELS.TRIGGER_ACTION, 'cycle-focus');
          return;
        }
        if (key === 'F10') {
          event.preventDefault();
          this.win.webContents.send(IPC_CHANNELS.TRIGGER_ACTION, 'focus-address-bar');
          return;
        }
        if (key === 'F11') {
          event.preventDefault();
          this.toggleFullscreen();
          return;
        }
        if (key === 'F12') {
          event.preventDefault();
          wc.toggleDevTools();
          return;
        }
      }

      // Shift+F3 -> Previous Match
      if (key === 'F3' && isShift && !isCtrlOrCmd && !isAlt) {
        event.preventDefault();
        this.win.webContents.send(IPC_CHANNELS.TRIGGER_ACTION, 'find-prev');
        return;
      }

      // Navigation Shortcuts (Alt combinations)
      if (isAlt && !isCtrlOrCmd && !isShift) {
        if (key === 'ArrowLeft') {
          event.preventDefault();
          this.goBack();
          return;
        }
        if (key === 'ArrowRight') {
          event.preventDefault();
          this.goForward();
          return;
        }
        if (key === 'Home') {
          event.preventDefault();
          this.openHomepage();
          return;
        }
        if (key.toLowerCase() === 'd') {
          event.preventDefault();
          this.win.webContents.send(IPC_CHANNELS.TRIGGER_ACTION, 'focus-address-bar');
          return;
        }
        if (key === 'F4') {
          event.preventDefault();
          this.win.close();
          return;
        }
      }

      // Escape -> Stop Loading or notify UI
      if (key === 'Escape' && !isCtrlOrCmd && !isAlt && !isShift) {
        if (wc.isLoading()) {
          event.preventDefault();
          this.stopLoading();
        }
        return;
      }

      // Shift+Escape -> Task Manager
      if (key === 'Escape' && isShift && !isCtrlOrCmd && !isAlt) {
        event.preventDefault();
        this.openTaskManager();
        return;
      }

      // Control / Command combinations
      if (isCtrlOrCmd) {
        const lowerKey = key.toLowerCase();

        // Zoom Controls
        if (key === '+' || key === '=' || input.code === 'NumpadAdd') {
          event.preventDefault();
          this.zoomIn();
          return;
        }
        if (key === '-' || key === '_' || input.code === 'NumpadSubtract') {
          event.preventDefault();
          this.zoomOut();
          return;
        }
        if (key === '0' || input.code === 'Numpad0') {
          event.preventDefault();
          this.resetZoom();
          return;
        }

        // Tabs & Windows
        if (lowerKey === 't') {
          event.preventDefault();
          if (isShift) {
            this.reopenClosedTab();
          } else {
            this.createTab();
          }
          return;
        }
        if (lowerKey === 'w') {
          event.preventDefault();
          if (isShift) {
            this.win.close();
          } else {
            this.closeTab(this.activeTabId);
          }
          return;
        }
        if (lowerKey === 'n') {
          event.preventDefault();
          if (isShift) {
            this.delegate?.onNewWindow(undefined, true);
          } else {
            this.delegate?.onNewWindow();
          }
          return;
        }

        // Tab Switching
        if (lowerKey === 'tab') {
          event.preventDefault();
          if (isShift) {
            this.switchAdjacentTab('prev');
          } else {
            this.switchAdjacentTab('next');
          }
          return;
        }
        if (key >= '1' && key <= '8' && !isShift) {
          event.preventDefault();
          this.switchToTabNumber(parseInt(key, 10));
          return;
        }
        if (key === '9' && !isShift) {
          event.preventDefault();
          this.switchToLastTab();
          return;
        }
        if (key === 'PageUp' && isShift) {
          event.preventDefault();
          this.moveTab('left');
          return;
        }
        if (key === 'PageDown' && isShift) {
          event.preventDefault();
          this.moveTab('right');
          return;
        }

        // Reload
        if (lowerKey === 'r') {
          event.preventDefault();
          if (isShift) {
            this.reloadIgnoringCache();
          } else {
            this.reload();
          }
          return;
        }

        // Address Bar
        if (lowerKey === 'l') {
          event.preventDefault();
          this.win.webContents.send(IPC_CHANNELS.TRIGGER_ACTION, 'focus-address-bar');
          return;
        }

        // Find In Page
        if (lowerKey === 'f') {
          event.preventDefault();
          this.win.webContents.send(IPC_CHANNELS.TRIGGER_ACTION, 'find-in-page');
          return;
        }
        if (lowerKey === 'g') {
          event.preventDefault();
          if (isShift) {
            this.win.webContents.send(IPC_CHANNELS.TRIGGER_ACTION, 'find-prev');
          } else {
            this.win.webContents.send(IPC_CHANNELS.TRIGGER_ACTION, 'find-next');
          }
          return;
        }

        // Bookmarks & History
        if (lowerKey === 'd' && !isShift) {
          event.preventDefault();
          this.toggleBookmarkCurrent();
          return;
        }
        if (lowerKey === 'b') {
          event.preventDefault();
          if (isShift) {
            this.win.webContents.send(IPC_CHANNELS.TRIGGER_ACTION, 'toggle-bookmarks-bar');
          } else {
            this.win.webContents.send(IPC_CHANNELS.TRIGGER_ACTION, 'toggle-sidebar');
          }
          return;
        }
        if (lowerKey === 'h') {
          event.preventDefault();
          this.win.webContents.send(IPC_CHANNELS.TRIGGER_ACTION, 'open-history');
          return;
        }
        if (lowerKey === 'j' && !isShift) {
          event.preventDefault();
          this.win.webContents.send(IPC_CHANNELS.TRIGGER_ACTION, 'open-downloads');
          return;
        }
        if (lowerKey === 'o') {
          event.preventDefault();
          if (isShift) {
            this.win.webContents.send(IPC_CHANNELS.TRIGGER_ACTION, 'open-bookmarks');
          } else {
            this.openLocalFile();
          }
          return;
        }

        // Print, Save, View Source
        if (lowerKey === 'p') {
          event.preventDefault();
          wc.print();
          return;
        }
        if (lowerKey === 's') {
          event.preventDefault();
          this.savePage();
          return;
        }
        if (lowerKey === 'u') {
          event.preventDefault();
          this.viewSource();
          return;
        }

        // Developer Tools
        if (lowerKey === 'i' && isShift) {
          event.preventDefault();
          wc.toggleDevTools();
          return;
        }
        if (lowerKey === 'j' && isShift) {
          event.preventDefault();
          wc.openDevTools({ mode: 'detach' });
          return;
        }
        if (lowerKey === 'c' && isShift) {
          event.preventDefault();
          wc.toggleDevTools();
          return;
        }

        // Clear Browsing Data
        if (key === 'Delete' && isShift) {
          event.preventDefault();
          this.win.webContents.send(IPC_CHANNELS.TRIGGER_ACTION, 'open-clear-data');
          return;
        }
      }
    });
  }

  public getAppState(): BrowserAppState {
    const tabs: TabItem[] = this.tabOrder.map((id) => {
      const entry = this.tabs.get(id)!;
      if (entry.isDiscarded || !entry.view) {
        return {
          id,
          url: entry.savedUrl || '',
          title: entry.savedTitle || (entry.savedUrl && entry.savedUrl !== 'about:blank' ? entry.savedUrl : 'New Tab'),
          isLoading: false,
          canGoBack: false,
          canGoForward: false,
          error: entry.lastError,
          favicon: entry.favicon,
          isDiscarded: true,
        };
      }

      const wc = entry.view.webContents;
      const canBack = wc.navigationHistory ? wc.navigationHistory.canGoBack() : wc.canGoBack();
      const canForward = wc.navigationHistory ? wc.navigationHistory.canGoForward() : wc.canGoForward();

      return {
        id,
        url: wc.getURL() || entry.savedUrl || '',
        title: wc.getTitle() || entry.savedTitle || (wc.getURL() === 'about:blank' || !wc.getURL() ? 'New Tab' : 'Eclipse'),
        isLoading: wc.isLoading(),
        canGoBack: Boolean(canBack),
        canGoForward: Boolean(canForward),
        error: entry.lastError,
        favicon: entry.favicon,
        isDiscarded: false,
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

  private ensureActiveView(): TabEntry | null {
    const active = this.tabs.get(this.activeTabId);
    if (!active) return null;
    if (active.isDiscarded || !active.view) {
      this.restoreTab(active);
    }
    return active.view ? active : null;
  }

  public async navigate(rawUrl: string): Promise<boolean> {
    const active = this.ensureActiveView();
    if (!active) return false;
    return this.navigateTab(active, rawUrl);
  }

  private async navigateTab(entry: TabEntry, rawUrl: string): Promise<boolean> {
    if (entry.isDiscarded || !entry.view) {
      this.restoreTab(entry);
    }
    if (!entry.view) return false;

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
    const active = this.ensureActiveView();
    if (!active || !active.view) return false;
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
    const active = this.ensureActiveView();
    if (!active || !active.view) return false;
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
    const active = this.ensureActiveView();
    if (!active || !active.view) return false;
    active.view.webContents.reload();
    return true;
  }

  public reloadIgnoringCache(): boolean {
    const active = this.ensureActiveView();
    if (!active || !active.view) return false;
    active.view.webContents.reloadIgnoringCache();
    return true;
  }

  public stopLoading(): boolean {
    const active = this.ensureActiveView();
    if (!active || !active.view) return false;
    active.view.webContents.stop();
    return true;
  }

  public openHomepage(): boolean {
    const homepage = this.settingsStore.getSettings().homepage || DEFAULT_HOMEPAGE;
    const active = this.ensureActiveView();
    if (active) {
      return this.navigate(homepage) !== null;
    }
    return this.createTab(homepage) !== '';
  }

  public async openLocalFile(): Promise<boolean> {
    const res = await dialog.showOpenDialog(this.win, {
      properties: ['openFile'],
      filters: [
        { name: 'Supported Web Files', extensions: ['html', 'htm', 'txt', 'pdf', 'png', 'jpg', 'jpeg', 'svg', 'webp'] },
        { name: 'HTML Files', extensions: ['html', 'htm'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (!res.canceled && res.filePaths.length > 0) {
      const fileUrl = pathToFileURL(res.filePaths[0]).href;
      return this.navigate(fileUrl);
    }
    return false;
  }

  public viewSource(): boolean {
    const active = this.ensureActiveView();
    if (!active || !active.view) return false;
    const currentUrl = active.view.webContents.getURL() || active.savedUrl;
    if (!currentUrl || currentUrl === 'about:blank') return false;
    const sourceUrl = currentUrl.startsWith('view-source:') ? currentUrl : `view-source:${currentUrl}`;
    this.createTab(sourceUrl);
    return true;
  }

  public print(): boolean {
    const active = this.ensureActiveView();
    if (!active || !active.view) return false;
    active.view.webContents.print();
    return true;
  }

  public async savePage(): Promise<boolean> {
    const active = this.ensureActiveView();
    if (!active || !active.view) return false;
    const defaultName = (active.view.webContents.getTitle() || 'page')
      .replace(/[\\/:*?"<>|]/g, '_')
      .slice(0, 50) + '.html';

    const res = await dialog.showSaveDialog(this.win, {
      defaultPath: defaultName,
      filters: [{ name: 'HTML Document', extensions: ['html', 'htm'] }],
    });
    if (!res.canceled && res.filePath) {
      await active.view.webContents.savePage(res.filePath, 'HTMLComplete');
      return true;
    }
    return false;
  }

  public toggleFullscreen(): boolean {
    const isFs = !this.win.isFullScreen();
    this.win.setFullScreen(isFs);
    return isFs;
  }

  public zoomIn(): number {
    const active = this.ensureActiveView();
    if (!active || !active.view) return 0;
    const current = active.view.webContents.getZoomLevel();
    const next = Math.min(current + 0.5, 4.0);
    active.view.webContents.setZoomLevel(next);
    return next;
  }

  public zoomOut(): number {
    const active = this.ensureActiveView();
    if (!active || !active.view) return 0;
    const current = active.view.webContents.getZoomLevel();
    const next = Math.max(current - 0.5, -3.0);
    active.view.webContents.setZoomLevel(next);
    return next;
  }

  public resetZoom(): number {
    const active = this.ensureActiveView();
    if (!active || !active.view) return 0;
    active.view.webContents.setZoomLevel(0);
    return 0;
  }

  public getZoomLevel(): number {
    const active = this.ensureActiveView();
    if (!active || !active.view) return 0;
    return active.view.webContents.getZoomLevel();
  }

  public findInPage(text: string, options?: FindInPageOptions): number {
    const active = this.ensureActiveView();
    if (!active || !active.view || !text) return 0;
    return active.view.webContents.findInPage(text, options);
  }

  public stopFindInPage(action: 'clearSelection' | 'keepSelection' | 'activateSelection' = 'clearSelection'): void {
    const active = this.ensureActiveView();
    if (!active || !active.view) return;
    active.view.webContents.stopFindInPage(action);
  }

  public toggleBookmarkCurrent(): void {
    const active = this.ensureActiveView();
    if (!active || !active.view) return;
    const url = active.view.webContents.getURL();
    const title = active.view.webContents.getTitle();
    if (url && url !== 'about:blank') {
      this.bookmarksStore.toggleBookmark(url, title);
      if (!this.win.isDestroyed()) {
        this.win.webContents.send(IPC_CHANNELS.BOOKMARKS_CHANGED, this.bookmarksStore.getBookmarks());
      }
    }
  }

  public openTaskManager(): void {
    if (this.delegate) {
      this.delegate.onOpenTaskManager();
    }
  }

  public getTabMetrics(): { total: number; active: number; discarded: number } {
    let discarded = 0;
    for (const [, entry] of this.tabs) {
      if (entry.isDiscarded || !entry.view) discarded++;
    }
    return {
      total: this.tabs.size,
      active: this.tabs.size - discarded,
      discarded,
    };
  }

  public destroy(): void {
    if (this.discardCheckTimer) {
      clearInterval(this.discardCheckTimer);
      this.discardCheckTimer = null;
    }
    for (const [, entry] of this.tabs) {
      if (entry.view) {
        try {
          this.win.contentView.removeChildView(entry.view);
        } catch {
          // ignore
        }
        try {
          entry.view.webContents.removeAllListeners();
          if (!entry.view.webContents.isDestroyed()) {
            entry.view.webContents.close();
          }
        } catch {
          // ignore
        }
      }
    }
    this.tabs.clear();
    this.tabOrder = [];
  }
}
