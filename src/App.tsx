import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigation } from './hooks/useNavigation';
import { TabSidebar } from './components/TabSidebar';
import { BrowserToolbar } from './components/BrowserToolbar';
import { AddressBarRef } from './components/AddressBar';
import { SettingsModal } from './components/SettingsModal';
import { NewTabPage } from './components/NewTabPage';
import { DEFAULT_SETTINGS, type EclipseSettings } from './types/settings';
import './styles/toolbar.css';

const FALLBACK_HOMEPAGE = 'https://duckduckgo.com';

export const App: React.FC = () => {
  const {
    tabs,
    activeTabId,
    activeTab,
    navigate,
    goBack,
    goForward,
    reload,
    stopLoading,
    createTab,
    closeTab,
    switchTab,
    setLayoutBounds,
  } = useNavigation();

  const [settings, setSettings] = useState<EclipseSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [dismissedError, setDismissedError] = useState<string | null>(null);

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
  const handleToggleSettings = useCallback((open: boolean) => {
    setIsSettingsOpen(open);
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

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+, -> Toggle Settings Center
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        handleToggleSettings(!isSettingsOpen);
        return;
      }

      // Escape -> Close Settings Center or Stop Loading
      if (e.key === 'Escape') {
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

      // Ctrl+T -> New Tab
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
        e.preventDefault();
        void createTab();
        return;
      }

      // Ctrl+B -> Toggle Sidebar Collapse
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
        return;
      }

      // Ctrl+W -> Close Tab
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        if (activeTabId) {
          void closeTab(activeTabId);
        }
        return;
      }

      // Ctrl+L -> Focus Address Bar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        addressBarRef.current?.focusAndSelect();
        return;
      }

      // Alt+Left -> Navigate backward
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        if (activeTab.canGoBack) {
          void goBack();
        }
        return;
      }

      // Alt+Right -> Navigate forward
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        if (activeTab.canGoForward) {
          void goForward();
        }
        return;
      }

      // Ctrl+R or F5 -> Reload
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') || e.key === 'F5') {
        e.preventDefault();
        void reload();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isSettingsOpen,
    activeTabId,
    activeTab,
    createTab,
    closeTab,
    goBack,
    goForward,
    reload,
    stopLoading,
    handleToggleSettings,
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
        onOpenSettings={() => handleToggleSettings(true)}
      />

      {/* Main Content Area */}
      <div className="eclipse-main-content">
        <BrowserToolbar
          url={activeTab.url}
          isLoading={activeTab.isLoading}
          canGoBack={activeTab.canGoBack}
          canGoForward={activeTab.canGoForward}
          searchProvider={settings.searchProvider}
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
      />
    </div>
  );
};

export default App;
