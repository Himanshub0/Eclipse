import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigation } from './hooks/useNavigation';
import { TabSidebar } from './components/TabSidebar';
import { BrowserToolbar } from './components/BrowserToolbar';
import { AddressBarRef } from './components/AddressBar';
import './styles/toolbar.css';

const HOMEPAGE_URL = 'https://duckduckgo.com';

export const App: React.FC = () => {
  const {
    tabs,
    activeTabId,
    activeTab,
    navigate,
    goBack,
    goForward,
    reload,
    createTab,
    closeTab,
    switchTab,
    setLayoutBounds,
  } = useNavigation();

  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const addressBarRef = useRef<AddressBarRef>(null);

  const sidebarWidthRef = useRef<number>(240);
  const topBarHeightRef = useRef<number>(48);

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

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+T -> New Tab
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
        e.preventDefault();
        void createTab();
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
  }, [activeTabId, activeTab, createTab, closeTab, goBack, goForward, reload]);

  const activeError = activeTab.error && activeTab.error !== dismissedError ? activeTab.error : null;

  return (
    <div className="browser-app-container">
      {/* Dedicated Left Tab Management Sidebar */}
      <TabSidebar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={(tabId) => void switchTab(tabId)}
        onCloseTab={(tabId) => void closeTab(tabId)}
        onCreateTab={() => void createTab()}
        onReportWidth={handleReportSidebarWidth}
      />

      {/* Main Content Area */}
      <div className="eclipse-main-content">
        <BrowserToolbar
          url={activeTab.url}
          isLoading={activeTab.isLoading}
          canGoBack={activeTab.canGoBack}
          canGoForward={activeTab.canGoForward}
          onNavigate={(newUrl) => {
            setDismissedError(null);
            void navigate(newUrl);
          }}
          onGoBack={() => void goBack()}
          onGoForward={() => void goForward()}
          onReload={() => void reload()}
          onHome={() => {
            setDismissedError(null);
            void navigate(HOMEPAGE_URL);
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
      </div>
    </div>
  );
};

export default App;
