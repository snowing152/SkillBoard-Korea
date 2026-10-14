import { localizedName, type TalentProfile } from '@skillboard/shared';
import { getLocale, getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';

/**
 * Presentational Server Component shared by the public page and the owner's page. It only renders
 * what `TalentProfileSchema` contains, so contact methods can never appear here by accident.
 */
export async function TalentProfileView({ profile }: { profile: TalentProfile }) {
  const t = await getTranslations('profile.view');
  const tRef = await getTranslations('reference');
  const locale = await getLocale();
  const languageNames = new Intl.DisplayNames([locale], { type: 'language' });

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">{profile.headline}</h1>
        <p className="text-muted-foreground">{profile.displayName}</p>
        <div className="flex flex-wrap gap-2">
          {profile.cityCode && (
            <Badge variant="secondary">{tRef(`cities.${profile.cityCode}`)}</Badge>
          )}
          <Badge variant="secondary">{tRef(`workModes.${profile.workMode}`)}</Badge>
          {profile.visaType && (
            <Badge variant="outline" title={t('visaNote')}>
              {tRef(`visaTypes.${profile.visaType}`)}
            </Badge>
          )}
        </div>
        {profile.visaType && <p className="text-xs text-muted-foreground">{t('visaNote')}</p>}
      </header>

      <p className="leading-relaxed whitespace-pre-line">{profile.description}</p>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">{t('skills')}</h2>
        <ul className="flex flex-wrap gap-2">
          {profile.skills.map((skill) => (
            <li key={skill.id}>
              <Badge>{localizedName(skill.names, locale)}</Badge>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">{t('languages')}</h2>
        <ul className="flex flex-col gap-1">
          {profile.languages.map((lang) => (
            <li key={lang.languageCode}>
              {languageNames.of(lang.languageCode) ?? lang.languageCode}
              <span className="text-muted-foreground">
                {' '}
                · {tRef(`languageLevels.${lang.level}`)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {(profile.portfolioLinks.length > 0 || profile.videoUrl) && (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">{t('portfolio')}</h2>
          <ul className="flex flex-col gap-1">
            {profile.videoUrl && (
              <li>
                <a
                  href={profile.videoUrl}
                  rel="noopener noreferrer nofollow"
                  target="_blank"
                  className="underline"
                >
                  {t('video')}
                </a>
              </li>
            )}
            {profile.portfolioLinks.map((link) => (
              <li key={link.id}>
                <a
                  href={link.url}
                  rel="noopener noreferrer nofollow"
                  target="_blank"
                  className="break-all underline"
                >
                  {link.label ?? link.url}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {profile.publishedAt && (
        <p className="text-xs text-muted-foreground">
          {t('publishedAt', { date: new Date(profile.publishedAt) })}
        </p>
      )}
    </article>
  );
}
