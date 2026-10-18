import React, { useState, useEffect, useRef } from 'react';
import { EclipseLogo, SearchIcon, CompassIcon, ExternalLinkIcon } from './Icons';
import type { SearchProviderId } from '../types/settings';

interface NewTabPageProps {
  onNavigate: (url: string) => void;
  searchProvider: SearchProviderId;
}

interface QuickSite {
  title: string;
  url: string;
  domain: string;
  category: string;
}

const PINNED_SITES: QuickSite[] = [
  { title: 'Google', url: 'https://www.google.com', domain: 'google.com', category: 'Search' },
  { title: 'GitHub', url: 'https://github.com', domain: 'github.com', category: 'Code' },
  { title: 'Wikipedia', url: 'https://wikipedia.org', domain: 'wikipedia.org', category: 'Knowledge' },
  { title: 'Hacker News', url: 'https://news.ycombinator.com', domain: 'news.ycombinator.com', category: 'Tech' },
];

export const NewTabPage: React.FC<NewTabPageProps> = ({ onNavigate }) => {
  const [query, setQuery] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();

    const updateDateTime = () => {
      const now = new Date();
      setCurrentDate(
        now.toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })
      );
      setCurrentTime(
        now.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = query.trim();
    if (target) {
      onNavigate(target);
    }
  };

  const providerName = 'Google';

  return (
    <div className="new-tab-container">
      {/* Ambient Eclipse Geometry */}
      <div className="eclipse-ambient-glow" aria-hidden="true">
        <div className="eclipse-corona-ring" />
        <div className="eclipse-corona-core" />
      </div>

      <div className="new-tab-content">
        {/* Date & Time Header */}
        <div className="new-tab-meta-header">
          <span className="new-tab-time">{currentTime}</span>
          <span className="new-tab-date-divider">•</span>
          <span className="new-tab-date">{currentDate}</span>
        </div>

        {/* Brand Emblem */}
        <div className="new-tab-brand">
          <div className="new-tab-emblem-wrap">
            <EclipseLogo size={48} className="new-tab-emblem" />
          </div>
          <h1 className="new-tab-title">Eclipse</h1>
          <p className="new-tab-tagline">Focused. Fast. Atmospheric.</p>
        </div>

        {/* Central Search / Address Input */}
        <form className="new-tab-search-form" onSubmit={handleSearchSubmit}>
          <div className="new-tab-input-wrapper">
            <SearchIcon size={18} className="new-tab-search-icon" />
            <input
              ref={inputRef}
              type="text"
              className="new-tab-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search with ${providerName} or enter web address...`}
              spellCheck={false}
              autoComplete="off"
            />
            {query.trim() && (
              <button type="submit" className="new-tab-submit-btn" title="Search or Navigate">
                <span>Enter</span>
              </button>
            )}
          </div>
        </form>

        {/* Pinned Launchpad */}
        <div className="new-tab-shortcuts-section">
          <div className="shortcuts-section-label">
            <CompassIcon size={14} />
            <span>Launchpad</span>
          </div>
          <div className="new-tab-shortcuts-grid">
            {PINNED_SITES.map((site) => (
              <button
                key={site.url}
                type="button"
                className="shortcut-card-btn"
                onClick={() => onNavigate(site.url)}
                title={`Navigate to ${site.url}`}
              >
                <div className="shortcut-card-icon">
                  <ExternalLinkIcon size={14} />
                </div>
                <div className="shortcut-card-info">
                  <span className="shortcut-title">{site.title}</span>
                  <span className="shortcut-domain">{site.domain}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
