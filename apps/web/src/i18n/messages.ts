import type { Locale } from '@skillboard/shared';
import type { Messages } from 'next-intl';

/** One JSON file per namespace in messages/<locale>/. Add a namespace here when you add a file. */
export const NAMESPACES = ['common', 'home'] as const;
export type Namespace = (typeof NAMESPACES)[number];

export async function loadMessages(locale: Locale): Promise<Messages> {
  const entries = await Promise.all(
    NAMESPACES.map(async (ns) => {
      const mod = (await import(`../../messages/${locale}/${ns}.json`)) as { default: unknown };
      return [ns, mod.default] as const;
    }),
  );
  // The JSON files are validated against the English keys in routing.test.ts.
  return Object.fromEntries(entries) as Messages;
}
