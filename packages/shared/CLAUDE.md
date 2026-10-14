# packages/shared rules (Zod 4, pure TypeScript)

Read `AGENTS.md` first. This package is the single contract for web, api and the future mobile app
(ADR 0006). It is compiled (`tsc` to `dist/`), so a consumer that cannot see a new export needs
`pnpm --filter @skillboard/shared build` (`pnpm dev` watches it).

## Layout

- `src/<domain>/<thing>.schema.ts`: Zod schemas with inferred types.
  `export const XSchema = z.object({...}); export type X = z.infer<typeof XSchema>;`
- `src/<domain>/<thing>.ts`: constants and pure helpers (cities, visa types, locales, error codes).
- `src/index.ts`: one `export * from './<file>.js'` line per file. Only what is exported there is public.
- `*.test.ts` next to the file (Vitest): edge cases (limits, trimming, bad input), not only happy paths.

## Rules

- Imports only `zod`. No `node:*`, no DOM, no React/Next/Nest/Prisma (ESLint enforces; Expo must be able
  to import this package).
- Strict schemas: `.max()` on every string, `.trim()` on user-typed text, `z.url()` for links (http/https
  only), `z.enum(CONSTANT_ARRAY)` so the constant and the schema cannot drift.
- Separate `CreateX`, `UpdateX` (`CreateXSchema.partial()`), `X` (response) and `XQuery` schemas. Add
  `.meta({ description })` on fields that matter in OpenAPI.
- Response schemas never contain secrets or server-only fields (`passwordHash`, token hashes).
- Reuse `PaginationQuerySchema`, `paginatedSchema()` and `ErrorResponseSchema` from `src/api/`.
- A schema change touches three artifacts: build shared, let the API compile, then
  `pnpm api-client:generate`. Web forms pick up the new shape through `zodResolver`.
- Relative imports inside `src/` end with `.js` (ESM output).
