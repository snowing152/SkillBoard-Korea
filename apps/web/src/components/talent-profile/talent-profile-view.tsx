import { localizedName, type TalentProfile } from '@skillboard/shared';
import { ExternalLinkIcon, PlayIcon } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Avatar } from '@/components/ds/avatar';
import { FactGrid, FactTile } from '@/components/ds/fact-tile';
import { MediaCover } from '@/components/ds/media-cover';
import { SegmentedTabs } from '@/components/ds/segmented-tabs';
import { SkillTag, SkillTagList } from '@/components/ds/skill-tag';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  profile: TalentProfile;
  /** Header row inside the cover (public page on phones). The owner's page has the site header. */
  coverHeader?: ReactNode;
  /** `h2` when the page already has its own `<h1>` (owner's page). */
  nameAs?: 'h1' | 'h2';
};

/**
 * Presentational Server Component shared by the public page and the owner's page, laid out as the
 * approved "M4" profile: media cover, avatar, name + headline, four fact tiles, About/Portfolio tabs.
 * It only renders what `TalentProfileSchema` contains, so contact methods can never appear here.
 */
export async function TalentProfileView({ profile, coverHeader, nameAs: Name = 'h1' }: Props) {
  const t = await getTranslations('profile.view');
  const tRef = await getTranslations('reference');
  const locale = await getLocale();
  const languageNames = new Intl.DisplayNames([locale], { type: 'language' });

  const about = (
    <section className="flex flex-col gap-stack rounded-card bg-card p-4">
      <p className="text-body-sm whitespace-pre-line">{profile.description}</p>
      {profile.skills.length > 0 && (
        <SkillTagList label={t('skills')}>
          {profile.skills.map((skill) => (
            <SkillTag key={skill.id}>{localizedName(skill.names, locale)}</SkillTag>
          ))}
        </SkillTagList>
      )}
      {profile.publishedAt && (
        <p className="text-caption text-muted-foreground">
          {t('publishedAt', { date: new Date(profile.publishedAt) })}
        </p>
      )}
    </section>
  );

  const portfolio = (
    <section className="flex flex-col rounded-card bg-card p-2">
      {profile.portfolioLinks.length === 0 ? (
        <p className="p-2 text-body-sm text-muted-foreground">{t('portfolioEmpty')}</p>
      ) : (
        <ul className="flex flex-col">
          {profile.portfolioLinks.map((link) => (
            <li key={link.id}>
              <a
                href={link.url}
                rel="noopener noreferrer nofollow"
                target="_blank"
                className="flex min-h-11 items-center justify-between gap-3 rounded-control px-2 py-2 text-body-sm text-primary hover:bg-muted"
              >
                <span className="min-w-0 break-all">{link.label ?? link.url}</span>
                <ExternalLinkIcon aria-hidden="true" className="size-4 shrink-0" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <article className="flex flex-col">
      <MediaCover
        hasMedia={Boolean(profile.videoUrl)}
        header={coverHeader}
        className="sm:rounded-card"
        action={
          profile.videoUrl && (
            <a
              href={profile.videoUrl}
              rel="noopener noreferrer nofollow"
              target="_blank"
              className={cn(
                buttonVariants({ variant: 'inverse', shape: 'pill' }),
                'pl-3 text-body-sm',
              )}
            >
              <PlayIcon aria-hidden="true" className="fill-primary text-primary" />
              {t('watchIntro')}
            </a>
          )
        }
        overlap={<Avatar name={profile.displayName} photoUrl={profile.photoUrl} size="lg" ringed />}
      />

      <div className="flex flex-col gap-stack px-gutter pt-11 sm:px-0">
        <header className="flex flex-col gap-1 px-1">
          <Name className="text-title font-semibold wrap-break-word">{profile.displayName}</Name>
          <p className="text-body-sm text-foreground-secondary">{profile.headline}</p>
        </header>

        <FactGrid>
          <FactTile label={t('facts.location')}>
            {profile.cityCode ? tRef(`cities.${profile.cityCode}`) : t('notSpecified')}
          </FactTile>
          <FactTile label={t('facts.format')}>{tRef(`workModes.${profile.workMode}`)}</FactTile>
          <FactTile label={t('facts.visa')}>
            {profile.visaType ? tRef(`visaTypes.${profile.visaType}`) : t('notSpecified')}
          </FactTile>
          <FactTile label={t('facts.languages')}>
            <ul>
              {profile.languages.map((lang) => (
                <li key={lang.languageCode}>
                  {languageNames.of(lang.languageCode) ?? lang.languageCode}{' '}
                  <span className="font-normal text-muted-foreground">
                    · {tRef(`languageLevels.${lang.level}`)}
                  </span>
                </li>
              ))}
            </ul>
          </FactTile>
        </FactGrid>

        <SegmentedTabs
          label={t('sectionsLabel')}
          tabs={[
            { value: 'about', label: t('about'), content: about },
            { value: 'portfolio', label: t('portfolio'), content: portfolio },
          ]}
        />
      </div>
    </article>
  );
}
