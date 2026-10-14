import { describe, expect, it } from 'vitest';
import { safeNextPath } from './safe-path';

const FALLBACK = '/me/talent-profile';

describe('safeNextPath', () => {
  it('keeps in-site paths with a query string', () => {
    expect(safeNextPath('/me/account', FALLBACK)).toBe('/me/account');
    expect(safeNextPath('/talents?limit=10', FALLBACK)).toBe('/talents?limit=10');
  });

  it('falls back for missing, repeated or empty values', () => {
    expect(safeNextPath(undefined, FALLBACK)).toBe(FALLBACK);
    expect(safeNextPath(['/a', '/b'], FALLBACK)).toBe(FALLBACK);
    expect(safeNextPath('', FALLBACK)).toBe(FALLBACK);
  });

  it('rejects absolute and protocol-relative URLs', () => {
    expect(safeNextPath('https://evil.example', FALLBACK)).toBe(FALLBACK);
    expect(safeNextPath('//evil.example', FALLBACK)).toBe(FALLBACK);
    expect(safeNextPath('/\\evil.example', FALLBACK)).toBe(FALLBACK);
    expect(safeNextPath('javascript:alert(1)', FALLBACK)).toBe(FALLBACK);
  });

  it('rejects the exact open-redirect payloads against evil.com', () => {
    for (const payload of [
      '//evil.com',
      '/\\evil.com',
      'https://evil.com',
      'javascript:alert(1)',
      ' //evil.com',
      '/\t/evil.com', // browsers strip tabs, which would turn this into //evil.com
    ]) {
      expect(safeNextPath(payload, FALLBACK), payload).toBe(FALLBACK);
    }
  });

  it('rejects control characters and very long values', () => {
    expect(safeNextPath('/a\nb', FALLBACK)).toBe(FALLBACK);
    expect(safeNextPath(`/${'a'.repeat(200)}`, FALLBACK)).toBe(FALLBACK);
  });
});
