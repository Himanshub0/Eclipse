import test from 'node:test';
import assert from 'node:assert/strict';

import { validateUrlPayload, validateHeightPayload, IPC_CHANNELS } from '../electron/ipc.ts';

test('IPC Validator test suite', async (t) => {
  await t.test('channels are defined as constants', () => {
    assert.equal(IPC_CHANNELS.NAVIGATE, 'browser:navigate');
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

  await t.test('rejects overly long URL strings', () => {
    const huge = 'a'.repeat(5000);
    assert.throws(() => validateUrlPayload(huge), RangeError);
  });

  await t.test('validates and clamps valid height payloads', () => {
    assert.equal(validateHeightPayload(76), 76);
    assert.equal(validateHeightPayload(75.8), 76);
  });

  await t.test('rejects invalid height payloads', () => {
    assert.throws(() => validateHeightPayload('76'), TypeError);
    assert.throws(() => validateHeightPayload(NaN), TypeError);
    assert.throws(() => validateHeightPayload(10), RangeError);
    assert.throws(() => validateHeightPayload(500), RangeError);
  });
});
