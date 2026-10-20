import type { ComponentProps, ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** One field error line, announced to screen readers. Returns nothing when there is no error. */
export function FieldMessage({ id, error }: { id?: string; error?: string | null | undefined }) {
  if (!error) return null;
  return (
    <p id={id} role="alert" className="text-label font-medium text-danger">
      {error}
    </p>
  );
}

type TextFieldProps = Omit<ComponentProps<typeof Input>, 'id'> & {
  id: string;
  label: ReactNode;
  error?: string | undefined;
  hint?: ReactNode;
};

/** Label, input, optional hint and error for the account forms; wiring (`aria-*`) lives here once. */
export function TextField({ id, label, error, hint, ...inputProps }: TextFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        {...inputProps}
      />
      {hint && !error && (
        <p id={hintId} className="text-label text-muted-foreground">
          {hint}
        </p>
      )}
      <FieldMessage id={errorId} error={error} />
    </div>
  );
}
