# Search: find talent by skill, language, city, work mode and visa type

Status: Ready · Model: Sonnet · ADRs: 0014, 0016, 0017, 0018 · Branch: `feat/search` · Order: 3 of 6
(independent of `accounts`; can run in parallel with it).

## Goal

A visitor, company or private person, with or without an account, opens `/talents`, narrows the list by
skill category or skill, spoken language, city, remote or on-site and visa type, optionally types a word,
and pages through results on a phone. Done = `GET /v1/talents` accepts the filters, every filter is a URL
parameter so results are shareable and indexable, the ordering lives in one function (`rankProfiles`,
ADR 0016), and the home page links into the most useful searches ("Russian tutor in Seoul").

## User stories

- As a parent in Seoul, I want to filter by skill "Russian tutor", language "Russian" and city "Seoul" so
  that I only see relevant people.
- As a startup, I want remote SMM freelancers who speak Korean so that location does not matter.
- As a client, I want to filter by visa type so that I can see who may already be allowed to do the work
  (with the disclaimer that the site verifies nothing).
- As a visitor, I want the filters I set to be in the URL so that I can share or bookmark the search.
- As a talent, I want new profiles to appear in search right after publishing so that I get contacted.

## API contract

| Method and route  | Auth   | Request schema            | Response schema                     | Errors              |
| ----------------- | ------ | ------------------------- | ----------------------------------- | ------------------- |
| `GET /v1/talents` | public | `TalentSearchQuerySchema` | `paginatedSchema(TalentCardSchema)` | `VALIDATION_FAILED` |

The route moves from `talent-profiles.controller.ts` to a new module `apps/api/src/modules/search/`
(`SearchController` with `@Controller('talents')` and only this handler; `talent-profiles` keeps
`GET /v1/talents/:slug` and `/v1/me/...`). `TalentProfilesService.listPublic` and its tests move to
`SearchService.searchTalents`. Nest routes `/talents` and `/talents/:slug` from two controllers without
conflict.

Schemas in `packages/shared/src/search/`:

- `csv-param.ts`: `csvParam(schema, max)` = `z.string().max(200).optional().meta({ description:
'Comma-separated, at most <max>', example: 'ru,en' }).transform(...)` → `z.array(schema).max(max)` with
  unique, trimmed values; empty string → `undefined`; a bad value fails with the item's issue. In the
  OpenAPI document and the api-client the parameter is therefore a **string**; the service receives the
  parsed array. The web never builds arrays: `buildSearchHref` joins with commas. Unit-tested; reused by
  every list filter later.
- `search.schema.ts`: `TalentSearchQuerySchema = PaginationQuerySchema.extend({
category?: SlugSchema, skills?: csvParam(SlugSchema, 5), languages?: csvParam(LanguageCodeSchema, 3),
cities?: csvParam(CityCodeSchema, 3), workMode?: z.enum(['REMOTE', 'ON_SITE']),
visaTypes?: csvParam(VisaTypeSchema, 3), q?: z.string().trim().min(2).max(60) })` where `SlugSchema =
z.string().regex(/^[a-z0-9-]{2,60}$/)`. `SEARCH_FILTER_ORDER = ['category', 'skills', 'languages',
'cities', 'workMode', 'visaTypes']` fixes the order of filters in the UI (launch niche first).

`SearchService` rules (the only code that builds the `where`):

- Always the visibility predicate of `docs/domain.md`: move the private `PUBLICLY_VISIBLE` constant from
  `talent-profiles.service.ts` to `common/prisma/visibility.ts`, extend it to
  `{ status: 'PUBLISHED', hiddenAt: null, user: { emailVerifiedAt: { not: null }, deletionRequestedAt:
null } }` and export it; `talent-profiles`, `search` and the later `contact-reveal` and `moderation`
  modules import it. (`deletionRequestedAt` arrives with `account-deletion`; until then the predicate
  has the first three parts.) The join to `User` is cheap at MVP size; the composite index still covers
  the profile columns.
- `category` → `skills: { some: { skill: { category: { slug } } } }`; `skills` → `some` with
  `skill.slug in`; both given → both apply (AND). `languages` → `languages: { some: { languageCode: { in } } }`.
  `cities` → `cityCode in`. `workMode=REMOTE` → `workMode in (REMOTE, HYBRID)`; `ON_SITE` →
  `in (ON_SITE, HYBRID)` (a hybrid talent satisfies either wish). `visaTypes` → `visaType in`.
  `q` → `OR [headline contains q (insensitive), user.displayName contains q (insensitive)]`.
  Unknown skill or category slugs simply match nothing (no 404: the URL is user-typed).
- `rankProfiles(query)` returns `{ orderBy, cursorWhere }`: today `orderBy: { id: 'desc' }` with the id
  cursor from `common/pagination/cursor.ts`. Promoted-first or relevance later changes only this
  function (ADR 0016); the cursor would then encode the sort key, so nothing outside may assume "id".
- `limit + 1` rows, `nextCursor` as in the reference. Response mapping: extract the private `toCard`
  function and its `select` from `talent-profiles.service.ts` into
  `modules/talent-profiles/talent-card.mapper.ts` (`export function toTalentCard`, `cardSelect`) and
  import it from `search` (no copy).

## Data changes

None structural; the indexes on `(status, hiddenAt, publishedAt)`, `cityCode`, `workMode`, `visaType`,
`TalentSkill.skillId` and `TalentLanguage.languageCode` exist. `q` uses `ILIKE` without a trigram index:
fine for the MVP size (row in `docs/tech-debt.md`: add `pg_trgm` or full-text when the table passes
~50k rows). Seed: unchanged; it already spreads cities, languages, visa types and work modes so every
filter returns something, and the hidden seed talent must never appear.

