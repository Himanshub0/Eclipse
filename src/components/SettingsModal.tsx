import React, { useState, useEffect } from 'react';
import type {
  EclipseSettings,
  RuntimeVersions,
  DownloadItemInfo,
  ThemeMode,
  AccentChoice,
} from '../types/settings';
import type { BookmarkItem, HistoryItem } from '../types/browser';
import {
  PaletteIcon,
  HomeIcon,
  SearchIcon,
  ShieldIcon,
  DownloadIcon,
  InfoIcon,
  CloseIcon,
  CheckIcon,
  FolderIcon,
  SpinnerIcon,
  BookmarksIcon,
  HistoryIcon,
} from './Icons';

export type SettingsSection =
  | 'appearance'
  | 'general'
  | 'search'
  | 'privacy'
  | 'downloads'
  | 'bookmarks'
  | 'history'
  | 'about';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: EclipseSettings;
  onUpdateSettings: (partial: Partial<EclipseSettings>) => void;
  initialSection?: SettingsSection;
  bookmarks?: BookmarkItem[];
  history?: HistoryItem[];
  onNavigate?: (url: string) => void;
  onRemoveBookmark?: (id: string) => void;
  onDeleteHistoryEntry?: (id: string) => void;
  onClearHistory?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  initialSection,
  bookmarks = [],
  history = [],
  onNavigate,
  onRemoveBookmark,
  onDeleteHistoryEntry,
  onClearHistory,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection || 'appearance');
  const [runtimeVersions, setRuntimeVersions] = useState<RuntimeVersions | null>(null);
  const [downloads, setDownloads] = useState<DownloadItemInfo[]>([]);

  // Privacy form state
  const [clearCache, setClearCache] = useState(true);
  const [clearCookies, setClearCookies] = useState(true);
  const [clearStorage, setClearStorage] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearedNotice, setClearedNotice] = useState(false);

  // Homepage local input
  const [homepageInput, setHomepageInput] = useState(settings.homepage);

  useEffect(() => {
    setHomepageInput(settings.homepage);
  }, [settings]);

  useEffect(() => {
    if (isOpen && initialSection) {
      setActiveSection(initialSection);
    }
  }, [isOpen, initialSection]);

  useEffect(() => {
    if (!isOpen) return;

    if (window.browserApi) {
      void window.browserApi.getRuntimeVersions().then(setRuntimeVersions);
      void window.browserApi.getDownloads().then(setDownloads);
      const unsub = window.browserApi.onDownloadsChange(setDownloads);
      return () => unsub();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClearData = async () => {
    if (!window.browserApi) return;
    setIsClearing(true);
    await window.browserApi.clearBrowsingData({
      cache: clearCache,
      cookies: clearCookies,
      storage: clearStorage,
    });
    setIsClearing(false);
    setClearedNotice(true);
    setTimeout(() => setClearedNotice(false), 3000);
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" aria-label="Settings Center">
      <div className="settings-container">
        {/* Settings Left Navigation Sidebar */}
        <nav className="settings-sidebar" aria-label="Settings navigation">
          <div className="settings-sidebar-header">
            <span className="settings-header-title">Settings</span>
          </div>

          <div className="settings-nav-list">
            <button
              type="button"
              className={`settings-nav-item ${activeSection === 'appearance' ? 'active' : ''}`}
              onClick={() => setActiveSection('appearance')}
            >
              <PaletteIcon size={16} />
              <span>Appearance</span>
            </button>

            <button
              type="button"
              className={`settings-nav-item ${activeSection === 'general' ? 'active' : ''}`}
              onClick={() => setActiveSection('general')}
            >
              <HomeIcon size={16} />
              <span>General</span>
            </button>

            <button
              type="button"
              className={`settings-nav-item ${activeSection === 'search' ? 'active' : ''}`}
              onClick={() => setActiveSection('search')}
            >
              <SearchIcon size={16} />
              <span>Search Engine</span>
            </button>

            <button
              type="button"
              className={`settings-nav-item ${activeSection === 'privacy' ? 'active' : ''}`}
              onClick={() => setActiveSection('privacy')}
            >
              <ShieldIcon size={16} />
              <span>Privacy & Security</span>
            </button>

            <button
              type="button"
              className={`settings-nav-item ${activeSection === 'downloads' ? 'active' : ''}`}
              onClick={() => setActiveSection('downloads')}
            >
              <DownloadIcon size={16} />
              <span>Downloads</span>
            </button>

            <button
              type="button"
              className={`settings-nav-item ${activeSection === 'bookmarks' ? 'active' : ''}`}
              onClick={() => setActiveSection('bookmarks')}
            >
              <BookmarksIcon size={16} />
              <span>Bookmarks</span>
            </button>

            <button
              type="button"
              className={`settings-nav-item ${activeSection === 'history' ? 'active' : ''}`}
              onClick={() => setActiveSection('history')}
            >
              <HistoryIcon size={16} />
              <span>History</span>
            </button>

            <button
              type="button"
              className={`settings-nav-item ${activeSection === 'about' ? 'active' : ''}`}
              onClick={() => setActiveSection('about')}
            >
              <InfoIcon size={16} />
              <span>About Eclipse</span>
            </button>
          </div>
        </nav>

        {/* Settings Content Panel */}
        <main className="settings-content-panel">
          <header className="settings-content-header">
            <h2 className="settings-section-heading">
              {activeSection === 'appearance' && 'Appearance'}
              {activeSection === 'general' && 'General'}
              {activeSection === 'search' && 'Search Engine'}
              {activeSection === 'privacy' && 'Privacy & Security'}
              {activeSection === 'downloads' && 'Downloads'}
              {activeSection === 'bookmarks' && 'Bookmarks Manager'}
              {activeSection === 'history' && 'Browsing History'}
              {activeSection === 'about' && 'About Eclipse'}
            </h2>
            <button
              type="button"
              className="settings-close-btn"
              onClick={onClose}
              title="Close Settings (Esc)"
            >
              <CloseIcon size={16} />
            </button>
          </header>

          <div className="settings-section-body">
            {/* 1. APPEARANCE */}
            {activeSection === 'appearance' && (
              <div className="settings-group">
                <div className="settings-card">
                  <h3 className="settings-card-title">Theme Mode</h3>
                  <p className="settings-card-desc">
                    Select how Eclipse Browser renders its interface chrome.
                  </p>
                  <div className="theme-options-grid">
                    {(['dark', 'light', 'system'] as ThemeMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        className={`theme-card-btn ${settings.theme === mode ? 'selected' : ''}`}
                        onClick={() => onUpdateSettings({ theme: mode })}
                      >
                        <div className={`theme-preview-box preview-${mode}`} />
                        <span className="theme-name">
                          {mode === 'dark' && 'Obsidian Dark'}
                          {mode === 'light' && 'Bone Light'}
                          {mode === 'system' && 'Follow System'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-card">
                  <h3 className="settings-card-title">Accent Color</h3>
                  <p className="settings-card-desc">
                    Choose the restrained accent color applied to active tabs, highlights, and focus rings.
                  </p>
                  <div className="accent-options-row">
                    {(
                      [
                        { id: 'arsenic-green', name: 'Arsenic Green', color: '#3F8F68' },
                        { id: 'ash-grey', name: 'Ash Grey', color: '#777F79' },
                        { id: 'badge-green', name: 'Badge Green', color: '#8DC9A6' },
                      ] as { id: AccentChoice; name: string; color: string }[]
                    ).map((choice) => (
                      <button
                        key={choice.id}
                        type="button"
                        className={`accent-choice-btn ${settings.accentColor === choice.id ? 'selected' : ''}`}
                        onClick={() => onUpdateSettings({ accentColor: choice.id })}
                      >
                        <span className="accent-dot" style={{ backgroundColor: choice.color }} />
                        <span>{choice.name}</span>
                        {settings.accentColor === choice.id && <CheckIcon size={14} className="accent-check" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. GENERAL */}
            {activeSection === 'general' && (
              <div className="settings-group">
                <div className="settings-card">
                  <h3 className="settings-card-title">Homepage</h3>
                  <p className="settings-card-desc">
                    Specify the URL navigated to when clicking the Home icon or opening Eclipse.
                  </p>
                  <div className="settings-input-row">
                    <input
                      type="text"
                      className="settings-text-input"
                      value={homepageInput}
                      onChange={(e) => setHomepageInput(e.target.value)}
                      placeholder="https://www.google.com"
                    />
                    <button
                      type="button"
                      className="settings-action-btn"
                      onClick={() => onUpdateSettings({ homepage: homepageInput.trim() })}
                    >
                      Save
                    </button>
                  </div>
                </div>

                <div className="settings-card">
                  <h3 className="settings-card-title">Startup Destination</h3>
                  <p className="settings-card-desc">Choose what opens when Eclipse starts.</p>
                  <div className="settings-radio-group">
                    <label className="settings-radio-label">
                      <input
                        type="radio"
                        name="startupMode"
                        checked={settings.startupMode === 'homepage'}
                        onChange={() => onUpdateSettings({ startupMode: 'homepage' })}
                      />
                      <span>Open configured homepage</span>
                    </label>
                    <label className="settings-radio-label">
                      <input
                        type="radio"
                        name="startupMode"
                        checked={settings.startupMode === 'newtab'}
                        onChange={() => onUpdateSettings({ startupMode: 'newtab' })}
                      />
                      <span>Open blank tab</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 3. SEARCH ENGINE */}
            {activeSection === 'search' && (
              <div className="settings-group">
                <div className="settings-card">
                  <h3 className="settings-card-title">Default Search Provider</h3>
                  <p className="settings-card-desc">
                    Google Search is the dedicated default search engine for Eclipse. Queries typed directly into the address bar or new tab page are routed through Google.
                  </p>
                  <div className="settings-radio-group">
                    <label className="settings-radio-label">
                      <input
                        type="radio"
                        name="searchProvider"
                        checked={true}
                        readOnly
                      />
                      <span>Google Search (Default & Exclusive)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 4. PRIVACY & SECURITY */}
            {activeSection === 'privacy' && (
              <div className="settings-group">
                <div className="settings-card">
                  <h3 className="settings-card-title">Clear Browsing Data</h3>
                  <p className="settings-card-desc">
                    Safely clear cached resources, cookies, and local session data from the Chromium profile.
                  </p>

                  <div className="settings-checkbox-group">
                    <label className="settings-checkbox-label">
                      <input
                        type="checkbox"
                        checked={clearCache}
                        onChange={(e) => setClearCache(e.target.checked)}
                      />
                      <span>Cached images and temporary files</span>
                    </label>
                    <label className="settings-checkbox-label">
                      <input
                        type="checkbox"
                        checked={clearCookies}
                        onChange={(e) => setClearCookies(e.target.checked)}
                      />
                      <span>Cookies and active site session data</span>
                    </label>
                    <label className="settings-checkbox-label">
                      <input
                        type="checkbox"
                        checked={clearStorage}
                        onChange={(e) => setClearStorage(e.target.checked)}
                      />
                      <span>IndexedDB & LocalStorage databases</span>
                    </label>
                  </div>

                  <div className="settings-btn-row">
                    <button
                      type="button"
                      className="settings-danger-btn"
                      disabled={isClearing || (!clearCache && !clearCookies && !clearStorage)}
                      onClick={handleClearData}
                    >
                      {isClearing ? (
                        <>
                          <SpinnerIcon size={14} className="loading-spinner" />
                          <span>Clearing Data...</span>
                        </>
                      ) : (
                        <span>Clear Data Now</span>
                      )}
                    </button>
                    {clearedNotice && (
                      <span className="settings-success-msg">
                        <CheckIcon size={14} /> Data cleared successfully.
                      </span>
                    )}
                  </div>
                </div>

                <div className="settings-card">
                  <h3 className="settings-card-title">Site Permissions Model</h3>
                  <p className="settings-card-desc">
                    Eclipse Browser implements a zero-trust model for external web content:
                  </p>
                  <ul className="settings-security-list">
                    <li>Camera & Microphone: <strong>Denied by default</strong></li>
                    <li>Geolocation: <strong>Denied by default</strong></li>
                    <li>System Notifications: <strong>Denied by default</strong></li>
                    <li>Local File System: <strong>No access permitted</strong></li>
                  </ul>
                </div>
              </div>
            )}

            {/* 5. DOWNLOADS */}
            {activeSection === 'downloads' && (
              <div className="settings-group">
                <div className="settings-card">
                  <h3 className="settings-card-title">Session Downloads</h3>
                  <p className="settings-card-desc">
                    Track and access files downloaded during this browsing session.
                  </p>

                  {downloads.length === 0 ? (
                    <div className="settings-empty-state">
                      <DownloadIcon size={24} className="empty-icon" />
                      <p>No downloads recorded in this session.</p>
                    </div>
                  ) : (
                    <div className="downloads-list">
                      {downloads.map((dl) => (
                        <div key={dl.id} className="download-item-card">
                          <div className="download-item-main">
                            <span className="download-filename">{dl.filename}</span>
                            <span className="download-meta">
                              {formatBytes(dl.receivedBytes)} / {formatBytes(dl.totalBytes)} —{' '}
                              <span className={`dl-state state-${dl.state}`}>{dl.state}</span>
                            </span>
                          </div>

                          <div className="download-item-actions">
                            {dl.state === 'completed' && (
                              <>
                                <button
                                  type="button"
                                  className="download-action-btn"
                                  onClick={() => window.browserApi.openDownload(dl.id)}
                                >
                                  Open
                                </button>
                                <button
                                  type="button"
                                  className="download-action-btn icon-only"
                                  title="Show in folder"
                                  onClick={() => window.browserApi.showDownloadInFolder(dl.id)}
                                >
                                  <FolderIcon size={14} />
                                </button>
                              </>
                            )}
                            {dl.state === 'progressing' && (
                              <button
                                type="button"
                                className="download-action-btn danger"
                                onClick={() => window.browserApi.cancelDownload(dl.id)}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. BOOKMARKS */}
            {activeSection === 'bookmarks' && (
              <div className="settings-group">
                <div className="settings-card">
                  <h3 className="settings-card-title">Saved Bookmarks ({bookmarks.length})</h3>
                  <p className="settings-card-desc">
                    Press <kbd>Ctrl+D</kbd> or click the star in the address bar to bookmark pages.
                  </p>

                  {bookmarks.length === 0 ? (
                    <div className="downloads-empty-state">
                      <BookmarksIcon size={24} className="downloads-empty-icon" />
                      <p>No bookmarks saved yet</p>
                    </div>
                  ) : (
                    <div className="downloads-list">
                      {bookmarks.map((bm) => (
                        <div key={bm.id} className="download-item-card">
                          <div className="download-item-info">
                            <span className="download-filename">{bm.title}</span>
                            <span className="download-meta-text">{bm.url}</span>
                          </div>
                          <div className="download-actions">
                            <button
                              type="button"
                              className="download-action-btn"
                              onClick={() => {
                                onClose();
                                onNavigate?.(bm.url);
                              }}
                            >
                              Open
                            </button>
                            <button
                              type="button"
                              className="download-action-btn danger"
                              onClick={() => onRemoveBookmark?.(bm.id)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 7. HISTORY */}
            {activeSection === 'history' && (
              <div className="settings-group">
                <div className="settings-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <h3 className="settings-card-title">Browsing History ({history.length})</h3>
                      <p className="settings-card-desc">
                        Recently visited websites and pages.
                      </p>
                    </div>
                    {history.length > 0 && onClearHistory && (
                      <button
                        type="button"
                        className="download-action-btn danger"
                        onClick={onClearHistory}
                      >
                        Clear History
                      </button>
                    )}
                  </div>

                  {history.length === 0 ? (
                    <div className="downloads-empty-state">
                      <HistoryIcon size={24} className="downloads-empty-icon" />
                      <p>No browsing history recorded</p>
                    </div>
                  ) : (
                    <div className="downloads-list">
                      {history.map((item) => (
                        <div key={item.id} className="download-item-card">
                          <div className="download-item-info">
                            <span className="download-filename">{item.title}</span>
                            <span className="download-meta-text">
                              {item.url} • {new Date(item.visitedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="download-actions">
                            <button
                              type="button"
                              className="download-action-btn"
                              onClick={() => {
                                onClose();
                                onNavigate?.(item.url);
                              }}
                            >
                              Open
                            </button>
                            <button
                              type="button"
                              className="download-action-btn danger icon-only"
                              title="Delete entry"
                              onClick={() => onDeleteHistoryEntry?.(item.id)}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 8. ABOUT ECLIPSE */}
            {activeSection === 'about' && (
              <div className="settings-group">
                <div className="settings-card">
                  <h3 className="settings-card-title">About Eclipse Browser</h3>
                  <p className="settings-card-desc">
                    A refined desktop web browser built with Electron, Chromium, TypeScript, and React.
                  </p>

                  {runtimeVersions && (
                    <div className="runtime-versions-table">
                      <div className="version-row">
                        <span className="v-label">Eclipse Version</span>
                        <span className="v-val">{runtimeVersions.eclipse}</span>
                      </div>
                      <div className="version-row">
                        <span className="v-label">Chromium Engine</span>
                        <span className="v-val">{runtimeVersions.chrome}</span>
                      </div>
                      <div className="version-row">
                        <span className="v-label">Electron Framework</span>
                        <span className="v-val">{runtimeVersions.electron}</span>
                      </div>
                      <div className="version-row">
                        <span className="v-label">Node.js Runtime</span>
                        <span className="v-val">{runtimeVersions.node}</span>
                      </div>
                      <div className="version-row">
                        <span className="v-label">Operating System</span>
                        <span className="v-val">{runtimeVersions.platform}</span>
                      </div>
                    </div>
                  )}

                  <div className="license-notice-box">
                    <h4>License & Open Source Notice</h4>
                    <p>
                      Eclipse Browser is distributed under the MIT License. Copyright © 2026. Built with
                      open-source technologies including Electron, Chromium, React, and Vite.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
