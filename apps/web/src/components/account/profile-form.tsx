'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { LOCALES, type UpdateMe, UpdateMeSchema } from '@skillboard/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { updateAccount } from '@/actions/account';
import { TextField } from '@/components/auth/auth-fields';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { type ActionFailure, errorMessageKey } from '@/lib/api-errors';

type Props = { displayName: string; locale: UpdateMe['locale'] };

/** Display name and UI language. Saving a new language re-opens the page under that locale's prefix. */
export function ProfileForm({ displayName, locale }: Props) {
  const t = useTranslations('account');
  const tLang = useTranslations('common.language');
  const currentLocale = useLocale();
  const tCommon = useTranslations('common');
  const [saved, setSaved] = useState(false);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateMe>({
    resolver: zodResolver(UpdateMeSchema),
    defaultValues: { displayName, locale },
  });

  const onSubmit = handleSubmit((values) => {
    setFailure(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateAccount(values, currentLocale);
      if (result.ok) setSaved(true);
      else setFailure(result);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <TextField
        id="displayName"
        label={t('displayName')}
        autoComplete="name"
        error={errors.displayName?.message}
        {...register('displayName')}
      />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="locale">{t('language')}</Label>
        <NativeSelect id="locale" {...register('locale')}>
          {LOCALES.map((code) => (
            <option key={code} value={code}>
              {tLang(code)}
            </option>
          ))}
        </NativeSelect>
      </div>
      {saved && (
        <Alert variant="success">
          <AlertDescription>{t('saved')}</AlertDescription>
        </Alert>
      )}
      {failure && (
        <Alert variant="destructive">
          <AlertDescription>{tCommon(errorMessageKey(failure.code))}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={pending} className="self-start">
        {t('save')}
      </Button>
    </form>
  );
}
