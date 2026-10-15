'use client';

import { useLocale, useTranslations } from 'next-intl';
import { signOut } from '@/actions/auth';
import { Button } from '@/components/ui/button';

export function SignOutButton() {
  const t = useTranslations('common.nav');
  const locale = useLocale();
  return (
    <form action={signOut.bind(null, locale)}>
      <Button type="submit" variant="ghost">
        {t('signOut')}
      </Button>
    </form>
  );
}
