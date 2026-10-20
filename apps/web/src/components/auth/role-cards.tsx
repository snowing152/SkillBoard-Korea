'use client';

import { SIGNUP_ROLES, type SignupRole } from '@skillboard/shared';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const ROLE_KEYS = {
  TALENT: { label: 'roleTalent', hint: 'roleTalentHint' },
  CLIENT: { label: 'roleClient', hint: 'roleClientHint' },
} as const;

/**
 * The two role cards of the sign-up flow (also used by the Google role-choice step). Wording never says
 * "company": a client may be a private person. Full-width cards, 44 px or taller, on a phone.
 */
export function RoleCards({
  value,
  onChange,
}: {
  value: SignupRole;
  onChange: (role: SignupRole) => void;
}) {
  const t = useTranslations('auth.signUp');
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-body-sm font-medium">{t('roleLegend')}</legend>
      {SIGNUP_ROLES.map((role) => (
        <label
          key={role}
          className={cn(
            'flex min-h-11 cursor-pointer flex-col gap-0.5 rounded-card border bg-card p-4 transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/40',
            value === role ? 'border-primary bg-tag' : 'border-input',
          )}
        >
          <span className="flex items-center gap-3">
            <input
              type="radio"
              name="role"
              value={role}
              checked={value === role}
              onChange={() => {
                onChange(role);
              }}
              className="size-4 accent-primary"
            />
            <span className="text-body font-medium">{t(ROLE_KEYS[role].label)}</span>
          </span>
          <span className="pl-7 text-label text-muted-foreground">{t(ROLE_KEYS[role].hint)}</span>
        </label>
      ))}
    </fieldset>
  );
}