## UI

Namespace `search` (new); code labels come from the existing `reference` namespace (`cities`,
`visaTypes`, `workModes` keyed by code; nothing to add). `/talents` replaces the Phase D list page.

| Route      | Kind                                                                                      | States                                                                                                                                       |
| ---------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `/talents` | Server page reads `searchParams`, parses with the shared schema, fetches skills + results | loading (`loading.tsx`), results, empty ("No one matches yet" + "Clear filters"), invalid params → treated as no filter, error → `error.tsx` |
| `/`        | home gets a search entry                                                                  | search input (`q`) + category chips linking to `/talents?category=<slug>`                                                                    |

- `components/search/search-filters.tsx` (Client): a `<form method="get" action="/talents">` whose
  controls are named exactly like the query params, so a plain submit builds the URL and no JS is
  required to search. Phone: a "Filters (n)" button opens a shadcn `sheet` from the bottom with the
  filter groups in `SEARCH_FILTER_ORDER`; "Show results" submits. Desktop (`md:`): the same form as a
  left sidebar, always visible, auto-submits on change. Category: select; skills: checkboxes of the
  chosen category (all skills when none); languages, cities, visa types: checkbox groups with the
  labels from `reference`; work mode: three radios (any / remote / on-site). The visa group shows the
  `VisaDisclaimer` component (`legal` spec).
- `components/search/active-filters.tsx`: chips for each active filter with a remove link that
  rebuilds the URL without that value; a "Clear all" link to `/talents`.
- `lib/search-params.ts` (pure, unit-tested): `parseSearchParams(URLSearchParams) → TalentSearchQuery`
  (invalid values dropped, not thrown), `buildSearchHref(query, patch)` for chips and the "Load more"
  link (`?cursor=` keeps every filter).
- Results reuse `TalentCard`; the list reads newest first; "Load more" is a link (as in Phase D).
- Metadata: title "Talent in Seoul · Russian tutor" built from active filters for SEO; pages with a
  `cursor` get `robots: noindex`.
- Keys (`search`): `title`, `filters`, `filtersWithCount` (ICU plural `{count}`), `showResults`,
  `clearAll`, `remove` (aria label `{filter}`), `query.placeholder`, `group.category`, `group.skills`,
  `group.languages`, `group.cities`, `group.workMode`, `group.visaTypes`, `workMode.any`,
  `workMode.remote`, `workMode.onSite`, `empty.title`, `empty.body`, `loadMore`, `resultsFor`
  (`{query}`), `home.title`, `home.placeholder`, `home.submit`, `home.popular`.
- shadcn: sheet (add with `pnpm dlx shadcn@4.21.4 add sheet -y`, pin versions), checkbox, radio-group
  (add), native-select, button, badge.

## Acceptance criteria

1. Given `GET /v1/talents?skills=russian-tutor&cities=SEOUL&languages=ru`, then every item has that skill,
   city and language, only `PUBLISHED` and not hidden profiles appear, newest first, `nextCursor` after
   `limit` items (service unit test on the generated `where`; e2e against the seed).
2. Given `workMode=REMOTE`, then `REMOTE` and `HYBRID` profiles are returned and `ON_SITE` ones are not;
   symmetrically for `ON_SITE`.
3. Given `skills=a,b,c,d,e,f` (6 values) or `q=x` (1 char), then 400 `VALIDATION_FAILED` with the path in
   `details`; given `skills=unknown-slug`, then 200 with an empty list.
4. Given `q=tutor`, then profiles whose headline or display name contains "tutor" in any case are
   returned.
5. Given the hidden seed talent, then no filter combination returns it (e2e).
6. Given the phone layout, when a visitor taps "Filters", picks "Russian tutor" and "Seoul" and taps
   "Show results", then the URL contains `skills=russian-tutor&cities=SEOUL`, the chips show both, and
   removing the Seoul chip reloads without `cities`. [e2e]
7. Given JavaScript disabled, when the filter form is submitted, then the same URL and results appear
   (the form is a plain GET form; Playwright `javaScriptEnabled: false` in the e2e). Without JS the
   skills group lists all skills grouped by category, since it cannot react to the category select.
8. Given a URL with `cursor` from `nextCursor` and the same filters, then the next page continues the
   list without repeats and the page is `noindex`.
9. Given the home page, when a visitor taps the "Tutoring" chip, then `/talents?category=tutoring` opens
   with the category select preset.
10. All strings exist in en, ko and ru; the filter sheet and chips fit 390 px with no horizontal scroll;
    Korean and Russian labels wrap onto two lines without truncation.
11. Logs contain the query shape at most as parameter names, never `q` values (they may be personal
    names).

Tests: `packages/shared/src/search/*.test.ts`, `apps/api/src/modules/search/search.service.spec.ts`,
`apps/api/test/search.e2e-spec.ts`, `apps/web/src/lib/search-params.test.ts`,
`apps/web/e2e/search.spec.ts`.

## Out of scope

- Relevance ranking, promoted profiles, "online recently": `rankProfiles` (ADR 0016).
- Saved searches and alerts: a `SavedSearch(userId, query Json)` table and an email job.
- Full-text search in Korean and Russian: `pg_trgm` or Postgres FTS, or an external index, behind
  `SearchService`.
- Map or district-level location: `cityCode` stays region-level in MVP.
- Counting results per filter value (facets): expensive without a search index.

## Open questions

None.
