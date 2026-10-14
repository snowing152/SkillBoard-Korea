import { describe, expect, it } from 'vitest';
import { SLUG_MAX_LENGTH, slugify } from './slug.js';

describe('slugify', () => {
  it('lower-cases, strips diacritics and joins words with dashes', () => {
    expect(slugify('Anna Petrova')).toBe('anna-petrova');
    expect(slugify('  José  Álvarez! ')).toBe('jose-alvarez');
  });

  it('falls back when nothing ASCII remains (Cyrillic, Hangul)', () => {
    expect(slugify('Анна Петрова')).toBe('talent');
    expect(slugify('김민준', 'user')).toBe('user');
  });

  it('caps the length without leaving a trailing dash', () => {
    const slug = slugify('a '.repeat(60));
    expect(slug.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH);
    expect(slug.endsWith('-')).toBe(false);
  });
});
