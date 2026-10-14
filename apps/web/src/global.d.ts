import type { routing } from '@/i18n/routing';
import type auth from '../messages/en/auth.json';
import type common from '../messages/en/common.json';
import type home from '../messages/en/home.json';
import type legal from '../messages/en/legal.json';
import type profile from '../messages/en/profile.json';
import type reference from '../messages/en/reference.json';

// Type-safe translation keys: `t('missingKey')` is a compile error. English is the source of truth.
declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: {
      common: typeof common;
      home: typeof home;
      auth: typeof auth;
      profile: typeof profile;
      reference: typeof reference;
      legal: typeof legal;
    };
  }
}
