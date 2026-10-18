import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { BookmarksStore } from '../electron/bookmarks-store.ts';
import { HistoryStore } from '../electron/history-store.ts';

test('BookmarksStore test suite', async (t) => {
  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eclipse-bm-test-'));
  const testFilePath = path.join(testDir, 'test-bookmarks.json');

  t.after(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {}
  });

  await t.test('initializes empty when file does not exist', () => {
    const store = new BookmarksStore(testFilePath);
    assert.deepEqual(store.getBookmarks(), []);
    assert.equal(store.isBookmarked('https://github.com'), false);
  });

  await t.test('adds bookmark and saves to disk', () => {
    const store = new BookmarksStore(testFilePath);
    const bm = store.addBookmark('https://github.com', 'GitHub');
    assert.ok(bm);
    assert.equal(bm.url, 'https://github.com');
    assert.equal(bm.title, 'GitHub');
    assert.equal(store.isBookmarked('https://github.com'), true);
    assert.equal(store.getBookmarks().length, 1);
  });

  await t.test('persists bookmarks across store instances', () => {
    const store = new BookmarksStore(testFilePath);
    const bookmarks = store.getBookmarks();
    assert.equal(bookmarks.length, 1);
    assert.equal(bookmarks[0].url, 'https://github.com');
    assert.equal(bookmarks[0].title, 'GitHub');
  });

  await t.test('toggles bookmark off when already bookmarked', () => {
    const store = new BookmarksStore(testFilePath);
    const result = store.toggleBookmark('https://github.com', 'GitHub');
    assert.equal(result.isBookmarked, false);
    assert.equal(store.isBookmarked('https://github.com'), false);
    assert.equal(store.getBookmarks().length, 0);
  });

  await t.test('toggles bookmark on when not bookmarked', () => {
    const store = new BookmarksStore(testFilePath);
    const result = store.toggleBookmark('https://news.ycombinator.com', 'Hacker News');
    assert.equal(result.isBookmarked, true);
    assert.ok(result.bookmark);
    assert.equal(store.isBookmarked('https://news.ycombinator.com'), true);
  });

  await t.test('ignores invalid urls like about:blank', () => {
    const store = new BookmarksStore(testFilePath);
    assert.equal(store.addBookmark('about:blank', 'Blank'), null);
    assert.equal(store.addBookmark('', 'Empty'), null);
  });

  await t.test('removes bookmark by id or url', () => {
    const store = new BookmarksStore(testFilePath);
    const bm = store.addBookmark('https://example.com', 'Example');
    assert.ok(bm);
    assert.equal(store.removeBookmark(bm.id), true);
    assert.equal(store.isBookmarked('https://example.com'), false);
    assert.equal(store.removeBookmark('non-existent'), false);
  });
});

test('HistoryStore test suite', async (t) => {
  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eclipse-hist-test-'));
  const testFilePath = path.join(testDir, 'test-history.json');

  t.after(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {}
  });

  await t.test('initializes empty when file does not exist', () => {
    const store = new HistoryStore(testFilePath);
    assert.deepEqual(store.getHistory(), []);
  });

  await t.test('adds history entry and persists', () => {
    const store = new HistoryStore(testFilePath);
    const entry = store.addEntry('https://duckduckgo.com', 'DuckDuckGo');
    assert.ok(entry);
    assert.equal(entry.url, 'https://duckduckgo.com');
    assert.equal(entry.title, 'DuckDuckGo');
    assert.equal(store.getHistory().length, 1);
  });

  await t.test('persists history entries across instances', () => {
    const store = new HistoryStore(testFilePath);
    const list = store.getHistory();
    assert.equal(list.length, 1);
    assert.equal(list[0].url, 'https://duckduckgo.com');
  });

  await t.test('filters out blank and internal urls', () => {
    const store = new HistoryStore(testFilePath);
    assert.equal(store.addEntry('about:blank', 'Blank'), null);
    assert.equal(store.addEntry('view-source:https://example.com', 'Source'), null);
    assert.equal(store.addEntry('   ', 'Empty'), null);
  });

  await t.test('deletes individual entry by id', () => {
    const store = new HistoryStore(testFilePath);
    const e2 = store.addEntry('https://en.wikipedia.org', 'Wikipedia');
    assert.ok(e2);
    assert.equal(store.getHistory().length, 2);
    assert.equal(store.deleteEntry(e2.id), true);
    assert.equal(store.getHistory().length, 1);
    assert.equal(store.deleteEntry('unknown-id'), false);
  });

  await t.test('clears all history', () => {
    const store = new HistoryStore(testFilePath);
    store.clearHistory();
    assert.deepEqual(store.getHistory(), []);

    // Reload from disk to verify
    const reloaded = new HistoryStore(testFilePath);
    assert.deepEqual(reloaded.getHistory(), []);
  });
});
