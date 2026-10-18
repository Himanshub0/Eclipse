/**
 * URL normalization utility for Project Browser address bar.
 *
 * Implements safe URL inference and search provider fallback:
 * - Preserves existing valid http/https URLs.
 * - Resolves localhost and IP addresses.
 * - Normalizes domain names (e.g., example.com -> https://example.com).
 * - Routes search phrases and single words to search engine.
 * - Neutralizes dangerous schemes (javascript:, vbscript:, file:, data:).
 */

export const DEFAULT_SEARCH_TEMPLATE = 'https://duckduckgo.com/?q=%s';

export function normalizeUrl(
  input: string,
  searchTemplate = DEFAULT_SEARCH_TEMPLATE
): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return 'about:blank';
  }

  const lower = trimmed.toLowerCase();

  // Neutralize dangerous / arbitrary code execution or local file access schemes
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:') ||
    lower.startsWith('data:')
  ) {
    return searchTemplate.replace('%s', encodeURIComponent(trimmed));
  }

  // If already an explicit http: or https: scheme
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      return parsed.href;
    } catch {
      return searchTemplate.replace('%s', encodeURIComponent(trimmed));
    }
  }

  // Any whitespace implies a multi-word search query
  if (/\s/.test(trimmed)) {
    return searchTemplate.replace('%s', encodeURIComponent(trimmed));
  }

  // Check for localhost or IPv4 (with optional port and path)
  if (/^(localhost|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?(\/.*)?$/i.test(trimmed)) {
    try {
      const parsed = new URL(`http://${trimmed}`);
      return parsed.href;
    } catch {
      return searchTemplate.replace('%s', encodeURIComponent(trimmed));
    }
  }

  // Check if string resembles a domain (e.g. example.com, sub.domain.org/path)
  // Requires at least one dot, valid hostname characters, and at least a 2-letter TLD
  if (/^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}(:\d+)?(\/.*)?$/.test(trimmed)) {
    try {
      const parsed = new URL(`https://${trimmed}`);
      return parsed.href;
    } catch {
      return searchTemplate.replace('%s', encodeURIComponent(trimmed));
    }
  }

  // Single words or non-domain strings fallback to search query
  return searchTemplate.replace('%s', encodeURIComponent(trimmed));
}
