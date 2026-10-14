'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  CITY_CODES,
  CONTACT_TYPES,
  type CreateTalentProfile,
  CreateTalentProfileSchema,
  LANGUAGE_CODES,
  LANGUAGE_LEVELS,
  localizedName,
  type SkillCatalog,
  TALENT_PROFILE_LIMITS as LIMITS,
  VISA_TYPES,
  WORK_MODES,
} from '@skillboard/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState, useTransition } from 'react';
import { Controller, type Resolver, useFieldArray, useForm } from 'react-hook-form';
import { saveTalentProfile } from '@/actions/talent-profile';
import { VisaDisclaimer } from '@/components/legal/visa-disclaimer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { Link, useRouter } from '@/i18n/navigation';
import { type ActionFailure, errorMessageKey } from '@/lib/api-errors';
import { cn } from '@/lib/utils';

/**
 * What the form holds while the user types. The schema wants `acknowledgeVisaDisclaimer: true`, but an
 * unticked box is `false`, so the form value is a boolean and the resolver rejects `false`.
 */
export type TalentProfileFormValues = Omit<CreateTalentProfile, 'acknowledgeVisaDisclaimer'> & {
  acknowledgeVisaDisclaimer: boolean;
};

type Props = {
  mode: 'create' | 'edit';
  catalog: SkillCatalog;
  defaultValues: TalentProfileFormValues;
};

/** Empty values for a new profile; also what the create page passes in. */
export const EMPTY_TALENT_PROFILE: TalentProfileFormValues = {
  headline: '',
  description: '',
  cityCode: null,
  workMode: 'HYBRID',
  visaType: null,
  videoUrl: null,
  skillIds: [],
  languages: [{ languageCode: 'en', level: 'FLUENT' }],
  portfolioLinks: [],
  contactMethods: [],
  acknowledgeVisaDisclaimer: false,
};

/** `<select>` and `<input>` give '' for "nothing"; the schema wants null. */
const emptyToNull = (v: unknown) => (v === '' ? null : v);

/**
 * One form for create and edit: same fields, same shared schema, one Server Action. Layout is a single
 * column that works at 390 px; Opus restyles through components/ui, not here (docs/design/README.md).
 */
