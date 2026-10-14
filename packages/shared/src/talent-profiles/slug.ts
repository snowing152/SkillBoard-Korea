export const SLUG_MAX_LENGTH = 40;

/**
 * URL slug from a display name: ASCII letters and digits only, dashes between words.
 * Deliberately no transliteration: a Cyrillic or Hangul name becomes the fallback and the service adds a
 * short suffix, which is predictable and avoids a transliteration dependency. Pure function: the
 * service tests it with the Prisma mock, the web never calls it.
 */
export function slugify(input: string, fallback = 'talent'): string {
  const slug = input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics left by NFKD (é -> e)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, '');
  return slug || fallback;
}
