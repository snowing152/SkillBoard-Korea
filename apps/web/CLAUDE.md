# apps/web rules (Next.js 16 App Router, next-intl 4, Tailwind 4, shadcn/ui)

Read `AGENTS.md` first. These rules apply only inside the web app.

## Layout

- `src/app/[locale]/…` pages. Public pages (home, search, `/t/[slug]`) are Server Components that fetch
  through `src/lib/api.ts` (`@skillboard/api-client`). Forms and interactive parts are Client Components
  (`'use client'`) in `src/components/<feature>/`.
- `src/components/ui/` is shadcn/ui, owned in repo. Sonnet uses the components unstyled; Opus restyles
  tokens in `src/app/globals.css` and `components/ui` only (`docs/design/README.md`).
- `src/i18n/` wiring: `routing.ts`, `request.ts`, `navigation.ts`, `messages.ts`. Messages live in
  `messages/<locale>/<namespace>.json`; a new namespace is added to `NAMESPACES` in `messages.ts`.
- `src/proxy.ts` is the Next 16 middleware (locale routing). `src/env.ts` validates env; read env only there.
- `e2e/` Playwright; every spec runs in the `mobile` and `desktop` projects.

## Rules

- Navigate only with `Link`, `redirect`, `usePathname`, `useRouter` from `@/i18n/navigation`, never from
  `next/link` or `next/navigation`, so locale prefixes stay right.
- Pages take no locale param and never call `setRequestLocale`; the locale is resolved once in
  `src/i18n/request.ts` (next-intl 4.14 with `next/root-params`).
- Server Components: `getTranslations('ns')`. Client Components: `useTranslations('ns')`. Keys exist in all
  three locale files with the same key set (a test enforces it). ICU plurals and `{name}` placeholders; no
  string concatenation.
- Forms: react-hook-form + `zodResolver(SchemaFromShared)`, the same schema the API validates. Map the API
  `error.code` to `t('errors.<CODE>')`; never show `error.message` to users.
- Dates and numbers through next-intl formatters (time zone Asia/Seoul is configured). No manual
  timezone math.
- Mobile-first Tailwind: base classes are the phone layout, `sm:`/`md:` add desktop. Touch targets at
  least 44 px. Check at 390 px before desktop.
- Every data-driven page defines loading, empty and error states (the spec lists them); use `loading.tsx`
  and `error.tsx` per route where it helps.
- Public profile pages render on the server (SEO) and return 404 for draft or hidden profiles.
- Images via `next/image`; external photo hosts are allow-listed in `next.config.ts`.
- Nothing secret in Client Components: the browser only knows `NEXT_PUBLIC_*` values.
- Tests: Vitest + Testing Library for pure logic and component states (`*.test.ts(x)` next to the file);
  Playwright only for the flows a spec names.
