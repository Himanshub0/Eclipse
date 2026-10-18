import { BrowserWindow, WebContentsView } from 'electron';
import type { BrowserNavState } from '../src/types/browser';
import { normalizeUrl } from '../src/utils/url';
import { IPC_CHANNELS } from './ipc';

/**
 * Manages the dedicated WebContentsView rendering arbitrary external websites.
 *
 * Architecture & Security:
 * - Isolated from the privileged main/renderer process.
 * - nodeIntegration: false, contextIsolation: true, sandbox: true.
 * - No preload script is loaded into external web content.
 * - Window open requests are contained to the active view or denied.
 * - Unsafe protocols (javascript:, file:, data:) are prevented.
 * - Permissions are denied by default.
 * - Viewport bounds are dynamically calculated below the React toolbar.
 */
export class BrowserViewManager {
  private view: WebContentsView;
  private win: BrowserWindow;
  private toolbarHeight: number;
  private lastError: string | null = null;

  constructor(win: BrowserWindow, initialToolbarHeight = 76) {
    this.win = win;
    this.toolbarHeight = initialToolbarHeight;

    this.view = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });

    // Attach to the window's content hierarchy
    this.win.contentView.addChildView(this.view);

    // Initial positioning
    this.updateBounds();

    // Synchronize bounds on window resize
    this.win.on('resize', () => {
      this.updateBounds();
    });

    this.setupSecurityPolicies();
    this.setupNavigationLifecycle();
  }

  public updateBounds(): void {
    if (this.win.isDestroyed()) return;
    const [width, height] = this.win.getContentSize();
    const availableHeight = Math.max(0, height - this.toolbarHeight);
    this.view.setBounds({
      x: 0,
      y: this.toolbarHeight,
      width,
      height: availableHeight,
    });
  }

  public setToolbarHeight(height: number): void {
    this.toolbarHeight = height;
    this.updateBounds();
  }

  private setupSecurityPolicies(): void {
    const wc = this.view.webContents;

    // Deny arbitrary uncontrolled popup windows; navigate inside active view for http/https
    wc.setWindowOpenHandler(({ url }) => {
      if (/^https?:\/\//i.test(url)) {
        void wc.loadURL(url);
      }
      return { action: 'deny' };
    });

    // Prevent navigation to unsafe schemes
    wc.on('will-navigate', (event, navigationUrl) => {
      if (!/^https?:\/\//i.test(navigationUrl) && navigationUrl !== 'about:blank') {
        event.preventDefault();
        this.lastError = `Blocked navigation to unsafe protocol: ${navigationUrl}`;
        this.emitState();
      }
    });

    // Deny sensitive hardware/location/notification permissions by default
    wc.session.setPermissionRequestHandler((_webContents, _permission, callback) => {
      callback(false);
    });
  }

  private setupNavigationLifecycle(): void {
    const wc = this.view.webContents;

    wc.on('did-start-loading', () => {
      this.lastError = null;
      this.emitState();
    });

    wc.on('did-stop-loading', () => {
      this.emitState();
    });

    wc.on('did-finish-load', () => {
      this.lastError = null;
      this.emitState();
    });

    wc.on('did-fail-load', (_event, errorCode, errorDescription) => {
      // Error code -3 is ERR_ABORTED (user interrupted or navigated elsewhere)
      if (errorCode !== -3) {
        this.lastError = `${errorDescription} (${errorCode})`;
      }
      this.emitState();
    });

    wc.on('page-title-updated', (_event, title) => {
      this.emitState(title);
    });

    wc.on('did-navigate', () => {
      this.emitState();
    });

    wc.on('did-navigate-in-page', () => {
      this.emitState();
    });
  }

  public getState(overrideTitle?: string): BrowserNavState {
    const wc = this.view.webContents;
    const canBack = wc.navigationHistory ? wc.navigationHistory.canGoBack() : wc.canGoBack();
    const canForward = wc.navigationHistory ? wc.navigationHistory.canGoForward() : wc.canGoForward();

    return {
      url: wc.getURL() || '',
      title: overrideTitle ?? wc.getTitle() ?? '',
      isLoading: wc.isLoading(),
      canGoBack: Boolean(canBack),
      canGoForward: Boolean(canForward),
      error: this.lastError,
    };
  }

  public emitState(overrideTitle?: string): void {
    if (this.win.isDestroyed()) return;
    const state = this.getState(overrideTitle);
    this.win.webContents.send(IPC_CHANNELS.STATE_CHANGED, state);
  }

  public async navigate(rawUrl: string): Promise<boolean> {
    const normalized = normalizeUrl(rawUrl);
    try {
      this.lastError = null;
      await this.view.webContents.loadURL(normalized);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.lastError = msg;
      this.emitState();
      return false;
    }
  }

  public goBack(): boolean {
    const wc = this.view.webContents;
    const canBack = wc.navigationHistory ? wc.navigationHistory.canGoBack() : wc.canGoBack();
    if (canBack) {
      if (wc.navigationHistory) {
        wc.navigationHistory.goBack();
      } else {
        wc.goBack();
      }
      return true;
    }
    return false;
  }

  public goForward(): boolean {
    const wc = this.view.webContents;
    const canForward = wc.navigationHistory ? wc.navigationHistory.canGoForward() : wc.canGoForward();
    if (canForward) {
      if (wc.navigationHistory) {
        wc.navigationHistory.goForward();
      } else {
        wc.goForward();
      }
      return true;
    }
    return false;
  }

  public reload(): boolean {
    this.view.webContents.reload();
    return true;
  }
}
