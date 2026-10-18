import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { LockIcon, GoIcon, SpinnerIcon } from './Icons';

export interface AddressBarRef {
  focusAndSelect: () => void;
}

interface AddressBarProps {
  currentUrl: string;
  isLoading: boolean;
  onNavigate: (url: string) => void;
}

export const AddressBar = forwardRef<AddressBarRef, AddressBarProps>(
  ({ currentUrl, isLoading, onNavigate }, ref) => {
    const [inputValue, setInputValue] = useState(currentUrl);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync input with external URL changes whenever not actively focused by user
    useEffect(() => {
      if (!isFocused) {
        setInputValue(currentUrl);
      }
    }, [currentUrl, isFocused]);

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
        setInputValue(currentUrl);
        inputRef.current?.blur();
      }
    };

    const isSecure = currentUrl.toLowerCase().startsWith('https://');

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
          placeholder="Search or enter web address"
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            // Select all on focus
            setTimeout(() => inputRef.current?.select(), 0);
          }}
          onBlur={() => {
            setIsFocused(false);
            setInputValue(currentUrl);
          }}
          onKeyDown={handleKeyDown}
        />

        <button
          type="submit"
          className="address-bar-go-btn"
          title="Go to URL"
          disabled={!inputValue.trim()}
        >
          <GoIcon size={16} />
        </button>
      </form>
    );
  }
);

AddressBar.displayName = 'AddressBar';
