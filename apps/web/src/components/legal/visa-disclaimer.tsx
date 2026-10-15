import { HIKOREA_URL } from '@skillboard/shared';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * The visa sentence shown wherever a visa type appears: profile form, public profile, search filters.
 * No state, so it works in Server and Client Components alike.
 * - `full` (default): the whole sentence plus the link to /legal/visa.
 * - `bar`: one short line for the profile's sticky action bar, with the disclaimer link and the
 *   official HiKorea site (new tab). Same link text as `full`, so both read the same to screen readers.
 */
export function VisaDisclaimer({
  variant = 'full',
  className,
}: {
  variant?: 'full' | 'bar';
  className?: string;
}) {
  const t = useTranslations('legal.disclaimer');
  if (variant === 'bar') {
    return (
      <p className={cn('text-center text-caption text-muted-foreground', className)}>
        {t.rich('bar', {
          visa: (chunks) => (
            <Link href="/legal/visa" className="text-primary underline hover:text-primary-hover">
              {chunks}
            </Link>
          ),
          hikorea: (chunks) => (
            <a
              href={HIKOREA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:text-primary-hover"
            >
              {chunks}
            </a>
          ),
        })}
      </p>
    );
  }
  return (
    <p className={cn('text-label text-muted-foreground', className)}>
      {t('short')}{' '}
      <Link href="/legal/visa" className="text-primary underline hover:text-primary-hover">
        {t('link')}
      </Link>
    </p>
  );
}
