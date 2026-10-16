import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';

/** A link to a legal text inside a sentence (`t.rich` tag). Opens in a new tab so the form is kept. */
export function TermsLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      target="_blank"
      className="font-medium text-primary underline hover:text-primary-hover"
    >
      {children}
    </Link>
  );
}
