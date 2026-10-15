# Design system ("M4", ADR 0023)

Calm, trustworthy, human: structure and facts first, warmth second. The approved mockup of the public
profile (`docs/design/reference/`, git-ignored export) is a picture of the target, not code.

## Where it lives

| What                     | Where                                                      | Notes                                                                                                                              |
| ------------------------ | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Tokens                   | `apps/web/src/app/globals.css` (`:root` + `@theme inline`) | Raw values in `:root`, utilities in `@theme`. A new size/radius/spacing/width token also goes in `src/lib/utils.ts` (`cn` config). |
| Primitives               | `apps/web/src/components/ui/`                              | shadcn/ui 4 (Base UI), restyled to the tokens. Add with `pnpm dlx shadcn@4.21.4 add <name>`, then restyle.                         |
| Design-system components | `apps/web/src/components/ds/`                              | Composed, presentational, no data fetching.                                                                                        |
| App chrome               | `apps/web/src/components/shell/`                           | `AppShell` = header + footer + phone bottom nav, used by `app/[locale]/(main)/layout.tsx`.                                         |
| Fonts                    | `app/[locale]/layout.tsx` via `next/font`                  | IBM Plex Sans (Latin, Cyrillic) + IBM Plex Sans KR (Hangul, not preloaded).                                                        |
| Icons, PWA               | `lucide-react`; `public/icon.svg`, `src/app/manifest.ts`   | Manifest colors are hex copies of `--background`/`--primary`. PNG icons still missing (tech-debt).                                 |

## Tokens

| Role                       | Utility                                                    | Value                             | Contrast (on)               |
| -------------------------- | ---------------------------------------------------------- | --------------------------------- | --------------------------- |
| Primary (one token)        | `bg-primary`, `text-primary`                               | `#0E6B5C`                         | white on it 6.4:1           |
| Primary hover              | `bg-primary-hover`                                         | color-mix                         | derived, never hard-coded   |
| Page / surface             | `bg-background` / `bg-card`                                | `#F4F5F3` / `#FFFFFF`             |                             |
| Text / secondary / labels  | `text-foreground` / `-secondary` / `text-muted-foreground` | `#17191F` / `#4B5160` / `#5D6372` | labels 5.5:1 on page        |
| Borders (decorative)       | `border-border`                                            | `#E3E6E1`                         |                             |
| Form control borders       | `border-input`                                             | `#8A909A`                         | 3.2:1 (WCAG 1.4.11)         |
| Segment track, skeleton    | `bg-muted`                                                 | `#E7E9E6`                         |                             |
| Skill tag                  | `bg-tag text-tag-foreground`                               | `#E3F0EC` / `#0B5246`             | 7.8:1 (retune with primary) |
| Media cover                | `bg-media text-media-foreground`                           | `#1F2421` / white                 | 15.8:1                      |
| Avatar placeholder         | `bg-avatar text-avatar-foreground`                         | `#F8DCD3` / `#8A3220`             | 6.3:1                       |
| Success / warning / danger | `text-success` + `bg-success-soft`, …                      | `#1E6B3F` `#8A5300` `#B42318`     | ≥5.6:1 on soft fill         |

Type: `text-caption` 12 · `text-label` 13 · `text-body-sm` 14 · `text-body` 16 · `text-button` 15 ·
`text-title-sm` 18 · `text-title` 21 · `text-display` 28 (line heights ≥1.45 built in). Weights 400/500/600.
Radii: `rounded-tag` 6 · `rounded-control` 12 (buttons, inputs, fact tiles) · `rounded-card` 16 ·
`rounded-full` pills. Spacing: Tailwind 4 px grid plus `gutter` 16 (page sides), `stack` 12 (between blocks),
`cover` 210, `bottom-nav` 64. Widths: `max-w-content` 720, `max-w-form` 560, `max-w-prose` 680,
`max-w-shell` 1040. No gradients; no shadows except `shadow-popover` on floating menus.

## Components

| Component                                         | Use                                                                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `PageContainer`, `PageHeader`, `Section`          | Every page's `<main>`, its `<h1>`, white card groups.                                                         |
| `Button` / `buttonVariants`                       | Variants default, secondary, outline, ghost, destructive, link, inverse, onMedia; `shape="pill"`; all ≥44 px. |
| `FactGrid` + `FactTile`                           | 2×2 key facts; values wrap and hyphenate, never cut.                                                          |
| `SkillTagList` + `SkillTag`                       | Skills anywhere (profile, cards, later search).                                                               |
| `SegmentedTabs`                                   | 2–3 sibling panels; panels stay mounted for SEO.                                                              |
| `MediaCover`                                      | Profile cover: dark when there is a video, primary otherwise; header/action/overlap slots.                    |
| `Avatar`                                          | Photo or initials (`lib/initials.ts`); `ringed` when overlapping the cover.                                   |
| `StickyActionBar`                                 | The page's one main action at the bottom; `sticky`, put it last in the page.                                  |
| `EmptyState`, `ErrorState`, `LoadingState`        | Every data page's states; `LoadingState` shows the "server waking up" line after 4 s (ADR 0013).              |
| `Alert` variants info/success/warning/destructive | Inline status banners.                                                                                        |

Rules: pages and feature components use these and token utilities only; no hex, no `[arbitrary]`
values, no `text-sm`/`rounded-lg` where a named token exists. A missing piece becomes a token or a `ds/`
component first.

## Constraints

- **Mobile-first**: 375 px first, then 1280. Touch targets ≥44 px; the main action within thumb reach.
- **Three scripts**: Russian runs 20–40 % longer, Korean wraps differently. No fixed-width text containers,
  labels may wrap to two lines, test every screen at `/ko` and `/ru`.
- **Trust and PIPA**: contacts only after an explicit action; visa always "self-declared" with the
  disclaimer (`VisaDisclaimer`, `variant="bar"` in sticky bars).
- **Accessibility**: WCAG AA text contrast (table above), visible focus (`:focus-visible` outline in
  `globals.css`), labelled fields, Base UI semantics kept.
- **Do not touch** in design work: `packages/*`, `apps/api`, feature logic, i18n wiring, env files.

## Process

One PR per screen group, phone and desktop screenshots in the PR (not committed), `pnpm check` green.
