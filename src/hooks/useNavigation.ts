import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  BrowserAppState,
  LayoutBoundsPayload,
  TabItem,
  FindInPageOptions,
  FindInPageResult,
  BookmarkItem,
  HistoryItem,
  BrowserAction,
} from '../types/browser';

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
        favicon: null,
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

  const reloadIgnoringCache = useCallback(async () => {
    if (window.browserApi) return window.browserApi.reloadIgnoringCache();
    return false;
  }, []);

  const stopLoading = useCallback(async () => {
    if (window.browserApi) return window.browserApi.stopLoading();
    return false;
  }, []);

  const openHomepage = useCallback(async () => {
    if (window.browserApi) return window.browserApi.openHomepage();
    return false;
  }, []);

  const openLocalFile = useCallback(async () => {
    if (window.browserApi) return window.browserApi.openLocalFile();
    return false;
  }, []);

  const viewSource = useCallback(async () => {
    if (window.browserApi) return window.browserApi.viewSource();
    return false;
  }, []);

  const print = useCallback(async () => {
    if (window.browserApi) return window.browserApi.print();
    return false;
  }, []);

  const savePage = useCallback(async () => {
    if (window.browserApi) return window.browserApi.savePage();
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

  const reopenClosedTab = useCallback(async () => {
    if (window.browserApi) return window.browserApi.reopenClosedTab();
    return null;
  }, []);

  const moveTab = useCallback(async (direction: 'left' | 'right') => {
    if (window.browserApi) return window.browserApi.moveTab(direction);
  }, []);

  const newWindow = useCallback(async (url?: string, isPrivate?: boolean) => {
    if (window.browserApi) return window.browserApi.newWindow(url, isPrivate);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (window.browserApi) return window.browserApi.toggleFullscreen();
    return false;
  }, []);

  const zoomIn = useCallback(async () => {
    if (window.browserApi) return window.browserApi.zoomIn();
    return 0;
  }, []);

  const zoomOut = useCallback(async () => {
    if (window.browserApi) return window.browserApi.zoomOut();
    return 0;
  }, []);

  const resetZoom = useCallback(async () => {
    if (window.browserApi) return window.browserApi.resetZoom();
    return 0;
  }, []);

  const getZoomLevel = useCallback(async () => {
    if (window.browserApi) return window.browserApi.getZoomLevel();
    return 0;
  }, []);

  const findInPage = useCallback(async (text: string, options?: FindInPageOptions) => {
    if (window.browserApi) return window.browserApi.findInPage(text, options);
    return 0;
  }, []);

  const stopFindInPage = useCallback(async (action?: 'clearSelection' | 'keepSelection' | 'activateSelection') => {
    if (window.browserApi) return window.browserApi.stopFindInPage(action);
  }, []);

  const onFindResult = useCallback((callback: (result: FindInPageResult) => void) => {
    if (window.browserApi) return window.browserApi.onFindResult(callback);
    return () => {};
  }, []);

  const getBookmarks = useCallback(async () => {
    if (window.browserApi) return window.browserApi.getBookmarks();
    return [];
  }, []);

  const toggleBookmark = useCallback(async (url: string, title: string) => {
    if (window.browserApi) return window.browserApi.toggleBookmark(url, title);
    return { isBookmarked: false, bookmark: null };
  }, []);

  const removeBookmark = useCallback(async (urlOrId: string) => {
    if (window.browserApi) return window.browserApi.removeBookmark(urlOrId);
    return false;
  }, []);

  const isBookmarked = useCallback(async (url: string) => {
    if (window.browserApi) return window.browserApi.isBookmarked(url);
    return false;
  }, []);

  const onBookmarksChange = useCallback((callback: (bookmarks: BookmarkItem[]) => void) => {
    if (window.browserApi) return window.browserApi.onBookmarksChange(callback);
    return () => {};
  }, []);

  const getHistory = useCallback(async () => {
    if (window.browserApi) return window.browserApi.getHistory();
    return [];
  }, []);

  const clearHistory = useCallback(async () => {
    if (window.browserApi) return window.browserApi.clearHistory();
  }, []);

  const deleteHistoryEntry = useCallback(async (id: string) => {
    if (window.browserApi) return window.browserApi.deleteHistoryEntry(id);
    return false;
  }, []);

  const onHistoryChange = useCallback((callback: (history: HistoryItem[]) => void) => {
    if (window.browserApi) return window.browserApi.onHistoryChange(callback);
    return () => {};
  }, []);

  const onActionTriggered = useCallback((callback: (action: BrowserAction) => void) => {
    if (window.browserApi) return window.browserApi.onActionTriggered(callback);
    return () => {};
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
    reloadIgnoringCache,
    stopLoading,
    openHomepage,
    openLocalFile,
    viewSource,
    print,
    savePage,
    createTab,
    closeTab,
    switchTab,
    reopenClosedTab,
    moveTab,
    newWindow,
    toggleFullscreen,
    zoomIn,
    zoomOut,
    resetZoom,
    getZoomLevel,
    findInPage,
    stopFindInPage,
    onFindResult,
    getBookmarks,
    toggleBookmark,
    removeBookmark,
    isBookmarked,
    onBookmarksChange,
    getHistory,
    clearHistory,
    deleteHistoryEntry,
    onHistoryChange,
    onActionTriggered,
    setLayoutBounds,
  };
}
