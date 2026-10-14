# Reports and moderation: users report a profile, admins hide and unhide

Status: Ready · Model: Sonnet · ADRs: 0017, 0018 · Branch: `feat/moderation` · Order: 5 of 6 ·
Depends on `accounts` (verified email, `?next=`, `REASON_CODES`), `search` (`PUBLICLY_VISIBLE` in
`common/prisma/visibility.ts`) and `contact-reveal` (`assertEmailVerified`).

## Goal

Any signed-in, verified user can report a public profile with a reason. An admin works through an
inbox of open reports on a phone, opens the reported profile even when it is hidden, hides it with a
reason (which resolves its open reports), dismisses unfounded reports, and unhides later. The owner of
a hidden profile sees the reason. Done = the two seed reports can be handled end to end, hidden
profiles stay 404 for the public, and every admin action is an audit row.

## User stories

- As a client, I want to report a profile that asked me to pay up front so that others are protected.
- As a talent, I want to know why my profile was hidden so that I can fix it or object.
- As an admin, I want one list of open reports with the profile and the reporter's reason so that I can
  decide in a minute per case.
- As an admin, I want to hide a profile with a reason and later unhide it, with a history of who did
  what, so that moderation is accountable.
- As a visitor, I must never see a hidden profile or learn that an admin area exists.

## API contract

