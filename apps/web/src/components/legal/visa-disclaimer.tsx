import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

/**
 * The one visa sentence shown wherever a visa type appears: profile form, public profile, search
 * filters. No state, so it works in Server and Client Components alike.
 */
export function VisaDisclaimer({ className }: { className?: string }) {
  const t = useTranslations('legal.disclaimer');
  return (
    <p className={className ?? 'text-xs text-muted-foreground'}>
      {t('short')}{' '}
      <Link href="/legal/visa" className="underline">
        {t('link')}
      </Link>
    </p>
  );
}
