import type { CreateTalentProfile, MyTalentProfile } from '@skillboard/shared';

/** Pure mapping from the API's owner view to the form's values (what PATCH will send back). */
export function toFormValues(profile: MyTalentProfile): CreateTalentProfile {
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
  };
}
