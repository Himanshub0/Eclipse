import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigation } from './hooks/useNavigation';
import { TabSidebar } from './components/TabSidebar';
import { BrowserToolbar } from './components/BrowserToolbar';
import { AddressBarRef } from './components/AddressBar';
import { SettingsModal, SettingsSection } from './components/SettingsModal';
import { NewTabPage } from './components/NewTabPage';
import { FindInPage } from './components/FindInPage';
import { BookmarksBar } from './components/BookmarksBar';
import { DEFAULT_SETTINGS, type EclipseSettings } from './types/settings';
import type { BookmarkItem, HistoryItem, FindInPageResult } from './types/browser';
import './styles/toolbar.css';

const FALLBACK_HOMEPAGE = 'https://duckduckgo.com';
const HELP_URL = 'https://github.com/Himanshub0/Eclipse#readme';

export const App: React.FC = () => {
  const {
    tabs,
    activeTabId,
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
  } = useNavigation();

  const [settings, setSettings] = useState<EclipseSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('appearance');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [dismissedError, setDismissedError] = useState<string | null>(null);

  // Find in page state
  const [isFindInPageOpen, setIsFindInPageOpen] = useState(false);
  const [findResult, setFindResult] = useState<FindInPageResult>({
    activeMatchOrdinal: 0,
    matches: 0,
    finalUpdate: false,
  });

  // Bookmarks & History
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isBookmarksBarVisible, setIsBookmarksBarVisible] = useState(false);
  const [currentIsBookmarked, setCurrentIsBookmarked] = useState(false);

  const addressBarRef = useRef<AddressBarRef>(null);
  const sidebarWidthRef = useRef<number>(240);
  const topBarHeightRef = useRef<number>(48);

  // Sync settings from main process
  useEffect(() => {
    if (typeof window !== 'undefined' && window.browserApi) {
      void window.browserApi.getSettings().then((s) => {
        if (s) setSettings(s);
      });

      const unsub = window.browserApi.onSettingsChange((s) => {
        setSettings(s);
      });

      return () => {
        unsub();
      };
    }
  }, []);

  // Sync Bookmarks & History
  useEffect(() => {
    void getBookmarks().then(setBookmarks);
    void getHistory().then(setHistory);

    const unsubBm = onBookmarksChange(setBookmarks);
    const unsubHist = onHistoryChange(setHistory);
    const unsubFind = onFindResult(setFindResult);

    return () => {
      unsubBm();
      unsubHist();
      unsubFind();
    };
  }, [getBookmarks, getHistory, onBookmarksChange, onHistoryChange, onFindResult]);

  // Check if current tab URL is bookmarked
  useEffect(() => {
    if (activeTab.url && activeTab.url !== 'about:blank') {
      void isBookmarked(activeTab.url).then(setCurrentIsBookmarked);
    } else {
      setCurrentIsBookmarked(false);
    }
  }, [activeTab.url, isBookmarked, bookmarks]);

  // Sync Theme Mode and Accent Color to document root
  useEffect(() => {
    const applyThemeAndAccent = () => {
      let resolvedTheme = settings.theme;
      if (resolvedTheme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        resolvedTheme = prefersDark ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', resolvedTheme);
      document.documentElement.setAttribute('data-accent', settings.accentColor);
    };

    applyThemeAndAccent();

    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyThemeAndAccent();
      mediaQuery.addEventListener('change', handleChange);
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }
  }, [settings.theme, settings.accentColor]);

  // Synchronize layout bounds to main process
  const syncLayout = useCallback(() => {
    void setLayoutBounds({
      sidebarWidth: sidebarWidthRef.current,
      topBarHeight: topBarHeightRef.current,
    });
  }, [setLayoutBounds]);

  const handleReportSidebarWidth = useCallback((width: number) => {
    sidebarWidthRef.current = width;
    syncLayout();
  }, [syncLayout]);

  const handleReportTopBarHeight = useCallback((height: number) => {
    topBarHeightRef.current = height;
    syncLayout();
  }, [syncLayout]);

  // Manage Settings Open state and hide/show WebContentsView
  const handleToggleSettings = useCallback((open: boolean, section?: SettingsSection) => {
    setIsSettingsOpen(open);
    if (section) {
      setSettingsSection(section);
    }
    if (window.browserApi) {
      void window.browserApi.setSettingsOpen(open);
    }
  }, []);

  const handleUpdateSettings = useCallback(async (partial: Partial<EclipseSettings>) => {
    if (window.browserApi) {
      const updated = await window.browserApi.updateSettings(partial);
      setSettings(updated);
    } else {
      setSettings((prev) => ({ ...prev, ...partial }));
    }
  }, []);

  const handleToggleBookmark = useCallback(async () => {
    if (activeTab.url && activeTab.url !== 'about:blank') {
      const res = await toggleBookmark(activeTab.url, activeTab.title);
      setCurrentIsBookmarked(res.isBookmarked);
    }
  }, [activeTab.url, activeTab.title, toggleBookmark]);

  // Subscribe to centralized action triggers dispatched from main process
  useEffect(() => {
    const unsubscribe = onActionTriggered((action) => {
      switch (action) {
        case 'focus-address-bar':
        case 'cycle-focus':
          addressBarRef.current?.focusAndSelect();
          break;
        case 'find-in-page':
          setIsFindInPageOpen(true);
          break;
        case 'find-next':
          setIsFindInPageOpen(true);
          break;
        case 'find-prev':
          setIsFindInPageOpen(true);
          break;
        case 'open-history':
          handleToggleSettings(true, 'history');
          break;
        case 'open-downloads':
          handleToggleSettings(true, 'downloads');
          break;
        case 'open-bookmarks':
          handleToggleSettings(true, 'bookmarks');
          break;
        case 'toggle-bookmarks-bar':
          setIsBookmarksBarVisible((prev) => !prev);
          break;
        case 'open-clear-data':
          handleToggleSettings(true, 'privacy');
          break;
        case 'open-settings':
          handleToggleSettings(true, 'appearance');
          break;
        case 'toggle-sidebar':
          setIsSidebarCollapsed((prev) => !prev);
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [onActionTriggered, handleToggleSettings]);

  // Global keyboard shortcuts (for when focus is in UI chrome)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const isAlt = e.altKey;
      const key = e.key;
      const lowerKey = key.toLowerCase();

      // Function keys (F1 - F12)
      if (!isCtrlOrCmd && !isAlt && !isShift) {
        if (key === 'F1') {
          e.preventDefault();
          void createTab(HELP_URL);
          return;
        }
        if (key === 'F3') {
          e.preventDefault();
          setIsFindInPageOpen(true);
          return;
        }
        if (key === 'F5') {
          e.preventDefault();
          void reload();
          return;
        }
        if (key === 'F6') {
          e.preventDefault();
          addressBarRef.current?.focusAndSelect();
          return;
        }
        if (key === 'F10') {
          e.preventDefault();
          addressBarRef.current?.focusAndSelect();
          return;
        }
        if (key === 'F11') {
          e.preventDefault();
          void toggleFullscreen();
          return;
        }
      }

      if (key === 'F3' && isShift && !isCtrlOrCmd && !isAlt) {
        e.preventDefault();
        setIsFindInPageOpen(true);
        return;
      }

      // Escape -> Close transient UI (Find in Page, Settings, or Stop Loading)
      if (key === 'Escape') {
        if (isFindInPageOpen) {
          e.preventDefault();
          setIsFindInPageOpen(false);
          void stopFindInPage();
          return;
        }
        if (isSettingsOpen) {
          e.preventDefault();
          handleToggleSettings(false);
          return;
        }
        if (activeTab.isLoading) {
          e.preventDefault();
          void stopLoading();
          return;
        }
      }

      // Alt Navigation Shortcuts
      if (isAlt && !isCtrlOrCmd && !isShift) {
        if (key === 'ArrowLeft') {
          e.preventDefault();
          if (activeTab.canGoBack) void goBack();
          return;
        }
        if (key === 'ArrowRight') {
          e.preventDefault();
          if (activeTab.canGoForward) void goForward();
          return;
        }
        if (key === 'Home') {
          e.preventDefault();
          void openHomepage();
          return;
        }
        if (lowerKey === 'd') {
          e.preventDefault();
          addressBarRef.current?.focusAndSelect();
          return;
        }
      }

      // Ctrl / Cmd Shortcuts
      if (isCtrlOrCmd) {
        // Settings Center (Ctrl+,)
        if (key === ',') {
          e.preventDefault();
          handleToggleSettings(!isSettingsOpen);
          return;
        }

        // Tabs & Windows
        if (lowerKey === 't') {
          e.preventDefault();
          if (isShift) {
            void reopenClosedTab();
          } else {
            void createTab();
          }
          return;
        }

        if (lowerKey === 'w') {
          e.preventDefault();
          if (activeTabId) {
            void closeTab(activeTabId);
          }
          return;
        }

        if (lowerKey === 'n') {
          e.preventDefault();
          void newWindow(undefined, isShift);
          return;
        }

        // Address Bar
        if (lowerKey === 'l') {
          e.preventDefault();
          addressBarRef.current?.focusAndSelect();
          return;
        }

        // Sidebar Collapse
        if (lowerKey === 'b' && !isShift) {
          e.preventDefault();
          setIsSidebarCollapsed((prev) => !prev);
          return;
        }

        // Bookmarks Bar Toggle
        if (lowerKey === 'b' && isShift) {
          e.preventDefault();
          setIsBookmarksBarVisible((prev) => !prev);
          return;
        }

        // Bookmark Current Page
        if (lowerKey === 'd' && !isShift) {
          e.preventDefault();
          void handleToggleBookmark();
          return;
        }

        // Reload & Hard Reload
        if (lowerKey === 'r') {
          e.preventDefault();
          if (isShift) {
            void reloadIgnoringCache();
          } else {
            void reload();
          }
          return;
        }

        // Find In Page
        if (lowerKey === 'f') {
          e.preventDefault();
          setIsFindInPageOpen(true);
          return;
        }
        if (lowerKey === 'g') {
          e.preventDefault();
          setIsFindInPageOpen(true);
          return;
        }

        // Zoom Controls
        if (key === '+' || key === '=' || e.code === 'NumpadAdd') {
          e.preventDefault();
          void zoomIn();
          return;
        }
        if (key === '-' || key === '_' || e.code === 'NumpadSubtract') {
          e.preventDefault();
          void zoomOut();
          return;
        }
        if (key === '0' || e.code === 'Numpad0') {
          e.preventDefault();
          void resetZoom();
          return;
        }

        // Print, Save, Open File, View Source
        if (lowerKey === 'p') {
          e.preventDefault();
          void print();
          return;
        }
        if (lowerKey === 's') {
          e.preventDefault();
          void savePage();
          return;
        }
        if (lowerKey === 'o') {
          e.preventDefault();
          if (isShift) {
            handleToggleSettings(true, 'bookmarks');
          } else {
            void openLocalFile();
          }
          return;
        }
        if (lowerKey === 'u') {
          e.preventDefault();
          void viewSource();
          return;
        }

        // History, Downloads, Clear Data
        if (lowerKey === 'h') {
          e.preventDefault();
          handleToggleSettings(true, 'history');
          return;
        }
        if (lowerKey === 'j' && !isShift) {
          e.preventDefault();
          handleToggleSettings(true, 'downloads');
          return;
        }
        if (key === 'Delete' && isShift) {
          e.preventDefault();
          handleToggleSettings(true, 'privacy');
          return;
        }

        // Tab Navigation
        if (key >= '1' && key <= '8' && !isShift) {
          const idx = parseInt(key, 10) - 1;
          if (idx >= 0 && idx < tabs.length) {
            e.preventDefault();
            void switchTab(tabs[idx].id);
            return;
          }
        }
        if (key === '9' && !isShift) {
          if (tabs.length > 0) {
            e.preventDefault();
            void switchTab(tabs[tabs.length - 1].id);
            return;
          }
        }
        if (key === 'PageUp' && isShift) {
          e.preventDefault();
          void moveTab('left');
          return;
        }
        if (key === 'PageDown' && isShift) {
          e.preventDefault();
          void moveTab('right');
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isSettingsOpen,
    isFindInPageOpen,
    activeTabId,
    activeTab,
    tabs,
    createTab,
    closeTab,
    switchTab,
    reopenClosedTab,
    moveTab,
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
    newWindow,
    toggleFullscreen,
    zoomIn,
    zoomOut,
    resetZoom,
    stopFindInPage,
    handleToggleSettings,
    handleToggleBookmark,
  ]);

  const activeError = activeTab.error && activeTab.error !== dismissedError ? activeTab.error : null;
  const configuredHomepage = settings.homepage?.trim() || FALLBACK_HOMEPAGE;

  return (
    <div className="browser-app-container">
      {/* Dedicated Left Tab Management Sidebar */}
      <TabSidebar
        tabs={tabs}
        activeTabId={activeTabId}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        onSelectTab={(tabId) => void switchTab(tabId)}
        onCloseTab={(tabId) => void closeTab(tabId)}
        onCreateTab={() => void createTab()}
        onReportWidth={handleReportSidebarWidth}
        onOpenSettings={() => handleToggleSettings(true, 'appearance')}
      />

      {/* Main Content Area */}
      <div className="eclipse-main-content">
        <BrowserToolbar
          url={activeTab.url}
          isLoading={activeTab.isLoading}
          canGoBack={activeTab.canGoBack}
          canGoForward={activeTab.canGoForward}
          searchProvider={settings.searchProvider}
          isBookmarked={currentIsBookmarked}
          onToggleBookmark={() => void handleToggleBookmark()}
          onNavigate={(newUrl) => {
            setDismissedError(null);
            void navigate(newUrl);
          }}
          onGoBack={() => void goBack()}
          onGoForward={() => void goForward()}
          onReload={() => void reload()}
          onStopLoading={() => void stopLoading()}
          onHome={() => {
            setDismissedError(null);
            void navigate(configuredHomepage);
          }}
          onReportHeight={handleReportTopBarHeight}
          addressBarRef={addressBarRef}
        />

        {/* Quick Bookmarks Bar */}
        <BookmarksBar
          isVisible={isBookmarksBarVisible}
          bookmarks={bookmarks}
          onNavigate={(newUrl) => {
            setDismissedError(null);
            void navigate(newUrl);
          }}
          onRemoveBookmark={(id) => void removeBookmark(id)}
        />

        {/* Find In Page floating controller */}
        <FindInPage
          isOpen={isFindInPageOpen}
          onClose={() => {
            setIsFindInPageOpen(false);
            void stopFindInPage();
          }}
          onFind={(text, opts) => void findInPage(text, opts)}
          onStopFind={() => void stopFindInPage()}
          result={findResult}
        />

        {activeError && (
          <div className="browser-error-banner" role="alert">
            <span>⚠️ {activeError}</span>
            <button
              type="button"
              className="error-banner-dismiss"
              onClick={() => setDismissedError(activeError)}
              title="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {/* Atmospheric Eclipse New-Tab Page rendered when on blank tab */}
        {(!activeTab.url || activeTab.url === 'about:blank') && (
          <NewTabPage
            onNavigate={(newUrl) => {
              setDismissedError(null);
              void navigate(newUrl);
            }}
            searchProvider={settings.searchProvider}
          />
        )}
      </div>

      {/* Settings Center Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => handleToggleSettings(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        initialSection={settingsSection}
        bookmarks={bookmarks}
        history={history}
        onNavigate={(newUrl) => {
          setDismissedError(null);
          void navigate(newUrl);
        }}
        onRemoveBookmark={(id) => void removeBookmark(id)}
        onDeleteHistoryEntry={(id) => void deleteHistoryEntry(id)}
        onClearHistory={() => void clearHistory()}
      />
    </div>
  );
};

export default App;
