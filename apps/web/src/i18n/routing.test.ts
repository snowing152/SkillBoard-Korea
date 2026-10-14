import { DEFAULT_LOCALE, LOCALES } from '@skillboard/shared';
import { describe, expect, it } from 'vitest';
import { NAMESPACES } from './messages';
import { routing } from './routing';

describe('i18n wiring', () => {
  it('uses the shared locale list and default', () => {
    expect([...routing.locales]).toEqual([...LOCALES]);
    expect(routing.defaultLocale).toBe(DEFAULT_LOCALE);
  });

  it('has every namespace file for every locale with the same keys as English', async () => {
    const flatten = (obj: unknown, prefix = ''): string[] =>
      typeof obj === 'object' && obj !== null
        ? Object.entries(obj).flatMap(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k))
        : [prefix];

    for (const ns of NAMESPACES) {
      const en = (await import(`../../messages/en/${ns}.json`)) as { default: unknown };
      const enKeys = flatten(en.default).sort();
      for (const locale of LOCALES) {
        const mod = (await import(`../../messages/${locale}/${ns}.json`)) as { default: unknown };
        expect(flatten(mod.default).sort(), `${locale}/${ns}.json`).toEqual(enKeys);
      }
    }
  });
});
