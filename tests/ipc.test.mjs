import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateUrlPayload,
  validateTabIdPayload,
  validateLayoutBoundsPayload,
  IPC_CHANNELS,
} from '../electron/ipc.ts';

test('IPC Validator test suite', async (t) => {
  await t.test('channels are defined as constants', () => {
    assert.equal(IPC_CHANNELS.NAVIGATE, 'browser:navigate');
    assert.equal(IPC_CHANNELS.CREATE_TAB, 'browser:create-tab');
    assert.equal(IPC_CHANNELS.SWITCH_TAB, 'browser:switch-tab');
    assert.equal(IPC_CHANNELS.CLOSE_TAB, 'browser:close-tab');
    assert.equal(IPC_CHANNELS.STATE_CHANGED, 'browser:state-changed');
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
});
