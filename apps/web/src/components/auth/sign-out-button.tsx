'use client';

import { useTranslations } from 'next-intl';
import { signOut } from '@/actions/auth';
import { Button } from '@/components/ui/button';

export function SignOutButton() {
  const t = useTranslations('common.nav');
  return (
    <form action={signOut}>
      <Button type="submit" variant="outline" className="min-h-11">
        {t('signOut')}
      </Button>
    </form>
  );
}
