---
name: new-module
description: Scaffold a new API module with shared Zod schemas, Nest files, typed client and a web page skeleton, following the documented recipe.
argument-hint: <kebab-name, plural, e.g. reports>
disable-model-invocation: true
---

Scaffold the module `$0` (REST resource `/v1/$0`), copying the shape of the reference feature named in
`AGENTS.md`. Below, `<Name>` is the PascalCase singular of `$0` (`reports` → `Report`).

Create in this order and run the check after each group:

1. `packages/shared/src/$0/$0.schema.ts`: `Create<Name>Schema`, `Update<Name>Schema`
   (`.partial()` of create), `<Name>Schema` (response), `<Name>QuerySchema` (extends
   `PaginationQuerySchema`), inferred types; `$0.schema.test.ts`; an export line in `src/index.ts` →
   `pnpm --filter @skillboard/shared build && pnpm --filter @skillboard/shared test`.
2. `apps/api/src/modules/$0/`: `$0.module.ts`, `$0.service.ts` (Prisma through `PrismaService`, failures
   as `ApiError`), `$0.service.spec.ts` (Prisma mocked), `dto/*.dto.ts` (one `createZodDto` line each),
   `$0.controller.ts` (`@ApiTags`, `@ZodSerializerDto`, one service call per route, guards per the
   spec). Register in `app.module.ts` → `pnpm --filter @skillboard/api typecheck && pnpm --filter @skillboard/api lint && pnpm --filter @skillboard/api test`.
3. `apps/api/test/$0.e2e-spec.ts`: happy path plus error shape.
4. `pnpm api-client:generate`; commit the regenerated files.
5. Web: `apps/web/src/app/[locale]/$0/page.tsx` (Server Component fetching via `@/lib/api`),
   `src/components/$0/` for interactive parts, namespace `$0` in `messages/{en,ko,ru}/$0.json`, added to
   `NAMESPACES` in `src/i18n/messages.ts`.
6. `pnpm check`.

Naming: files kebab-case, classes PascalCase (`ReportsService`), schema constants PascalCase + `Schema`.
The scaffold has validation wired and empty handlers with `TODO(#issue)` comments pointing at spec
sections; add no business logic that was not asked for.
