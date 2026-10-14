# Contact reveal: show a talent's contact channels after an explicit, logged click

Status: Ready · Model: Sonnet · ADRs: 0015, 0016, 0017, 0018 · Branch: `feat/contact-reveal` ·
Order: 4 of 6 · Depends on `accounts` (`emailVerified`, `?next=` on sign-in, `REASON_CODES`) and
`search` (`PUBLICLY_VISIBLE` in `common/prisma/visibility.ts`).

## Goal

A signed-in, email-verified client, company or private person, taps "Contact" on a public profile and
sees the channels the talent chose to share (email, Telegram, KakaoTalk ID). Each reveal is logged in
`ContactReveal`, which is the audit trail PIPA wants and the only table a future pay-per-contact model
needs (ADR 0016). Done = contact values never leave the API except through this endpoint, the talent sees
how many people revealed their contacts, and abuse is capped.

## User stories

- As a parent who found a Russian tutor, I want to tap "Contact" and get a tappable Telegram link or
  email so that I can write immediately.
- As a talent, I want my contact details hidden until someone signed-in asks for them, and I want to see
  how many people did, so that I control exposure and see interest.
- As a visitor without an account, I want "Contact" to take me to sign-in and bring me back to the same
  profile so that I do not lose the person I found.
- As the site, I want one user to be unable to harvest hundreds of contacts per hour.

## API contract

| Method and route                         | Auth            | Request schema | Response schema       | Errors                                                                                                                      |
| ---------------------------------------- | --------------- | -------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `POST /v1/talents/:slug/contact-reveals` | user (verified) | –              | `ContactRevealSchema` | `UNAUTHENTICATED`; `FORBIDDEN` + `details[0].code = EMAIL_NOT_VERIFIED`; `NOT_FOUND` (not publicly visible); `RATE_LIMITED` |

Module `apps/api/src/modules/contact-reveals/` (controller + service; owns `ContactReveal`).
Schemas in `packages/shared/src/contact-reveals/contact-reveal.schema.ts`:

- `ContactRevealSchema { profileId: uuid, contactMethods: z.array(ContactMethodSchema).max(3),
revealedAt: z.iso.datetime(), reusedExisting: z.boolean() }`.
- `CONTACT_REVEAL_LIMITS = { perHour: 30, dedupeHours: 24 }` (ADR 0018 names the 30/hour).
- `TalentProfileSchema` (public) gains `hasContactMethods: z.boolean()` so the web knows whether to
  render the button. `MyTalentProfileSchema` gains `contactRevealCount: z.number().int().min(0)`.

Service rules (`ContactRevealsService.reveal(slug, viewer)`), in one transaction:

1. Load the profile by slug with `PUBLICLY_VISIBLE` (`common/prisma/visibility.ts`, from `search`),
   selecting `id, userId, contactMethods`. Missing, draft, hidden, owner unverified or owner pending
   deletion → `NOT_FOUND` for everyone, the owner included (the owner reads their own methods on
   `/me/talent-profile`).
2. Owner of that visible profile → return the methods with `reusedExisting: true`; no `ContactReveal`
   row, no limit check.
3. Viewer's `emailVerifiedAt` null (one `user.findUnique` on `@CurrentUser().id`) → `FORBIDDEN` with
   reason `EMAIL_NOT_VERIFIED`. The check lives in `common/auth/require-verified.ts`
   (`assertEmailVerified(prisma, userId)`) because `moderation` reuses it.
4. Profile has zero methods → return `contactMethods: []`, no `ContactReveal` row (nothing was
   revealed), no limit check.
5. An existing row for `(viewerUserId, profileId)` newer than `dedupeHours` → return the methods with
   `reusedExisting: true` and that row's `createdAt`; no new row, does not count toward the limit.
6. `count` of the viewer's rows in the last hour ≥ `perHour` → `RATE_LIMITED`. This is a per-user DB
   count (the IP throttler is wrong behind shared NAT, and the rows are the audit anyway); the route
   keeps the default IP throttler and gets no `@Throttle`. Two parallel requests may both pass the
   count and insert, so the cap is "about 30", which is accepted.
7. Insert the row and return the methods.

Logging: `profileId`, `viewerUserId`, `reusedExisting`. Never the contact values.

## Data changes

None structural (`ContactReveal` and its indexes exist). Seed: 6 reveals by `client@skillboard.local`
on published talents with mixed `createdAt` (some older than 24 h) so dedupe and counts are testable.
Deletion: viewer deletes account → `viewerUserId` becomes null, row stays; talent deletes account →
rows cascade with the profile (ADR 0018).

