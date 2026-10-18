import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateUrlPayload,
  validateTabIdPayload,
  validateLayoutBoundsPayload,
  validateSettingsPayload,
  validateClearDataPayload,
  validateFindInPageOptions,
  validateMoveTabDirection,
  IPC_CHANNELS,
} from '../electron/ipc.ts';

test('IPC Validator test suite', async (t) => {
  await t.test('channels are defined as constants', () => {
    assert.equal(IPC_CHANNELS.NAVIGATE, 'browser:navigate');
    assert.equal(IPC_CHANNELS.CREATE_TAB, 'browser:create-tab');
    assert.equal(IPC_CHANNELS.SWITCH_TAB, 'browser:switch-tab');
    assert.equal(IPC_CHANNELS.CLOSE_TAB, 'browser:close-tab');
    assert.equal(IPC_CHANNELS.REOPEN_CLOSED_TAB, 'browser:reopen-closed-tab');
    assert.equal(IPC_CHANNELS.MOVE_TAB, 'browser:move-tab');
    assert.equal(IPC_CHANNELS.STATE_CHANGED, 'browser:state-changed');
    assert.equal(IPC_CHANNELS.FIND_IN_PAGE, 'browser:find-in-page');
    assert.equal(IPC_CHANNELS.STOP_FIND_IN_PAGE, 'browser:stop-find-in-page');
    assert.equal(IPC_CHANNELS.FOUND_IN_PAGE, 'browser:found-in-page');
    assert.equal(IPC_CHANNELS.ZOOM_IN, 'browser:zoom-in');
    assert.equal(IPC_CHANNELS.ZOOM_OUT, 'browser:zoom-out');
    assert.equal(IPC_CHANNELS.RESET_ZOOM, 'browser:reset-zoom');
    assert.equal(IPC_CHANNELS.GET_BOOKMARKS, 'bookmarks:get');
    assert.equal(IPC_CHANNELS.TOGGLE_BOOKMARK, 'bookmarks:toggle');
    assert.equal(IPC_CHANNELS.GET_HISTORY, 'history:get');
    assert.equal(IPC_CHANNELS.CLEAR_HISTORY, 'history:clear');
    assert.equal(IPC_CHANNELS.TRIGGER_ACTION, 'browser:trigger-action');
    assert.equal(IPC_CHANNELS.PRERESOLVE_HOST, 'browser:preresolve-host');
    assert.equal(IPC_CHANNELS.GET_ADBLOCKER_STATS, 'adblocker:get-stats');
    assert.equal(IPC_CHANNELS.DISCARD_TAB, 'browser:discard-tab');
    assert.equal(IPC_CHANNELS.GET_SYSTEM_METRICS, 'system:get-metrics');
  });

  await t.test('validates valid URL strings', () => {
    assert.equal(validateUrlPayload('https://example.com'), 'https://example.com');
    assert.equal(validateUrlPayload('   github.com  '), 'github.com');
  });

  await t.test('rejects non-string URL payloads', () => {
    assert.throws(() => validateUrlPayload(123), TypeError);
    assert.throws(() => validateUrlPayload(null), TypeError);
    assert.throws(() => validateUrlPayload({}), TypeError);
  });

  await t.test('validates and rejects tab IDs', () => {
    assert.equal(validateTabIdPayload('tab-1'), 'tab-1');
    assert.throws(() => validateTabIdPayload(''), RangeError);
    assert.throws(() => validateTabIdPayload(123), TypeError);
  });

  await t.test('validates layout bounds payload', () => {
    const valid = validateLayoutBoundsPayload({ sidebarWidth: 240, topBarHeight: 48 });
    assert.equal(valid.sidebarWidth, 240);
    assert.equal(valid.topBarHeight, 48);

    assert.throws(() => validateLayoutBoundsPayload(null), TypeError);
    assert.throws(() => validateLayoutBoundsPayload({ sidebarWidth: -5, topBarHeight: 40 }), RangeError);
  });

  await t.test('validates find in page options', () => {
    assert.deepEqual(validateFindInPageOptions(undefined), { forward: true, findNext: false, matchCase: false });
    assert.deepEqual(validateFindInPageOptions('invalid'), { forward: true, findNext: false, matchCase: false });
    assert.deepEqual(validateFindInPageOptions({ forward: false, findNext: true, matchCase: true }), {
      forward: false,
      findNext: true,
      matchCase: true,
    });
  });

  await t.test('validates move tab direction', () => {
    assert.equal(validateMoveTabDirection('left'), 'left');
    assert.equal(validateMoveTabDirection('right'), 'right');
    assert.throws(() => validateMoveTabDirection('up'), TypeError);
    assert.throws(() => validateMoveTabDirection(123), TypeError);
  });

  await t.test('validates settings payload', () => {
    const validated = validateSettingsPayload({
      theme: 'light',
      accentColor: 'badge-green',
      searchProvider: 'google',
      homepage: '  https://news.ycombinator.com  ',
      invalidKey: 'malicious',
      startupMode: 'newtab',
      tabDiscardingEnabled: true,
    });
    assert.equal(validated.theme, 'light');
    assert.equal(validated.accentColor, 'badge-green');
    assert.equal(validated.searchProvider, 'google');
    assert.equal(validated.homepage, 'https://news.ycombinator.com');
    assert.equal(validated.startupMode, 'newtab');
    assert.equal(validated.tabDiscardingEnabled, true);
    assert.equal(Object.prototype.hasOwnProperty.call(validated, 'invalidKey'), false);

    assert.throws(() => validateSettingsPayload(null), TypeError);
    assert.throws(() => validateSettingsPayload('not an object'), TypeError);
  });

  await t.test('validates clear data payload', () => {
    const valid = validateClearDataPayload({ cache: true, cookies: false, storage: true });
    assert.deepEqual(valid, { cache: true, cookies: false, storage: true });

    assert.throws(() => validateClearDataPayload(null), TypeError);
  });
});
