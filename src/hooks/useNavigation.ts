import { useState, useEffect, useCallback } from 'react';
import type { BrowserNavState } from '../types/browser';

const DEFAULT_STATE: BrowserNavState = {
  url: '',
  title: 'New Tab',
  isLoading: false,
  canGoBack: false,
  canGoForward: false,
  error: null,
};

export function useNavigation() {
  const [navState, setNavState] = useState<BrowserNavState>(DEFAULT_STATE);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.browserApi) {
      return;
    }

    // Fetch initial state
    void window.browserApi.getState().then((initial) => {
      if (initial) setNavState(initial);
    });

    // Subscribe to ongoing state changes from main process
    const unsubscribe = window.browserApi.onStateChange((newState) => {
      setNavState(newState);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const navigate = useCallback(async (url: string) => {
    if (window.browserApi) {
      return window.browserApi.navigate(url);
    }
    return false;
  }, []);

  const goBack = useCallback(async () => {
    if (window.browserApi) {
      return window.browserApi.goBack();
    }
    return false;
  }, []);

  const goForward = useCallback(async () => {
    if (window.browserApi) {
      return window.browserApi.goForward();
    }
    return false;
  }, []);

  const reload = useCallback(async () => {
    if (window.browserApi) {
      return window.browserApi.reload();
    }
    return false;
  }, []);

  const setToolbarHeight = useCallback(async (height: number) => {
    if (window.browserApi) {
      return window.browserApi.setToolbarHeight(height);
    }
  }, []);

  return {
    ...navState,
    navigate,
    goBack,
    goForward,
    reload,
    setToolbarHeight,
  };
}
