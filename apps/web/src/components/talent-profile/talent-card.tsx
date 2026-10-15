import { localizedName, type TalentCard as TalentCardData } from '@skillboard/shared';
import { getLocale, getTranslations } from 'next-intl/server';
import { Avatar } from '@/components/ds/avatar';
import { SkillTag, SkillTagList } from '@/components/ds/skill-tag';
import { Link } from '@/i18n/navigation';

/** List item for /talents and, later, search results. Whole card is one link (thumb-friendly). */
export async function TalentCard({ talent }: { talent: TalentCardData }) {
  const tRef = await getTranslations('reference');
  const locale = await getLocale();

  return (
    <Link
      href={`/t/${talent.slug}`}
      className="flex flex-col gap-stack rounded-card bg-card p-4 text-foreground no-underline transition-shadow hover:ring-1 hover:ring-input"
    >
      <div className="flex items-start gap-3">
        <Avatar name={talent.displayName} photoUrl={talent.photoUrl} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-body font-semibold wrap-break-word">{talent.headline}</h2>
          <p className="text-label text-foreground-secondary">
            {talent.displayName}
            {talent.cityCode && ` · ${tRef(`cities.${talent.cityCode}`)}`}
            {` · ${tRef(`workModes.${talent.workMode}`)}`}
          </p>
        </div>
      </div>
      {talent.skills.length > 0 && (
        <SkillTagList>
          {talent.skills.map((skill) => (
            <SkillTag key={skill.id}>{localizedName(skill.names, locale)}</SkillTag>
          ))}
        </SkillTagList>
      )}
    </Link>
  );
}
