import { z } from 'zod';
import { HttpUrlSchema } from '../api/http-url.js';
import { PaginationQuerySchema, paginatedSchema } from '../api/pagination.js';
import { SkillRefSchema } from '../skills/skill.schema.js';
import {
  CITY_CODES,
  CONTACT_TYPES,
  LANGUAGE_CODES,
  LANGUAGE_LEVELS,
  PROFILE_STATUSES,
  TALENT_PROFILE_LIMITS as L,
  VISA_TYPES,
  WORK_MODES,
} from './talent-profiles.js';

// Enum schemas are built from the constant arrays so the list and the validation cannot drift.
export const CityCodeSchema = z.enum(CITY_CODES);
export const VisaTypeSchema = z.enum(VISA_TYPES);
export const WorkModeSchema = z.enum(WORK_MODES);
export const LanguageLevelSchema = z.enum(LANGUAGE_LEVELS);
export const ProfileStatusSchema = z.enum(PROFILE_STATUSES);
export const ContactTypeSchema = z.enum(CONTACT_TYPES);
export const LanguageCodeSchema = z.enum(LANGUAGE_CODES);

// Refines carry no message on purpose: the issue is `custom`, which the web form maps to its own
// translated text, while Zod's locale packs translate every built-in message (min, max, format).
const unique = <T>(items: T[], key: (item: T) => unknown) =>
  new Set(items.map(key)).size === items.length;

export const TalentLanguageSchema = z.object({
  languageCode: LanguageCodeSchema,
  level: LanguageLevelSchema,
});
export type TalentLanguage = z.infer<typeof TalentLanguageSchema>;

export const PortfolioLinkInputSchema = z.object({
  url: HttpUrlSchema,
  label: z.string().trim().max(L.portfolioLabelMax).nullable(),
});
export type PortfolioLinkInput = z.infer<typeof PortfolioLinkInputSchema>;

export const ContactMethodInputSchema = z.object({
  type: ContactTypeSchema,
  value: z.string().trim().min(1).max(L.contactValueMax),
});
export type ContactMethodInput = z.infer<typeof ContactMethodInputSchema>;

/**
 * Input for POST /v1/me/talent-profile. No `.default()` on purpose: the form and mobile send every
 * field, and defaults would make `z.input` and `z.output` differ, which complicates react-hook-form.
 * Arrays replace the stored list as a whole (simplest rule for forms).
 */
export const CreateTalentProfileSchema = z.object({
  headline: z
    .string()
    .trim()
    .min(L.headlineMin)
    .max(L.headlineMax)
    .meta({ description: 'One line shown in search results' }),
  description: z.string().trim().min(L.descriptionMin).max(L.descriptionMax),
  cityCode: CityCodeSchema.nullable(),
  workMode: WorkModeSchema,
  visaType: VisaTypeSchema.nullable().meta({ description: 'Self-declared, not verified' }),
  videoUrl: HttpUrlSchema.nullable().meta({ description: 'External link only (YouTube etc.)' }),
  skillIds: z
    .array(z.uuid())
    .min(1)
    .max(L.skillsMax)
    .refine((ids) => unique(ids, (id) => id)),
  languages: z
    .array(TalentLanguageSchema)
    .min(1)
    .max(L.languagesMax)
    .refine((items) => unique(items, (l) => l.languageCode)),
  portfolioLinks: z.array(PortfolioLinkInputSchema).max(L.portfolioLinksMax),
  contactMethods: z
    .array(ContactMethodInputSchema)
    .max(L.contactMethodsMax)
    .refine((items) => unique(items, (c) => c.type)),
  acknowledgeVisaDisclaimer: z.literal(true).meta({
    description: 'Must be true: the user is responsible for working within their visa (legal spec)',
  }),
});
export type CreateTalentProfile = z.infer<typeof CreateTalentProfileSchema>;

/**
 * PATCH /v1/me/talent-profile: any subset of the create fields, plus publishing. The disclaimer flag
 * is create-only: edits never re-ask, and the Consent row is the record.
 */
export const UpdateTalentProfileSchema = CreateTalentProfileSchema.omit({
  acknowledgeVisaDisclaimer: true,
})
  .partial()
  .extend({
    status: ProfileStatusSchema.optional(),
  });
export type UpdateTalentProfile = z.infer<typeof UpdateTalentProfileSchema>;

export const PortfolioLinkSchema = PortfolioLinkInputSchema.extend({ id: z.uuid() });
export type PortfolioLink = z.infer<typeof PortfolioLinkSchema>;

export const ContactMethodSchema = ContactMethodInputSchema.extend({ id: z.uuid() });
export type ContactMethod = z.infer<typeof ContactMethodSchema>;

/** List item for GET /v1/talents and, later, search. Small on purpose (mobile lists). */
export const TalentCardSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  displayName: z.string(),
  headline: z.string(),
  photoUrl: HttpUrlSchema.nullable(),
  cityCode: CityCodeSchema.nullable(),
  workMode: WorkModeSchema,
  visaType: VisaTypeSchema.nullable(),
  skills: z.array(SkillRefSchema),
  languages: z.array(TalentLanguageSchema),
});
export type TalentCard = z.infer<typeof TalentCardSchema>;

/** Public profile (GET /v1/talents/:slug). Never contains contact methods or moderation fields. */
export const TalentProfileSchema = TalentCardSchema.extend({
  description: z.string(),
  videoUrl: HttpUrlSchema.nullable(),
  publishedAt: z.iso.datetime().nullable(),
  portfolioLinks: z.array(PortfolioLinkSchema),
});
export type TalentProfile = z.infer<typeof TalentProfileSchema>;

/** The owner's view (GET /v1/me/talent-profile): everything, including what the public never sees. */
export const MyTalentProfileSchema = TalentProfileSchema.extend({
  status: ProfileStatusSchema,
  hiddenAt: z.iso.datetime().nullable().meta({ description: 'Set by an admin; non-null = hidden' }),
  contactMethods: z.array(ContactMethodSchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type MyTalentProfile = z.infer<typeof MyTalentProfileSchema>;

/** GET /v1/talents query. The search spec extends this with filters; pagination stays as is. */
export const TalentProfileQuerySchema = PaginationQuerySchema;
export type TalentProfileQuery = z.infer<typeof TalentProfileQuerySchema>;

export const TalentCardListSchema = paginatedSchema(TalentCardSchema);
export type TalentCardList = z.infer<typeof TalentCardListSchema>;