| Method and route                            | Auth            | Request schema           | Response schema                      | Errors                                                                                                                                                 |
| ------------------------------------------- | --------------- | ------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST /v1/talents/:slug/reports`            | user (verified) | `CreateReportSchema`     | `ReportSchema`                       | `FORBIDDEN` (`EMAIL_NOT_VERIFIED`, or own profile: `OWN_PROFILE`), `NOT_FOUND`, `CONFLICT` (open report exists), `RATE_LIMITED` (10 per 24 h per user) |
| `GET /v1/admin/reports`                     | ADMIN           | `AdminReportQuerySchema` | `paginatedSchema(AdminReportSchema)` | `UNAUTHENTICATED`, `FORBIDDEN`                                                                                                                         |
| `PATCH /v1/admin/reports/:id`               | ADMIN           | `ResolveReportSchema`    | `AdminReportSchema`                  | `NOT_FOUND`, `CONFLICT` (already closed)                                                                                                               |
| `GET /v1/admin/talent-profiles/:id`         | ADMIN           | –                        | `AdminTalentProfileSchema`           | `NOT_FOUND`                                                                                                                                            |
| `POST /v1/admin/talent-profiles/:id/hide`   | ADMIN           | `ModerationReasonSchema` | `AdminTalentProfileSchema`           | `NOT_FOUND`, `CONFLICT` (already hidden)                                                                                                               |
| `POST /v1/admin/talent-profiles/:id/unhide` | ADMIN           | `ModerationReasonSchema` | `AdminTalentProfileSchema`           | `NOT_FOUND`, `CONFLICT` (not hidden)                                                                                                                   |

Modules: `apps/api/src/modules/reports/` (user route) and `apps/api/src/modules/admin/` (all
`/v1/admin/...` routes, `@Roles('ADMIN')` on the controller; one `moderation.service.ts`). Schemas in
`packages/shared/src/moderation/`:

- `moderation.ts`: `REPORT_REASONS = ['SPAM', 'SCAM', 'INAPPROPRIATE', 'IMPERSONATION', 'OTHER']`,
  `REPORT_STATUSES = ['OPEN', 'RESOLVED', 'DISMISSED']`, `MODERATION_LIMITS = { reportsPerDay: 10,
detailsMax: 1000, reasonMin: 3, reasonMax: 500 }`.
- `CreateReportSchema { reason: z.enum(REPORT_REASONS), details: z.string().trim().max(1000).optional() }`;
  `details` is required (min 10) when `reason = 'OTHER'` (`superRefine`).
- `ReportSchema { id, status, createdAt }` (what the reporter gets back; nothing about the admin side).
- `AdminReportQuerySchema = PaginationQuerySchema.extend({ status: z.enum(REPORT_STATUSES).default('OPEN') })`.
- `UserRefSchema = z.object({ id: z.uuid(), displayName: z.string() })` (a person named in an admin view).
- `AdminReportProfileSchema = z.object({ id: z.uuid(), slug: z.string(), displayName: z.string(),
headline: z.string(), status: ProfileStatusSchema, hiddenAt: z.iso.datetime().nullable(),
openReportCount: z.number().int().min(0) })`. The UI derives the badge: `hiddenAt` set → "Hidden",
  else the status. There is no third `ProfileStatus` value.
- `AdminReportSchema = z.object({ id: z.uuid(), reason: z.enum(REPORT_REASONS), details:
z.string().nullable(), status: z.enum(REPORT_STATUSES), createdAt: z.iso.datetime(), resolvedAt:
z.iso.datetime().nullable(), reporter: UserRefSchema.nullable(), profile: AdminReportProfileSchema })`.
- `ResolveReportSchema = z.object({ status: z.enum(['RESOLVED', 'DISMISSED']) })`.
- `HIDE_REASON_CODES = ['SPAM', 'SCAM', 'INAPPROPRIATE', 'IMPERSONATION', 'VISA_OR_LEGAL',
'MISLEADING_INFO', 'DUPLICATE_ACCOUNT', 'OTHER'] as const` (`moderation.ts`); `HideProfileSchema = z.object({ reasonCode: z.enum(HIDE_REASON_CODES),
note: z.string().trim().max(200).optional() })`; `UnhideProfileSchema = z.object({ note:
z.string().trim().max(200).optional() })`. The route table's `ModerationReasonSchema` means these two.
- `ModerationActionSchema = z.object({ id: z.uuid(), action: z.enum(['HIDE', 'UNHIDE']), reason:
z.string(), createdAt: z.iso.datetime(), admin: UserRefSchema.nullable() })`.
- `MyTalentProfileSchema` gains `hiddenReasonCode: z.enum(HIDE_REASON_CODES).nullable()` and
  `hiddenNote: z.string().nullable()` so the owner can read why. Admins write the note knowing the owner
  reads it (say so in the admin UI hint). The owner never receives the reporter's identity, the report
  text or the number of reports: none of those fields exist in `MyTalentProfileSchema`, and the unit
  test on the owner mapper asserts it.
- `ModerationActionSchema` uses `reasonCode: z.enum(HIDE_REASON_CODES).nullable()` and
  `note: z.string().nullable()` instead of `reason` (UNHIDE actions have no code).
- `AdminTalentProfileSchema = MyTalentProfileSchema.extend({ user: UserRefSchema.extend({ emailVerified:
z.boolean(), createdAt: z.iso.datetime() }), reports: z.array(AdminReportSchema.omit({ profile: true })),
moderationActions: z.array(ModerationActionSchema) })`. Contact methods are included (admins see
  everything, `docs/domain.md`); the user's email is not (data minimisation).

Service rules:

- Report: profile must be `PUBLICLY_VISIBLE` (hidden ones are already handled); reporter verified
  (`assertEmailVerified`); reporter is not the owner; no `OPEN` report by this reporter on this profile;
  fewer than 10 reports by this reporter in the last 24 h. Then insert.
- Hide (transaction): set `hiddenAt = now()`, `hiddenReasonCode`, `hiddenNote`; insert
  `ModerationAction HIDE` with the same code and note; update every `OPEN` report of the profile to
  `RESOLVED` with `resolvedById`, `resolvedAt`. Unhide: clear the three columns, insert `UNHIDE` with the
  note; reports untouched. Resolve or dismiss: single report, must be
  `OPEN`.
- `openReportCount` is a `_count` on the profile's open reports (no stored counter).
- Logging: ids, action and status only. `details` and `reason` are user text and never logged.

## Data changes

Migration `hide_reason_codes`: `TalentProfile.hiddenReason` → `hiddenReasonCode String?` (validated
against `HIDE_REASON_CODES`, same pattern as `visaType`) plus `hiddenNote String?`;
`ModerationAction.reason` → `reasonCode String?` plus `note String?`. The seed's hidden talent gets
`SCAM` and the note "Seed: hidden after a scam report". Seed, so every tab has data: report 1
stays `OPEN` on published profile 3 (SPAM); report 2 on the hidden profile 20 (SCAM) becomes `RESOLVED`
by the admin at the time of the seed `HIDE` action; new report 3 `OPEN` on published profile 7
(INAPPROPRIATE); new report 4 `DISMISSED` on published profile 5 (OTHER, resolved by the admin).
Deletion: reporter deleted → `reporterUserId` null, report stays; admin deleted → `adminUserId` null;
reported talent deleted → reports and actions cascade with the profile (ADR 0018).

## UI

Namespaces `report` and `admin` (new). Actions in `src/actions/reports.ts` and `src/actions/admin.ts`.

| Route                         | Kind                                                             | States                                                                                                                                                                                                                                 |
| ----------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/t/[slug]`                   | existing; adds a quiet "Report this profile" link under the card | signed-out → `/sign-in?next=/t/<slug>/report`                                                                                                                                                                                          |
| `/t/[slug]/report`            | Server page (session required) + Client form                     | reason radios, details textarea (counter `{n}/1000`), submitting, success ("Thank you, we will review it" + back link), `CONFLICT` → "You already reported this profile", `FORBIDDEN/EMAIL_NOT_VERIFIED` → verify text, `RATE_LIMITED` |
| `/admin`                      | `app/[locale]/admin/layout.tsx` + redirect to `/admin/reports`   | layout calls `GET /v1/me`; not signed in → sign-in redirect; signed in without `ADMIN` → `notFound()` (the area does not exist for them)                                                                                               |
| `/admin/reports`              | Server page, `?status=` tabs OPEN / RESOLVED / DISMISSED, cursor | loading, empty per tab ("Inbox zero"), list of report cards                                                                                                                                                                            |
| `/admin/talent-profiles/[id]` | Server page                                                      | full profile incl. contact methods, status badges, open reports, history list, actions: Hide (dialog with reason textarea) or Unhide (dialog with reason)                                                                              |
| `/me/talent-profile`          | existing hidden banner                                           | shows the localized reason (`profile.my.hiddenReason.<CODE>`), the admin note when present, and "To appeal, write to {email}" with `SUPPORT_EMAIL` (`profile.my.hiddenAppeal`). Nothing about reports or reporters                     |

