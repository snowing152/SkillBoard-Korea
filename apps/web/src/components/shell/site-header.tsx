import { LanguageSwitcher } from '@/components/shell/language-switcher';
import { Logo } from '@/components/shell/logo';
import { HeaderNav } from '@/components/shell/main-nav';
import { cn } from '@/lib/utils';

/**
 * Top bar on every page: wordmark, desktop navigation, language menu. On phones the navigation lives
 * in the bottom bar instead. `className` lets the profile page show it on desktop only.
 */
export function SiteHeader({
  className,
  signedIn,
}: {
  className?: string;
  signedIn?: boolean | undefined;
}) {
  return (
    <header className={cn('border-b bg-background', className)}>
      <div className="mx-auto flex h-14 w-full max-w-shell items-center justify-between gap-4 px-gutter">
        <Logo className="text-foreground" />
        <div className="flex items-center gap-2">
          <HeaderNav signedIn={signedIn} />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
