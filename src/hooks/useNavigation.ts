import { useState, useEffect, useCallback, useMemo } from 'react';
import type { BrowserAppState, LayoutBoundsPayload, TabItem } from '../types/browser';

const DEFAULT_STATE: BrowserAppState = {
  tabs: [],
  activeTabId: '',
};

export function useNavigation() {
  const [appState, setAppState] = useState<BrowserAppState>(DEFAULT_STATE);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.browserApi) {
      return;
    }

    void window.browserApi.getState().then((initial) => {
      if (initial && initial.tabs) setAppState(initial);
    });

    const unsubscribe = window.browserApi.onStateChange((newState) => {
      setAppState(newState);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const activeTab: TabItem = useMemo(() => {
    const found = appState.tabs.find((t) => t.id === appState.activeTabId);
    return (
      found || {
        id: '',
        url: '',
        title: 'Eclipse',
        isLoading: false,
        canGoBack: false,
        canGoForward: false,
        error: null,
      }
    );
  }, [appState]);

  const navigate = useCallback(async (url: string) => {
    if (window.browserApi) return window.browserApi.navigate(url);
    return false;
  }, []);

  const goBack = useCallback(async () => {
    if (window.browserApi) return window.browserApi.goBack();
    return false;
  }, []);

  const goForward = useCallback(async () => {
    if (window.browserApi) return window.browserApi.goForward();
    return false;
  }, []);

  const reload = useCallback(async () => {
    if (window.browserApi) return window.browserApi.reload();
    return false;
  }, []);

  const createTab = useCallback(async (url?: string) => {
    if (window.browserApi) return window.browserApi.createTab(url);
    return '';
  }, []);

  const closeTab = useCallback(async (tabId: string) => {
    if (window.browserApi) return window.browserApi.closeTab(tabId);
  }, []);

  const switchTab = useCallback(async (tabId: string) => {
    if (window.browserApi) return window.browserApi.switchTab(tabId);
  }, []);

  const setLayoutBounds = useCallback(async (layout: LayoutBoundsPayload) => {
    if (window.browserApi) return window.browserApi.setLayoutBounds(layout);
  }, []);

  return {
    tabs: appState.tabs,
    activeTabId: appState.activeTabId,
    activeTab,
    navigate,
    goBack,
    goForward,
    reload,
    createTab,
    closeTab,
    switchTab,
    setLayoutBounds,
  };
}
