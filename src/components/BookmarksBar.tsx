import React from 'react';
import type { BookmarkItem } from '../types/browser';
import { BookmarksIcon, GlobeIcon, CloseIcon } from './Icons';

interface BookmarksBarProps {
  isVisible: boolean;
  bookmarks: BookmarkItem[];
  onNavigate: (url: string) => void;
  onRemoveBookmark: (id: string) => void;
}

export const BookmarksBar: React.FC<BookmarksBarProps> = ({
  isVisible,
  bookmarks,
  onNavigate,
  onRemoveBookmark,
}) => {
  if (!isVisible) return null;

  return (
    <div className="eclipse-bookmarks-bar" role="toolbar" aria-label="Bookmarks bar">
      <div className="bookmarks-bar-icon" title="Bookmarks (Ctrl+Shift+B)">
        <BookmarksIcon size={13} />
      </div>

      <div className="bookmarks-bar-list">
        {bookmarks.length === 0 ? (
          <span className="bookmarks-empty-tip">
            No bookmarks yet. Press <kbd>Ctrl+D</kbd> to bookmark current page.
          </span>
        ) : (
          bookmarks.map((bm) => (
            <div
              key={bm.id}
              className="bookmark-chip"
              onClick={() => onNavigate(bm.url)}
              title={`${bm.title}\n${bm.url}`}
            >
              <GlobeIcon size={12} className="bookmark-chip-icon" />
              <span className="bookmark-chip-title">{bm.title || bm.url}</span>
              <button
                type="button"
                className="bookmark-chip-remove"
                title="Remove bookmark"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveBookmark(bm.id);
                }}
              >
                <CloseIcon size={10} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
