import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type StateProps = {
  icon?: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  /** Usually one button or button-looking link. */
  action?: ReactNode;
  /** Heading level of the title: `h1` when the state is the whole page (not found, error). */
  as?: 'h1' | 'h2';
  className?: string;
};

function StateCard({
  icon,
  title,
  body,
  action,
  as: Heading = 'h2',
  className,
  iconClassName,
  role,
}: StateProps & { iconClassName: string; role?: 'alert' }) {
  return (
    <div
      role={role}
      className={cn(
        'flex flex-col items-center gap-3 rounded-card bg-card px-6 py-10 text-center',
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            'flex size-12 items-center justify-center rounded-full [&_svg]:size-6',
            iconClassName,
          )}
        >
          {icon}
        </div>
      )}
      <Heading className="text-title-sm font-semibold">{title}</Heading>
      {body && <p className="max-w-sm text-body-sm text-foreground-secondary">{body}</p>}
      {action && (
        <div className="mt-1 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">{action}</div>
      )}
    </div>
  );
}

/** Nothing to show yet: icon, one-line title, a sentence of help, the next step. */
export function EmptyState(props: StateProps) {
  return <StateCard {...props} iconClassName="bg-tag text-tag-foreground" />;
}

/** Something failed: same shape as EmptyState, danger tint on the icon, announced as an alert. */
export function ErrorState(props: StateProps) {
  return <StateCard {...props} role="alert" iconClassName="bg-danger-soft text-danger" />;
}

/** Grey placeholder block for loading layouts. Decorative; `LoadingState` adds the status text. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('animate-pulse rounded-control bg-muted', className)} />
  );
}
