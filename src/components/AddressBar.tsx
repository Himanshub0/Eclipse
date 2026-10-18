import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { LockIcon, GoIcon, SpinnerIcon, CloseIcon, StarIcon } from './Icons';
import type { SearchProviderId } from '../types/settings';

export interface AddressBarRef {
  focusAndSelect: () => void;
}

interface AddressBarProps {
  currentUrl: string;
  isLoading: boolean;
  searchProvider?: SearchProviderId;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  onNavigate: (url: string) => void;
}

export const AddressBar = forwardRef<AddressBarRef, AddressBarProps>(
  ({ currentUrl, isLoading, isBookmarked, onToggleBookmark, onNavigate }, ref) => {
    const normalizedUrl = (!currentUrl || currentUrl === 'about:blank') ? '' : currentUrl;
    const [inputValue, setInputValue] = useState(normalizedUrl);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync input with external URL changes whenever not actively focused by user
    useEffect(() => {
      if (!isFocused) {
        setInputValue(normalizedUrl);
      }
    }, [normalizedUrl, isFocused]);

    useImperativeHandle(ref, () => ({
      focusAndSelect: () => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      },
    }));

    const handleSubmit = (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const target = inputValue.trim();
      if (target) {
        onNavigate(target);
        inputRef.current?.blur();
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSubmit();
      } else if (e.key === 'Escape') {
        setInputValue(normalizedUrl);
        inputRef.current?.blur();
      }
    };

    const isSecure = Boolean(normalizedUrl && normalizedUrl.toLowerCase().startsWith('https://'));

    const providerName = 'Google';

    return (
      <form
        className={`address-bar-container ${isFocused ? 'focused' : ''}`}
        onSubmit={handleSubmit}
      >
        <div className="address-bar-prefix">
          {isLoading ? (
            <SpinnerIcon size={14} className="loading-spinner" />
          ) : isSecure ? (
            <span title="Connection is secure (HTTPS)" className="security-icon secure">
              <LockIcon size={14} />
            </span>
          ) : null}
        </div>

        <input
          ref={inputRef}
          type="text"
          className="address-bar-input"
          value={inputValue}
          placeholder={`Search with ${providerName} or enter address`}
          spellCheck={false}
          onChange={(e) => {
            const val = e.target.value;
            setInputValue(val);
            if (val.length > 3 && typeof window !== 'undefined' && window.browserApi?.preresolveHost) {
              void window.browserApi.preresolveHost(val);
            }
          }}
          onFocus={() => {
            setIsFocused(true);
            setTimeout(() => inputRef.current?.select(), 0);
          }}
          onBlur={() => {
            setIsFocused(false);
            setInputValue(normalizedUrl);
          }}
          onKeyDown={handleKeyDown}
        />

        {isFocused && inputValue && (
          <button
            type="button"
            className="address-bar-clear-btn"
            title="Clear input (Esc)"
            onClick={(e) => {
              e.stopPropagation();
              setInputValue('');
              inputRef.current?.focus();
            }}
          >
            <CloseIcon size={12} />
          </button>
        )}

        {normalizedUrl && onToggleBookmark && (
          <button
            type="button"
            className={`address-bar-bookmark-btn ${isBookmarked ? 'active' : ''}`}
            title={isBookmarked ? 'Remove bookmark (Ctrl+D)' : 'Bookmark this tab (Ctrl+D)'}
            onClick={(e) => {
              e.stopPropagation();
              onToggleBookmark();
            }}
          >
            <StarIcon size={14} filled={isBookmarked} />
          </button>
        )}

        <button
          type="submit"
          className="address-bar-go-btn"
          title="Go to URL (Enter)"
          disabled={!inputValue.trim()}
        >
          <GoIcon size={16} />
        </button>
      </form>
    );
  }
);

AddressBar.displayName = 'AddressBar';
