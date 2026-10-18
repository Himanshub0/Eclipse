import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { SettingsStore } from '../electron/settings-store.ts';

test('SettingsStore test suite', async (t) => {
  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eclipse-settings-test-'));
  const testFilePath = path.join(testDir, 'test-settings.json');

  t.after(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {}
  });

  await t.test('initializes with default settings when file does not exist', () => {
    const store = new SettingsStore(testFilePath);
    const settings = store.getSettings();

    assert.equal(settings.theme, 'dark');
    assert.equal(settings.accentColor, 'arsenic-green');
    assert.equal(settings.searchProvider, 'duckduckgo');
    assert.equal(settings.startupMode, 'homepage');
    assert.equal(settings.homepage, 'https://duckduckgo.com');
    assert.equal(settings.adBlockerEnabled, true);
  });

  await t.test('updates and persists settings to disk atomically', () => {
    const store = new SettingsStore(testFilePath);
    const updated = store.updateSettings({
      theme: 'light',
      accentColor: 'badge-green',
      searchProvider: 'google',
      homepage: 'https://news.ycombinator.com',
      adBlockerEnabled: false,
    });

    assert.equal(updated.theme, 'light');
    assert.equal(updated.accentColor, 'badge-green');
    assert.equal(updated.searchProvider, 'google');
    assert.equal(updated.homepage, 'https://news.ycombinator.com');
    assert.equal(updated.adBlockerEnabled, false);

    // Verify it was written to disk
    assert.equal(fs.existsSync(testFilePath), true);
    const raw = fs.readFileSync(testFilePath, 'utf8');
    const parsed = JSON.parse(raw);
    assert.equal(parsed.theme, 'light');
    assert.equal(parsed.accentColor, 'badge-green');
    assert.equal(parsed.searchProvider, 'google');
    assert.equal(parsed.adBlockerEnabled, false);
  });

  await t.test('reloads existing settings from disk on instantiation', () => {
    const store = new SettingsStore(testFilePath);
    const loaded = store.getSettings();

    assert.equal(loaded.theme, 'light');
    assert.equal(loaded.accentColor, 'badge-green');
    assert.equal(loaded.searchProvider, 'google');
  });

  await t.test('resolves built-in and custom search query templates', () => {
    const store = new SettingsStore(testFilePath);

    // Google
    store.updateSettings({ searchProvider: 'google' });
    assert.equal(store.getSearchTemplate(), 'https://www.google.com/search?q=%s');

    // DuckDuckGo
    store.updateSettings({ searchProvider: 'duckduckgo' });
    assert.equal(store.getSearchTemplate(), 'https://duckduckgo.com/?q=%s');

    // Custom with %s
    store.updateSettings({
      searchProvider: 'custom',
      customSearchUrl: 'https://search.brave.com/search?q=%s',
    });
    assert.equal(store.getSearchTemplate(), 'https://search.brave.com/search?q=%s');

    // Custom without %s (should auto-append)
    store.updateSettings({
      searchProvider: 'custom',
      customSearchUrl: 'https://kagi.com/search?q=',
    });
    assert.equal(store.getSearchTemplate(), 'https://kagi.com/search?q=%s');
  });
});