- Report card (`components/admin/report-card.tsx`): profile display name + headline (link to the admin
  profile page), reason badge, details (clamped to 4 lines, expandable), reporter name or "deleted
  user", relative time, `openReportCount` badge, and two 44 px buttons: "Dismiss" and "Resolve"
  (Server Actions, `revalidatePath('/admin/reports')`). Hide happens on the profile page so the admin
  reads the profile first.
- Phone first: cards in one column, action buttons full width in a row of two; the status tabs scroll
  horizontally. Desktop: max 48 rem, same cards.
- Keys (`report`): `link`, `title` (`{name}`), `reason.label`, `reason.SPAM`, `reason.SCAM`,
  `reason.INAPPROPRIATE`, `reason.IMPERSONATION`, `reason.OTHER`, `details.label`, `details.hint`,
  `details.requiredForOther`, `submit`, `success.title`, `success.body`, `back`, `alreadyReported`,
  `verifyFirst`, `rateLimited`. (`admin`): `title`, `nav.reports`, `tabs.OPEN`, `tabs.RESOLVED`,
  `tabs.DISMISSED`, `empty.OPEN`, `empty.closed`, `card.reportedBy` (`{name}`), `card.deletedUser`,
  `card.openReports` (plural), `card.dismiss`, `card.resolve`, `profile.hide`, `profile.unhide`,
  `profile.reasonLabel`, `profile.reasonHint` ("The owner will read this"), `profile.hiddenSince`,
  `profile.history`, `profile.contacts`, `profile.badge.DRAFT`, `profile.badge.PUBLISHED`,
  `profile.badge.HIDDEN` (derived from `hiddenAt`), `action.HIDE`, `action.UNHIDE`, `loadMore`. (`profile`):
  `my.hiddenReason.SPAM`, `my.hiddenReason.SCAM`, `my.hiddenReason.INAPPROPRIATE`,
  `my.hiddenReason.IMPERSONATION`, `my.hiddenReason.VISA_OR_LEGAL`, `my.hiddenReason.MISLEADING_INFO`,
  `my.hiddenReason.DUPLICATE_ACCOUNT`, `my.hiddenReason.OTHER`,
  `my.hiddenNote`, `my.hiddenAppeal` (`{email}`). (`admin`) also: `reasonCode.<CODE>` for the eight codes,
  `profile.noteLabel`, `profile.noteHint` ("Optional, max 200 characters, the owner will read it").