## UI

Namespace `contact` (new). Server Action `src/actions/contact-reveal.ts` → `revealContacts(slug)`
returning `ActionResult<ContactReveal>`.

| Route                | Kind                                                                    | States                                                                                                                                                                                                                                                                                                   |
| -------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/t/[slug]`          | existing Server page + `components/contact/contact-button.tsx` (Client) | hidden when `hasContactMethods` is false; signed-out → link to `/sign-in?next=/t/<slug>`; signed-in → button opens a `dialog` (phone: full-width bottom sheet style) with states: loading, revealed, `FORBIDDEN/EMAIL_NOT_VERIFIED` (text + link to `/me/account`), `RATE_LIMITED`, `NOT_FOUND`, generic |
| `/me/talent-profile` | existing page                                                           | shows `contactRevealCount` ("{count} people revealed your contacts", ICU plural, hidden when 0)                                                                                                                                                                                                          |

- The page knows whether a session exists through `getAccessToken()` (not whether it is valid; a stale
  cookie just yields `UNAUTHENTICATED` in the dialog, which links to sign-in).
- Revealed list, one row per method with a 44 px action: `EMAIL` → `mailto:` link and copy button;
  `TELEGRAM` → `https://t.me/<handle without @>` link (handle shown as typed) and copy; `KAKAO` → the
  id as text with a copy button (`navigator.clipboard`, falls back to a selectable field). The dialog
  ends with a safety line (`contact.safety`: "Never pay in advance. Report anything suspicious.") and a
  "Report" link (`moderation` spec).
- Keys: `button`, `signInToContact`, `dialog.title` (`{name}`), `dialog.loading`, `copy`, `copied`,
  `open` (aria), `type.EMAIL`, `type.TELEGRAM`, `type.KAKAO`, `verifyFirst`, `goToAccount`,
  `rateLimited`, `safety`, `report`, `revealCount` (plural).
- shadcn: dialog (add and pin), button, badge.

## Acceptance criteria

1. Given a signed-out visitor on `/t/<slug>`, when they tap "Contact", then they land on `/sign-in` and,
   after signing in as the seeded verified client, return to the same profile. [e2e]
2. Given the seeded verified client on a published profile with methods, when they tap "Contact", then the
   dialog lists each method with a working link or copy button, and one `ContactReveal` row exists. [e2e]
3. Given the same client taps again within 24 h, then the same data returns with `reusedExisting: true`
   and no second row (service unit test with a frozen clock).
4. Given a verified client with 30 fresh reveals in the last hour, when they reveal a 31st distinct
   profile, then 429 `RATE_LIMITED`; a repeat of an already revealed profile still succeeds.
5. Given an unverified account, then 403 with `details[0].code = 'EMAIL_NOT_VERIFIED'` and the dialog
   shows the verify text with a link to `/me/account`.
6. Given a draft or hidden profile, then 404 for every viewer, the owner included.
7. Given a published profile with no contact methods, then the public page shows no "Contact" button and
   the endpoint returns an empty list without logging.
8. Given `GET /v1/talents/:slug` and `GET /v1/talents`, then the responses never contain contact values
   (schema test on `TalentProfileSchema`), only `hasContactMethods`.
9. Given a talent with 3 reveals, when they open `/me/talent-profile`, then the count line reads "3 people
   revealed your contacts" in the current locale.
10. The dialog fits 390 px with every action reachable by thumb; all strings in en, ko and ru.
11. Logs for a reveal contain ids only, never a contact value or email (service unit test spies on
    `Logger.prototype` and asserts no argument contains a seeded contact value).

Tests: `packages/shared/src/contact-reveals/*.test.ts`,
`apps/api/src/modules/contact-reveals/contact-reveals.service.spec.ts`,
`apps/api/test/contact-reveals.e2e-spec.ts` (401 without token; 201 as seeded client),
`apps/web/src/components/contact/contact-button.test.tsx`, `apps/web/e2e/contact-reveal.spec.ts`.

## Out of scope

- "Contacts I revealed" history page: `GET /v1/me/contact-reveals` over the same table; dedupe already
  makes a repeat click free, so MVP skips the page.
- Notifying the talent of each reveal (email or push): `MailPort` + a `notifications` module.
- Pay-per-contact, monthly quotas, promoted contacts: computed from `ContactReveal` by a `billing`
  module (ADR 0016); the limit constant moves to a plan table then.
- In-app chat: "Contact" would gain "Start a conversation" next to the channels (ADR 0015).
- Blocking a specific client: a `Block(talentUserId, clientUserId)` table checked in step 1.

## Open questions

None.
