/**
 * Core navigation and IPC contract types for Project Browser.
 */

export interface BrowserNavState {
  url: string;
  title: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  error?: string | null;
}

export interface BrowserApi {
  navigate: (url: string) => Promise<boolean>;
  goBack: () => Promise<boolean>;
  goForward: () => Promise<boolean>;
  reload: () => Promise<boolean>;
  getState: () => Promise<BrowserNavState>;
  onStateChange: (callback: (state: BrowserNavState) => void) => () => void;
  setToolbarHeight: (height: number) => Promise<void>;
}

declare global {
  interface Window {
    browserApi: BrowserApi;
  }
}
