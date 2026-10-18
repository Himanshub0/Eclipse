import React, { useRef, useEffect } from 'react';
import type { TabItem } from '../types/browser';
import { EclipseLogo, PlusIcon, CloseIcon, SpinnerIcon, SettingsIcon } from './Icons';

interface TabSidebarProps {
  tabs: TabItem[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onCreateTab: () => void;
  onReportWidth: (width: number) => void;
  onOpenSettings?: () => void;
}

export const TabSidebar: React.FC<TabSidebarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onCreateTab,
  onReportWidth,
  onOpenSettings,
}) => {
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const report = () => {
      if (sidebarRef.current) {
        const width = sidebarRef.current.getBoundingClientRect().width;
        if (width > 0) {
          onReportWidth(width);
        }
      }
    };

    report();
    const observer = new ResizeObserver(report);
    if (sidebarRef.current) {
      observer.observe(sidebarRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [onReportWidth]);

  return (
    <aside className="eclipse-tab-sidebar" ref={sidebarRef}>
      {/* Brand Header */}
      <div className="sidebar-brand-header">
        <div className="brand-logo-container">
          <EclipseLogo size={20} className="brand-icon" />
          <span className="brand-title">Eclipse</span>
        </div>
      </div>

      {/* New Tab Button */}
      <div className="sidebar-action-container">
        <button
          type="button"
          className="new-tab-btn"
          onClick={onCreateTab}
          title="Open new tab (Ctrl+T)"
        >
          <PlusIcon size={16} />
          <span>New Tab</span>
        </button>
      </div>

      {/* Tab Management List */}
      <div className="sidebar-tabs-list" role="tablist" aria-label="Open tabs">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              className={`sidebar-tab-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTab(tab.id)}
              title={tab.title || tab.url || 'New Tab'}
            >
              <div className="tab-status-icon">
                {tab.isLoading ? (
                  <SpinnerIcon size={14} className="loading-spinner" />
                ) : (
                  <span className="tab-favicon-emoji">🌐</span>
                )}
              </div>

              <div className="tab-label-text">
                {tab.title || tab.url || 'New Tab'}
              </div>

              <button
                type="button"
                className="tab-close-btn"
                title="Close tab (Ctrl+W)"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
              >
                <CloseIcon size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer with Settings */}
      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-settings-btn"
          onClick={onOpenSettings}
          title="Settings (Ctrl+,)"
        >
          <SettingsIcon size={16} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};
