import test from 'node:test';
import assert from 'node:assert/strict';
import { AdBlockerManager } from '../electron/ad-blocker.ts';

test('AdBlockerManager test suite', async (t) => {
  await t.test('initializes enabled by default', () => {
    const manager = new AdBlockerManager(true);
    assert.equal(manager.getIsEnabled(), true);
    assert.equal(manager.getBlockedCount(), 0);
  });

  await t.test('updates enabled state dynamically', () => {
    const manager = new AdBlockerManager(true);
    manager.setEnabled(false);
    assert.equal(manager.getIsEnabled(), false);

    manager.setEnabled(true);
    assert.equal(manager.getIsEnabled(), true);
  });
});
