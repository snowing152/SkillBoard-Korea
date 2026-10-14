# Roadmap

What to build in which order, and how each later item plugs into the architecture. Specs live in
`docs/specs/`; this page only orders them. One spec = one branch = one PR (`AGENTS.md`).

## MVP: remaining specs, in order

| #   | Spec                                       | Depends on                       | Model                  | Why this position                                               |
| --- | ------------------------------------------ | -------------------------------- | ---------------------- | --------------------------------------------------------------- |
| 0   | `talent-profiles` (done, reference)        | –                                | Fable                  | the pattern everything copies                                   |
| 1   | `legal`                                    | –                                | Sonnet + Haiku (ko/ru) | small; `accounts` records the consents it defines               |
| 2   | `accounts`                                 | legal                            | Sonnet, Opus review    | largest; unblocks verification gates, refresh, Google           |
| 3   | `search`                                   | – (legal for the disclaimer)     | Sonnet                 | independent of auth; run in parallel with `accounts`            |
| 4   | `contact-reveal`                           | accounts, search                 | Sonnet                 | the core client action; needs verified email and `?next=`       |
| 5   | `moderation`                               | accounts, search, contact-reveal | Sonnet                 | reuses the verified check; admin area                           |
| 6   | `account-deletion`                         | accounts (+ 4, 5 for its e2e)    | Sonnet                 | closes the PIPA loop and the e2e clean-up debt                  |
| 7   | Opus design pass (`docs/design/README.md`) | all pages exist                  | Opus                   | style once, after the last page lands, to avoid restyling twice |

Two agents can work at once on `accounts` and `search`. After 6, the MVP scope of `FABLE_BRIEF.md` is
complete except what the launch checklist below lists.

## Launch checklist (owner tasks, no code)

- Create the Google OAuth client, Resend domain, Supabase database in Seoul (ADR 0021), Render service and Vercel project
  (ADR 0013); fill the env variables from `.env.example` on each host; add the API Dockerfile
  (`docs/tech-debt.md`).
- Review the legal drafts with a lawyer; name a privacy officer; bump `LEGAL_VERSIONS` when texts change.
- Grant the first `ADMIN` role by SQL (ADR 0018). Decide the support email (`SUPPORT_EMAIL`).
- Add the repository secrets `API_URL` and `JOB_SECRET` so the daily purge workflow runs (ADR 0022); it
  also keeps Supabase and Render awake (ADR 0021).
- Get legal review of the 14-day deletion grace and the 1-year blocked-email retention (ADR 0022).
- Re-check free-tier limits and the Vercel Hobby non-commercial clause before any revenue.

## Post-MVP items and where they plug in

| Item                     | Plugs into                                                                                                                                                                                           | Prerequisite                                   | Decision record                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------- |
| Profile photo upload     | `StoragePort` in `apps/api/src/common/storage/` (R2 in prod, RustFS locally); `POST /v1/me/talent-profile/photo` sets the existing `photoUrl`; `next.config.ts` image host allow-list                | none                                           | ADR 0013 (owner decision on photos) |
| Notifications (email)    | `notifications` module on top of `MailPort` and the `templates.ts` from `accounts`; events: contact revealed, profile hidden, new report for admins                                                  | accounts                                       | –                                   |
| In-app chat              | `modules/chat/` with `Conversation`, `Participant`, `Message` tables keyed by `User.id`; Socket.IO gateway authenticated by the access JWT; "Start conversation" button next to the contact channels | always-on API host or managed realtime service | ADR 0015, 0013                      |
| Reviews and ratings      | `Review(profileId, authorUserId, rating, text)`; only authors with a `ContactReveal` on that profile may review; aggregates computed in the query, shown on `TalentCard`                             | contact-reveal                                 | ADR 0016                            |
| Mobile app (Expo)        | `apps/mobile` importing `packages/shared` and `packages/api-client`; same tokens from secure storage; `/v1/auth/refresh` on 401                                                                      | accounts (refresh tokens)                      | ADR 0002, 0006, 0020                |
| Monetization (undecided) | new tables only: `Subscription`, `Promotion`, `Payment`; limits computed from `ContactReveal`; "promoted first" in `SearchService.rankProfiles`; `Organization(ownerUserId)` if companies get a plan | product decision; Vercel Pro                   | ADR 0016                            |
| Better search            | `pg_trgm` or Postgres FTS for `q`; facets; saved searches (`SavedSearch`); all behind `SearchService`                                                                                                | ~50k profiles or user demand                   | –                                   |
| Trust and verification   | `UserRestriction` (bans), optional company verification as a badge table; automated auto-hide rule in `ReportsService`                                                                               | moderation data                                | ADR 0018                            |
| More login providers     | `AuthProvider` enum value + one Passport strategy each (Kakao, Apple); the Google flow is the template                                                                                               | accounts                                       | ADR 0009                            |
| Admin growth             | user list and search, admin-side deletion, data export (`GET /v1/me/export`)                                                                                                                         | moderation                                     | –                                   |

Rule of thumb: every row above adds a module or a table that references core ids; none edits `User`,
`TalentProfile` or `ContactReveal` columns. If an item seems to need that, write an ADR first.
