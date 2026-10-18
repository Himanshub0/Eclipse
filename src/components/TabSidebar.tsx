import React, { useRef, useEffect } from 'react';
import type { TabItem } from '../types/browser';
import {
  EclipseLogo,
  PlusIcon,
  CloseIcon,
  SpinnerIcon,
  SettingsIcon,
  GlobeIcon,
  SidebarToggleIcon,
} from './Icons';

interface TabSidebarProps {
  tabs: TabItem[];
  activeTabId: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onCreateTab: () => void;
  onReportWidth: (width: number) => void;
  onOpenSettings?: () => void;
}

interface TabItemRowProps {
  tab: TabItem;
  isActive: boolean;
  isCollapsed: boolean;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
}

const TabItemRow = React.memo<TabItemRowProps>(({
  tab,
  isActive,
  isCollapsed,
  onSelectTab,
  onCloseTab,
}) => {
  const displayTitle = tab.title || (tab.url && tab.url !== 'about:blank' ? tab.url : 'New Tab');
  return (
    <div
      role="tab"
      aria-selected={isActive}
      className={`sidebar-tab-item ${isActive ? 'active' : ''}`}
      onClick={() => onSelectTab(tab.id)}
      title={displayTitle}
    >
      <div className="tab-status-icon">
        {tab.isLoading ? (
          <SpinnerIcon size={14} className="loading-spinner" />
        ) : tab.favicon ? (
          <img
            src={tab.favicon}
            alt=""
            className="tab-favicon-img"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <GlobeIcon size={14} className="tab-globe-icon" />
        )}
      </div>

      {!isCollapsed && (
        <>
          <div className="tab-label-text">
            {displayTitle}
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
        </>
      )}
    </div>
  );
});
TabItemRow.displayName = 'TabItemRow';

export const TabSidebar: React.FC<TabSidebarProps> = ({
  tabs,
  activeTabId,
  isCollapsed = false,
  onToggleCollapse,
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
    <aside className={`eclipse-tab-sidebar ${isCollapsed ? 'collapsed' : ''}`} ref={sidebarRef}>
      {/* Brand Header */}
      <div className="sidebar-brand-header">
        <div className="brand-logo-container" title="Eclipse Browser">
          <EclipseLogo size={20} className="brand-icon" />
          {!isCollapsed && <span className="brand-title">Eclipse</span>}
        </div>
        {onToggleCollapse && (
          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
          >
            <SidebarToggleIcon size={16} />
          </button>
        )}
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
          {!isCollapsed && <span>New Tab</span>}
        </button>
      </div>

      {/* Tab Management List */}
      <div className="sidebar-tabs-list" role="tablist" aria-label="Open tabs">
        {tabs.map((tab) => (
          <TabItemRow
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            isCollapsed={isCollapsed}
            onSelectTab={onSelectTab}
            onCloseTab={onCloseTab}
          />
        ))}
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
          {!isCollapsed && <span>Settings</span>}
        </button>
      </div>
    </aside>
  );
};
