# 0007. UI kit: Tailwind CSS + shadcn/ui owned in-repo

Date: 2026-10-14 · Status: Accepted

## Context
Opus will design on top of whatever Fable/Sonnet build. Components must be editable, not a black-box library.

## Decision
Tailwind CSS v4 with design tokens as CSS variables in `apps/web/src/app/globals.css`. shadcn/ui components
are copied into `apps/web/src/components/ui/` and owned by the repo. Feature components live in
`src/components/<feature>/`. Sonnet uses plain shadcn components with default styling; Opus restyles later
by editing tokens and `components/ui`, not feature code.

## Consequences
Korean and Russian strings are longer/taller than English; components must not assume English widths
(documented for Opus in `docs/design/README.md`, Phase C).
