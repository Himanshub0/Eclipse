import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeUrl } from '../src/utils/url.ts';

test('URL Normalization test suite', async (t) => {
  await t.test('preserves valid https URL', () => {
    assert.equal(normalizeUrl('https://example.com'), 'https://example.com/');
    assert.equal(normalizeUrl('https://example.com/path?q=test'), 'https://example.com/path?q=test');
  });

  await t.test('preserves valid http localhost URL', () => {
    assert.equal(normalizeUrl('http://localhost:3000'), 'http://localhost:3000/');
    assert.equal(normalizeUrl('http://localhost:3000/app'), 'http://localhost:3000/app');
    assert.equal(normalizeUrl('localhost:3000'), 'http://localhost:3000/');
  });

  await t.test('normalizes domain without scheme to https', () => {
    assert.equal(normalizeUrl('example.com'), 'https://example.com/');
    assert.equal(normalizeUrl('sub.example.org/path'), 'https://sub.example.org/path');
  });

  await t.test('converts search terms with spaces to search engine query', () => {
    assert.equal(
      normalizeUrl('best programming languages'),
      'https://www.google.com/search?q=best%20programming%20languages'
    );
  });

  await t.test('converts single non-domain words to search engine query', () => {
    assert.equal(
      normalizeUrl('electron'),
      'https://www.google.com/search?q=electron'
    );
  });

  await t.test('neutralizes dangerous schemes like javascript: and file:', () => {
    assert.equal(
      normalizeUrl('javascript:alert(1)'),
      'https://www.google.com/search?q=javascript%3Aalert(1)'
    );
    assert.equal(
      normalizeUrl('file:///C:/secret.txt'),
      'https://www.google.com/search?q=file%3A%2F%2F%2FC%3A%2Fsecret.txt'
    );
  });

  await t.test('handles empty and whitespace input', () => {
    assert.equal(normalizeUrl(''), 'about:blank');
    assert.equal(normalizeUrl('   '), 'about:blank');
    assert.equal(normalizeUrl('about:blank'), 'about:blank');
    assert.equal(normalizeUrl('ABOUT:BLANK'), 'about:blank');
  });
});
