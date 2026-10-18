import React, { useRef, useEffect } from 'react';
import { BackIcon, ForwardIcon, ReloadIcon, StopIcon, HomeIcon } from './Icons';
import { AddressBar, AddressBarRef } from './AddressBar';

interface BrowserToolbarProps {
  url: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  onNavigate: (url: string) => void;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
  onStopLoading?: () => void;
  onHome: () => void;
  onReportHeight: (height: number) => void;
  addressBarRef: React.RefObject<AddressBarRef | null>;
}

export const BrowserToolbar: React.FC<BrowserToolbarProps> = ({
  url,
  isLoading,
  canGoBack,
  canGoForward,
  onNavigate,
  onGoBack,
  onGoForward,
  onReload,
  onStopLoading,
  onHome,
  onReportHeight,
  addressBarRef,
}) => {
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const report = () => {
      if (toolbarRef.current) {
        const height = toolbarRef.current.getBoundingClientRect().height;
        if (height > 0) {
          onReportHeight(height);
        }
      }
    };

    report();
    const observer = new ResizeObserver(report);
    if (toolbarRef.current) {
      observer.observe(toolbarRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [onReportHeight]);

  return (
    <header className="eclipse-top-bar" ref={toolbarRef}>
      <div className="top-bar-controls-row">
        <div className="navigation-group">
          <button
            type="button"
            className="toolbar-btn"
            title="Click to go back (Alt+Left)"
            disabled={!canGoBack}
            onClick={onGoBack}
          >
            <BackIcon size={16} />
          </button>

          <button
            type="button"
            className="toolbar-btn"
            title="Click to go forward (Alt+Right)"
            disabled={!canGoForward}
            onClick={onGoForward}
          >
            <ForwardIcon size={16} />
          </button>

          <button
            type="button"
            className="toolbar-btn"
            title={isLoading ? 'Stop loading (Escape)' : 'Reload this page (Ctrl+R, F5)'}
            onClick={isLoading ? onStopLoading : onReload}
          >
            {isLoading ? (
              <StopIcon size={16} />
            ) : (
              <ReloadIcon size={16} />
            )}
          </button>

          <button
            type="button"
            className="toolbar-btn"
            title="Go to homepage"
            onClick={onHome}
          >
            <HomeIcon size={16} />
          </button>
        </div>

        <div className="address-bar-wrapper">
          <AddressBar
            ref={addressBarRef}
            currentUrl={url}
            isLoading={isLoading}
            onNavigate={onNavigate}
          />
        </div>
      </div>

      {isLoading && <div className="toolbar-progress-bar" />}
    </header>
  );
};
