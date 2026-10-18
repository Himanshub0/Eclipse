import React, { useState, useEffect, useRef } from 'react';
import { SearchIcon, ChevronUpIcon, ChevronDownIcon, CloseIcon } from './Icons';
import type { FindInPageOptions, FindInPageResult } from '../types/browser';

interface FindInPageProps {
  isOpen: boolean;
  onClose: () => void;
  onFind: (text: string, options?: FindInPageOptions) => void;
  onStopFind: () => void;
  result: FindInPageResult;
}

export const FindInPage: React.FC<FindInPageProps> = ({
  isOpen,
  onClose,
  onFind,
  onStopFind,
  result,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    } else {
      setQuery('');
      onStopFind();
    }
  }, [isOpen, onStopFind]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (val.trim()) {
      onFind(val, { forward: true, findNext: false, matchCase: false });
    } else {
      onStopFind();
    }
  };

  const handleNext = () => {
    if (query.trim()) {
      onFind(query, { forward: true, findNext: true, matchCase: false });
    }
  };

  const handlePrev = () => {
    if (query.trim()) {
      onFind(query, { forward: false, findNext: true, matchCase: false });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrev();
      } else {
        handleNext();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  const matchText =
    query.trim() && result.matches > 0
      ? `${result.activeMatchOrdinal} of ${result.matches}`
      : query.trim()
      ? '0 of 0'
      : '';

  return (
    <div className="find-in-page-bar" role="search" aria-label="Find in page">
      <div className="find-in-page-icon">
        <SearchIcon size={14} />
      </div>

      <input
        ref={inputRef}
        type="text"
        className="find-in-page-input"
        placeholder="Find in page..."
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        spellCheck={false}
      />

      {matchText && <span className="find-in-page-count">{matchText}</span>}

      <div className="find-in-page-actions">
        <button
          type="button"
          className="find-action-btn"
          title="Previous match (Shift+Enter, Shift+F3)"
          onClick={handlePrev}
          disabled={!query.trim() || result.matches === 0}
        >
          <ChevronUpIcon size={14} />
        </button>

        <button
          type="button"
          className="find-action-btn"
          title="Next match (Enter, F3)"
          onClick={handleNext}
          disabled={!query.trim() || result.matches === 0}
        >
          <ChevronDownIcon size={14} />
        </button>

        <button
          type="button"
          className="find-action-btn close"
          title="Close find in page (Esc)"
          onClick={onClose}
        >
          <CloseIcon size={12} />
        </button>
      </div>
    </div>
  );
};
