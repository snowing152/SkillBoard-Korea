# 0023. Design system "M4": IBM Plex, semantic tokens, composed components (refines 0007)

Date: 2026-10-15 · Status: Accepted

## Context

Phases B–D shipped unstyled shadcn defaults. The owner approved one visual direction ("M4": calm,
trustworthy, facts first) from a static mockup of the public profile. Every later page should look finished
without per-page design work, and the three scripts (Latin, Cyrillic, Hangul) need one consistent font.

## Decision

- Font: IBM Plex Sans (Latin + Cyrillic, variable, preloaded) with IBM Plex Sans KR (Hangul, not
  preloaded, unicode-range slices) through `next/font/google`, self-hosted at build time.
- Tokens: semantic CSS variables in `:root` of `apps/web/src/app/globals.css`, mapped to Tailwind utilities
  in `@theme inline`. Brand color is the single `--primary`; shades derive with `color-mix`. Light theme
  only; dark mode later redefines the same variables under `.dark`.
- `cn` from `src/lib/utils.ts` is configured with the token names (font sizes, radii, spacing, widths) so
  class merging does not drop them.
- Components: shadcn primitives in `components/ui/` restyled to the tokens; composed design-system
  components in `components/ds/` (FactTile, SkillTag, SegmentedTabs, MediaCover, Avatar, StickyActionBar,
  PageContainer, Section, Empty/Error/Loading states); app chrome in `components/shell/`.
- Layout: route group `app/[locale]/(main)` wraps pages in `AppShell` (header, footer, phone bottom nav);
  `/t/[slug]` sits outside it because its header lives in the media cover.
- Pages use design-system components and token utilities only: no raw colors, no arbitrary values.

## Consequences

New pages look consistent by default and are cheaper to build. Changing the brand color is one line.
Arbitrary Tailwind values are a review finding, so a missing token must be added to `globals.css` and
`src/lib/utils.ts` first. Revisit the fonts if Korean page weight becomes a problem on slow networks.