export function TalentProfileForm({ mode, catalog, defaultValues }: Props) {
  const t = useTranslations('profile.form');
  const tRef = useTranslations('reference');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const languageNames = useMemo(
    () => new Intl.DisplayNames([locale], { type: 'language' }),
    [locale],
  );
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TalentProfileFormValues, unknown, CreateTalentProfile>({
    // Same schema the API validates. The cast only widens the flag from `true` to boolean (see above).
    resolver: zodResolver(CreateTalentProfileSchema) as unknown as Resolver<
      TalentProfileFormValues,
      unknown,
      CreateTalentProfile
    >,
    defaultValues,
  });
  const languages = useFieldArray({ control, name: 'languages' });
  const portfolioLinks = useFieldArray({ control, name: 'portfolioLinks' });
  const contactMethods = useFieldArray({ control, name: 'contactMethods' });

  const onSubmit = handleSubmit((values) => {
    setFailure(null);
    startTransition(async () => {
      const result = await saveTalentProfile(mode, values);
      if (result.ok) router.push('/me/talent-profile');
      else setFailure(result);
    });
  });

  /** Array-level errors: a `custom` issue is our uniqueness refine; everything else is Zod's text. */
  const listError = (
    error: { type?: string | undefined; message?: string | undefined } | undefined,
  ) => (error ? (error.type === 'custom' ? t('errors.duplicate') : error.message) : null);

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <FieldBlock
        label={t('headline.label')}
        hint={t('headline.hint', { max: LIMITS.headlineMax })}
        error={errors.headline?.message}
        htmlFor="headline"
      >
        <Input id="headline" maxLength={LIMITS.headlineMax} {...register('headline')} />
      </FieldBlock>

      <FieldBlock
        label={t('description.label')}
        hint={t('description.hint', { min: LIMITS.descriptionMin, max: LIMITS.descriptionMax })}
        error={errors.description?.message}
        htmlFor="description"
      >
        <Textarea
          id="description"
          rows={6}
          maxLength={LIMITS.descriptionMax}
          {...register('description')}
        />
      </FieldBlock>

      <FieldBlock label={t('city.label')} error={errors.cityCode?.message} htmlFor="cityCode">
        <NativeSelect id="cityCode" {...register('cityCode', { setValueAs: emptyToNull })}>
          <option value="">{t('city.none')}</option>
          {CITY_CODES.map((code) => (
            <option key={code} value={code}>
              {tRef(`cities.${code}`)}
            </option>
          ))}
        </NativeSelect>
      </FieldBlock>

      <FieldBlock label={t('workMode.label')} error={errors.workMode?.message} htmlFor="workMode">
        <NativeSelect id="workMode" {...register('workMode')}>
          {WORK_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {tRef(`workModes.${mode}`)}
            </option>
          ))}
        </NativeSelect>
      </FieldBlock>

      <FieldBlock label={t('visaType.label')} error={errors.visaType?.message} htmlFor="visaType">
        <NativeSelect id="visaType" {...register('visaType', { setValueAs: emptyToNull })}>
          <option value="">{t('visaType.none')}</option>
          {VISA_TYPES.map((code) => (
            <option key={code} value={code}>
              {tRef(`visaTypes.${code}`)}
            </option>
          ))}
        </NativeSelect>
        <VisaDisclaimer />
      </FieldBlock>

      {mode === 'create' && (
        <div className="flex flex-col gap-2">
          <Controller
            name="acknowledgeVisaDisclaimer"
            control={control}
            render={({ field }) => (
              <label className="flex min-h-11 items-start gap-3">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(next) => {
                    field.onChange(next);
                  }}
                  className="mt-1"
                />
                <span>{t('acknowledgeVisaDisclaimer')}</span>
              </label>
            )}
          />
          <FieldMessage error={errors.acknowledgeVisaDisclaimer?.message} />
        </div>
      )}

      <FieldBlock
        label={t('videoUrl.label')}
        hint={t('videoUrl.hint')}
        error={errors.videoUrl?.message}
        htmlFor="videoUrl"
      >
        <Input
          id="videoUrl"
          type="url"
          inputMode="url"
          {...register('videoUrl', { setValueAs: emptyToNull })}
        />
      </FieldBlock>

      <fieldset className="flex flex-col gap-3">
        <legend className="font-medium">{t('skills.label')}</legend>
        <p className="text-sm text-muted-foreground">
          {t('skills.hint', { max: LIMITS.skillsMax })}
        </p>
        <Controller
          name="skillIds"
          control={control}
          render={({ field }) => (
            <div className="flex flex-col gap-4">
              {catalog.categories.map((category) => (
                <div key={category.id} className="flex flex-col gap-1">
                  <p className="text-sm font-medium">{localizedName(category.names, locale)}</p>
                  {category.skills.map((skill) => {
                    const checked = field.value.includes(skill.id);
                    return (
                      <label key={skill.id} className="flex min-h-11 items-center gap-3">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(next) => {
                            field.onChange(
                              next
                                ? [...field.value, skill.id]
                                : field.value.filter((id) => id !== skill.id),
                            );
                          }}
                        />
                        <span>{localizedName(skill.names, locale)}</span>
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        />
        <FieldMessage error={listError(errors.skillIds?.root ?? errors.skillIds)} />
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="font-medium">{t('languages.label')}</legend>
        {languages.fields.map((row, index) => (
          <div key={row.id} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <FieldBlock label={t('languages.language')} htmlFor={`languages-${index}-code`}>
              <NativeSelect
                id={`languages-${index}-code`}
                {...register(`languages.${index}.languageCode`)}
              >
                {LANGUAGE_CODES.map((code) => (
                  <option key={code} value={code}>
                    {languageNames.of(code) ?? code}
                  </option>
                ))}
              </NativeSelect>
            </FieldBlock>
            <FieldBlock label={t('languages.level')} htmlFor={`languages-${index}-level`}>
              <NativeSelect
                id={`languages-${index}-level`}
                {...register(`languages.${index}.level`)}
              >
                {LANGUAGE_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {tRef(`languageLevels.${level}`)}
                  </option>
                ))}
              </NativeSelect>
            </FieldBlock>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              onClick={() => {
                languages.remove(index);
              }}
            >
              {t('languages.remove')}
            </Button>
          </div>
        ))}
        <FieldMessage error={listError(errors.languages?.root ?? errors.languages)} />
        <Button
          type="button"
          variant="outline"
          className="min-h-11 self-start"
          disabled={languages.fields.length >= LIMITS.languagesMax}
          onClick={() => {
            languages.append({ languageCode: 'ko', level: 'BASIC' });
          }}
        >
          {t('languages.add')}
        </Button>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="font-medium">{t('portfolio.label')}</legend>
        {portfolioLinks.fields.map((row, index) => (
          <div key={row.id} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <FieldBlock
              label={t('portfolio.url')}
              htmlFor={`portfolio-${index}-url`}
              error={errors.portfolioLinks?.[index]?.url?.message}
            >
              <Input
                id={`portfolio-${index}-url`}
                type="url"
                inputMode="url"
                {...register(`portfolioLinks.${index}.url`)}
              />
            </FieldBlock>
            <FieldBlock label={t('portfolio.linkLabel')} htmlFor={`portfolio-${index}-label`}>
              <Input
                id={`portfolio-${index}-label`}
                maxLength={LIMITS.portfolioLabelMax}
                {...register(`portfolioLinks.${index}.label`, { setValueAs: emptyToNull })}
              />
            </FieldBlock>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              onClick={() => {
                portfolioLinks.remove(index);
              }}
            >
              {t('portfolio.remove')}
            </Button>
          </div>
        ))}
        <FieldMessage error={listError(errors.portfolioLinks?.root ?? errors.portfolioLinks)} />
        <Button
          type="button"
          variant="outline"
          className="min-h-11 self-start"
          disabled={portfolioLinks.fields.length >= LIMITS.portfolioLinksMax}
          onClick={() => {
            portfolioLinks.append({ url: '', label: null });
          }}
        >
          {t('portfolio.add')}
        </Button>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="font-medium">{t('contacts.label')}</legend>
        <p className="text-sm text-muted-foreground">{t('contacts.hint')}</p>
        {contactMethods.fields.map((row, index) => (
          <div key={row.id} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <FieldBlock label={t('contacts.type')} htmlFor={`contacts-${index}-type`}>
              <NativeSelect
                id={`contacts-${index}-type`}
                {...register(`contactMethods.${index}.type`)}
              >
                {CONTACT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {tRef(`contactTypes.${type}`)}
                  </option>
                ))}
              </NativeSelect>
            </FieldBlock>
            <FieldBlock
              label={t('contacts.value')}
              htmlFor={`contacts-${index}-value`}
              error={errors.contactMethods?.[index]?.value?.message}
            >
              <Input
                id={`contacts-${index}-value`}
                maxLength={LIMITS.contactValueMax}
                {...register(`contactMethods.${index}.value`)}
              />
            </FieldBlock>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              onClick={() => {
                contactMethods.remove(index);
              }}
            >
              {t('contacts.remove')}
            </Button>
          </div>
        ))}
        <FieldMessage error={listError(errors.contactMethods?.root ?? errors.contactMethods)} />
        <Button
          type="button"
          variant="outline"
          className="min-h-11 self-start"
          disabled={contactMethods.fields.length >= LIMITS.contactMethodsMax}
          onClick={() => {
            contactMethods.append({ type: 'EMAIL', value: '' });
          }}
        >
          {t('contacts.add')}
        </Button>
      </fieldset>

      {failure && (
        <Alert variant="destructive">
          <AlertDescription>{tCommon(errorMessageKey(failure.code))}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" disabled={pending} className="min-h-11">
          {t(`submit.${mode}`)}
        </Button>
        <Link
          href="/me/talent-profile"
          className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11')}
        >
          {t('cancel')}
        </Link>
      </div>
    </form>
  );
}

function FieldBlock({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | undefined;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      <FieldMessage error={error} />
    </div>
  );
}

function FieldMessage({ error }: { error?: string | null | undefined }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {error}
    </p>
  );
}