- Labels of the two new hide reasons (`admin.reasonCode.<CODE>` is the short admin label,
  `profile.my.hiddenReason.<CODE>` the sentence the owner reads; the other six follow the same pattern):

  | Code                | en                                                 | ko                                | ru                                                     |
  | ------------------- | -------------------------------------------------- | --------------------------------- | ------------------------------------------------------ |
  | `MISLEADING_INFO`   | Misleading information (skills or qualifications)  | 허위 정보 (기술 또는 자격)        | Недостоверная информация (навыки или квалификация)     |
  | `DUPLICATE_ACCOUNT` | Duplicate account (several profiles of one person) | 중복 계정 (한 사람의 여러 프로필) | Дубликат аккаунта (несколько профилей одного человека) |

  `OTHER` stays last in `HIDE_REASON_CODES` and in the radio group.

- shadcn: radio-group, textarea, dialog, badge, tabs (add and pin what is missing).

## Acceptance criteria

1. Given the seeded verified client on a published profile, when they submit a SCAM report with details,
   then 201, the report is `OPEN`, and the success state shows; a second report on the same profile
   answers 409 and the page shows "already reported". [e2e]
2. Given reason `OTHER` and empty details, then the form shows the field error and no request is sent
   (same `superRefine` on the API: 400).
3. Given the profile owner, when they report their own profile, then 403 with `details[0].code =
'OWN_PROFILE'`.
4. Given an unverified user, then 403 `EMAIL_NOT_VERIFIED`; given a hidden or draft profile, 404.
5. Given a user with 10 reports in 24 h, then the 11th answers 429.
6. Given a signed-in non-admin, when they open `/admin/reports` or call any `/v1/admin/*` route, then the
   page is 404 and the API answers 403 `FORBIDDEN`; signed-out gets 401 from the API and the sign-in
   redirect from the page.
7. Given the seeded admin, when they open `/admin/reports`, then the open seed reports are listed with
   profile, reason and reporter; the RESOLVED tab shows the resolved ones. [e2e]
8. Given the admin hides a profile with code `SCAM` and note "Asked for payment up front", then `hiddenAt` is set, a
   `HIDE` action with that reason and the admin id exists, every open report of that profile is
   `RESOLVED` with `resolvedById`, `/t/<slug>` answers 404, and the owner's `/me/talent-profile` shows the
   banner with that reason. [e2e]
9. Given a hidden profile, when the admin unhides it with a note, then `hiddenAt`, `hiddenReasonCode`
   and `hiddenNote` are null, an `UNHIDE` action exists, and the public page renders again.
10. Given `PATCH /v1/admin/reports/:id` on a `RESOLVED` report, then 409.
11. Given a reporter who deleted their account, then the report still appears with "deleted user"
    (seed one such row by deleting a throwaway user in the e2e, or unit-test the mapper with
    `reporter: null`).
12. All admin pages work at 390 px (admins moderate from phones) in en, ko and ru.
13. Logs for reporting and hiding contain ids and the action, never the free text (service unit tests spy
    on `Logger.prototype` and assert no argument contains the `details` or `reason` strings).

Tests: `packages/shared/src/moderation/*.test.ts`, `apps/api/src/modules/reports/reports.service.spec.ts`,
`apps/api/src/modules/admin/moderation.service.spec.ts`, `apps/api/test/moderation.e2e-spec.ts`
(401, 403 as client, 200 as admin), `apps/web/e2e/moderation.spec.ts`.

## Out of scope

- Email to the owner when hidden or unhidden: `MailPort` + templates, in the `notifications` module.
- Appeals, warnings, user bans (account-level): `UserRestriction(userId, type, until, reason)` table
  checked by `JwtAuthGuard`.
- Automated scoring (many reports → auto-hide): a rule in `ReportsService.create` reading
  `openReportCount`.
- Admin user list and search, admin-side account deletion: post-MVP admin module growth.
- Reporting a client (clients have no public page): comes with chat.

## Open questions

None.
