# apps/web rules (Next.js 16 App Router, next-intl 4, Tailwind 4, shadcn/ui)

Read `AGENTS.md` first. These rules apply only inside the web app.

## Layout

- `src/app/[locale]/(main)/…` pages: the route group adds the app shell (header, footer, phone bottom
  nav). Only full-screen pages with their own header (`/t/[slug]`) live outside it. Public pages (home,
  search, `/t/[slug]`) are Server Components that fetch through `src/lib/api.ts`
  (`@skillboard/api-client`). Forms and interactive parts are Client Components (`'use client'`) in
  `src/components/<feature>/`.
- `src/components/ui/` is shadcn/ui 4 (Base UI primitives, `components.json`), owned in repo. Add one
  with `pnpm dlx shadcn@4.21.4 add <name>` from `apps/web`, pin the versions it adds, restyle it to the
  tokens. `src/components/ds/` holds the design-system components, `src/components/shell/` the app chrome
  (`docs/design/README.md`, ADR 0023).
- `src/actions/<feature>.ts` are the Server Actions (`'use server'`): validate with the shared schema,
  read the session, call one endpoint with `apiAsUser()` from `src/lib/api.ts`, map the error with
  `toActionFailure()`, then `redirect`/`revalidatePath`. No business rules (ADR 0019).
- `src/lib/session.ts` owns the httpOnly session cookie. Browser code never sees the token; Client
  Components only ever call Server Actions.
- `src/i18n/` wiring: `routing.ts`, `request.ts`, `navigation.ts`, `messages.ts`. Messages live in
  `messages/<locale>/<namespace>.json`; a new namespace is added to `NAMESPACES` in `messages.ts`.
- `src/proxy.ts` is the Next 16 middleware (locale routing). `src/env.ts` validates env; read env only there.
- `e2e/` Playwright; every spec runs in the `mobile` and `desktop` projects.
- `apps/web/AGENTS.md` is written by `next dev` (points at the Next 16 docs in `node_modules`). Commit
  it, never edit it.

## Rules

- **Design system only.** New pages and feature components are built from `components/ds/`,
  `components/ui/` and `components/shell/`, styled with token utilities (`bg-primary`, `text-label`,
  `rounded-card`, `px-gutter`, `max-w-content` …). No raw colors (hex, `rgb()`, Tailwind palette colors
  like `bg-blue-600`), no arbitrary values (`text-[13px]`, `p-[18px]`), no ad-hoc shadows or gradients.
  Every page's `<main>` is `PageContainer`, its title `PageHeader`; data pages use `EmptyState`,
  `ErrorState` and `LoadingState`. Missing a token or component? Add it to `globals.css` (+ `cn` config in
  `src/lib/utils.ts`) or `components/ds/` first, documented in `docs/design/README.md`.
- Import `cn` from `@/lib/utils`, never from `cn` directly: only the configured one knows the tokens.

- Navigate only with `Link`, `redirect`, `usePathname`, `useRouter` from `@/i18n/navigation`, never from
  `next/link` or `next/navigation`, so locale prefixes stay right.
- Pages take no locale param and never call `setRequestLocale`; the locale is resolved once in
  `src/i18n/request.ts` (next-intl 4.14 with `next/root-params`).
- Server Components: `getTranslations('ns')`. Client Components: `useTranslations('ns')`. Keys exist in all
  three locale files with the same key set (a test enforces it). ICU plurals and `{name}` placeholders; no
  string concatenation.
- Forms: react-hook-form + `zodResolver(SchemaFromShared)`, the same schema the API validates
  (`components/talent-profile/talent-profile-form.tsx` is the pattern). Field messages come from Zod,
  translated by `<ZodLocale />`; a `custom` issue (our `refine`s) maps to a key of your own. API failures
  map `code` to `t('errors.<CODE>')` in `common`; never show `error.message` to users.
- Pages that read the session: `apiAsUser()` null → `return redirectToSignIn()` (`src/lib/session.ts`);
  `UNAUTHENTICATED` → same; `NOT_FOUND` → empty state; anything else → `throw` so `error.tsx` shows.
- A link that looks like a button is `<Link className={cn(buttonVariants({ variant }))}>`, never
  `<Button render={<Link />}>`: Base UI gives the rendered element `role="button"`, which breaks link
  semantics and `getByRole('link')` in tests.
- Dates and numbers through next-intl formatters (time zone Asia/Seoul is configured). No manual
  timezone math.
- Mobile-first Tailwind: base classes are the phone layout, `sm:`/`md:` add desktop. Touch targets at
  least 44 px. Check at 375 px before desktop.
- Every data-driven page defines loading, empty and error states (the spec lists them); use `loading.tsx`
  and `error.tsx` per route where it helps.
- Public profile pages render on the server (SEO) and return 404 for draft or hidden profiles.
- Images via `next/image`; external photo hosts are allow-listed in `next.config.ts`.
- Nothing secret in Client Components: the browser only knows `NEXT_PUBLIC_*` values.
- Tests: Vitest + Testing Library for pure logic and component states (`*.test.ts(x)` next to the file);
  Playwright only for the flows a spec names.
