# Design hand-off (for Opus)

Phases B and D ship functional, unstyled pages built from shadcn/ui defaults. Nothing is designed yet;
this page says where the design surface is and which constraints it has.

## Where the design lives

| What                                   | Where                                                       | Notes                                                                                                                                                                                                            |
| -------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tokens (colors, radii, spacing, fonts) | `apps/web/src/app/globals.css`, `@theme { … }` (Tailwind 4) | Placeholder values. Add tokens there and use them through utilities (`bg-primary`). Dark mode via `@custom-variant` when you add it.                                                                             |
| Primitives                             | `apps/web/src/components/ui/`                               | shadcn/ui 4 copies owned in repo (Base UI, `components.json`). Restyle here; feature code imports them unchanged. Add primitives from `apps/web` with `pnpm dlx shadcn@4.21.4 add <component>` and pin versions. |
| Feature components                     | `apps/web/src/components/<feature>/`                        | Logic lives here. Change layout and classes, not behaviour.                                                                                                                                                      |
| Pages                                  | `apps/web/src/app/[locale]/`                                | `page.tsx` stays thin; `loading.tsx` and `error.tsx` where defined.                                                                                                                                              |
| Icons, PWA                             | `apps/web/public/icon.svg`, `src/app/manifest.ts`           | PNG icon sizes and screenshots are missing (`docs/tech-debt.md`).                                                                                                                                                |
| Fonts                                  | `src/app/[locale]/layout.tsx` via `next/font`               | Must cover Latin, Cyrillic and Hangul (for example Pretendard or Noto Sans KR plus Inter, or one variable font).                                                                                                 |

## Pages

Existing (unstyled, Phase D): home (`/`), offline, not-found, sign-in (`/sign-in`), my profile
(`/me/talent-profile`: empty, draft, published and hidden states), profile form
(`/me/talent-profile/edit`), public profile (`/t/[slug]`), talent list (`/talents`), error page.
Planned per `docs/specs/` (order in `docs/roadmap.md`): sign-up (role choice, consent), verify-email,
forgot/reset password, account settings, search (`/talents` with filters: skill, language, city,
remote/on-site, visa; bottom sheet on phones), contact reveal (dialog on the profile), report profile,
admin inbox and admin profile page, legal pages (privacy, terms, visa disclaimer), account deletion.

## Constraints

- **Mobile-first**: design at 390×844 first, desktop (1280) second; Playwright tests both. Touch targets
  at least 44 px; primary actions within thumb reach; filters as a bottom sheet on phones.
- **Three scripts**: English; Korean (denser, no spaces inside compounds, wraps differently); Russian
  (20–40 % longer, long single words). Never size by text length: no fixed-width buttons, allow two-line
  labels, line-height at least 1.5 for Hangul and Cyrillic, test every screen at `/ko` and `/ru`.
- **Strings** only through next-intl keys; add keys to `messages/{en,ko,ru}` in the same PR. No text in
  images.
- **Trust and PIPA**: contact details appear only after an explicit "Contact" action; visa type is
  self-declared and always shown with the disclaimer; a hidden profile shows a banner to its owner and
  404 to everyone else.
- **Two client kinds**: copy and flows must work for a private person (a parent looking for a tutor) as
  well as for a company. No company fields outside optional ones.
- **Free hosting**: the first API call after idle can take 30–60 s (ADR 0013); design a "waking up" state.
- **Accessibility**: WCAG AA contrast, visible focus, labelled fields. shadcn 4 primitives are built on
  Base UI and keep its semantics; do not replace them with plain `div`s.
- **Do not touch**: `packages/*`, `apps/api`, feature logic, i18n wiring, env files. If a component needs
  a new prop for styling, add it without changing behaviour and say so in the PR.

## Process

One PR per screen group with phone and desktop screenshots in all three locales and `pnpm check` green.
Record the type scale, palette and spacing decisions as comments at the top of `globals.css`; record a
hard-to-reverse choice (for example a design system) as an ADR.
