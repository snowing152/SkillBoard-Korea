import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/** Wordmark linking home. Inherits its color, so it works on the page and on the media cover. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        'flex min-h-11 items-center text-body font-semibold text-current no-underline',
        className,
      )}
    >
      SkillBoard
    </Link>
  );
}
