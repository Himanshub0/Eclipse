import React, { useRef, useEffect, useState } from 'react';
import { useNavigation } from './hooks/useNavigation';
import { BrowserToolbar } from './components/BrowserToolbar';
import { AddressBarRef } from './components/AddressBar';
import './styles/toolbar.css';

const HOMEPAGE_URL = 'https://duckduckgo.com';

export const App: React.FC = () => {
  const {
    url,
    title,
    isLoading,
    canGoBack,
    canGoForward,
    error,
    navigate,
    goBack,
    goForward,
    reload,
    setToolbarHeight,
  } = useNavigation();

  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const addressBarRef = useRef<AddressBarRef>(null);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+L / Cmd+L -> Focus address bar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        addressBarRef.current?.focusAndSelect();
        return;
      }

      // Alt+Left -> Navigate backward
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        if (canGoBack) {
          void goBack();
        }
        return;
      }

      // Alt+Right -> Navigate forward
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        if (canGoForward) {
          void goForward();
        }
        return;
      }

      // Ctrl+R or F5 -> Reload page
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
  }, [canGoBack, canGoForward, goBack, goForward, reload]);

  const activeError = error && error !== dismissedError ? error : null;

  return (
    <div className="browser-app-container">
      <BrowserToolbar
        url={url}
        title={title}
        isLoading={isLoading}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
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
        onReportHeight={(height) => void setToolbarHeight(height)}
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
  );
};

export default App;
