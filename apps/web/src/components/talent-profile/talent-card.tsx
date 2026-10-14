import { localizedName, type TalentCard as TalentCardData } from '@skillboard/shared';
import { getLocale, getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';

/** List item for /talents and, later, search results. Whole card is one link (thumb-friendly). */
export async function TalentCard({ talent }: { talent: TalentCardData }) {
  const tRef = await getTranslations('reference');
  const locale = await getLocale();

  return (
    <Link href={`/t/${talent.slug}`} className="block">
      <Card>
        <CardHeader>
          <CardTitle>{talent.headline}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {talent.displayName}
            {talent.cityCode && ` · ${tRef(`cities.${talent.cityCode}`)}`}
            {` · ${tRef(`workModes.${talent.workMode}`)}`}
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {talent.skills.map((skill) => (
            <Badge key={skill.id} variant="secondary">
              {localizedName(skill.names, locale)}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </Link>
  );
}
