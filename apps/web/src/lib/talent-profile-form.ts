import type { MyTalentProfile } from '@skillboard/shared';
import type { TalentProfileFormValues } from '@/components/talent-profile/talent-profile-form';

/** Pure mapping from the API's owner view to the form's values (what PATCH will send back). */
export function toFormValues(profile: MyTalentProfile): TalentProfileFormValues {
  return {
    headline: profile.headline,
    description: profile.description,
    cityCode: profile.cityCode,
    workMode: profile.workMode,
    visaType: profile.visaType,
    videoUrl: profile.videoUrl,
    skillIds: profile.skills.map((skill) => skill.id),
    languages: profile.languages.map(({ languageCode, level }) => ({ languageCode, level })),
    portfolioLinks: profile.portfolioLinks.map(({ url, label }) => ({ url, label })),
    contactMethods: profile.contactMethods.map(({ type, value }) => ({ type, value })),
    // Edits never re-ask (the Consent row from creation is the record), so the schema is satisfied.
    acknowledgeVisaDisclaimer: true,
  };
}
