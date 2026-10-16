'use client';

import { useTranslations } from 'next-intl';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  /** `<API origin>/v1/auth/google?…` built by the page; the whole flow is a normal browser navigation. */
  href: string;
  className?: string;
};

/** "Continue with Google" as a real link: the browser leaves for the API, then Google, then returns. */
export function GoogleLink({ href, className }: Props) {
  const t = useTranslations('auth.google');
  return (
    <a
      href={href}
      className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full', className)}
    >
      {t('continue')}
    </a>
  );
}

/** The "or" line between the password form and the Google button. */
export function OrDivider() {
  const t = useTranslations('auth.google');
  return (
    <div className="flex items-center gap-3 text-label text-muted-foreground" aria-hidden="true">
      <span className="h-px flex-1 bg-border" />
      {t('or')}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
