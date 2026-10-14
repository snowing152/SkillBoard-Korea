# apps/api rules (Nest.js 11, Prisma 7, nestjs-zod, OpenAPI)

Read `AGENTS.md` first. Module to copy: `src/modules/health/`. Phase D adds `talent-profiles`, the full
example with auth, Prisma and pagination; copy that one once it exists.

## Module shape (ADR 0004)

```text
src/modules/<name>/
  <name>.module.ts        imports and providers only
  <name>.controller.ts    routes, guards, @ZodSerializerDto; one service call per handler
  <name>.service.ts       all business logic; the only code that touches Prisma
  <name>.service.spec.ts  unit tests with PrismaService mocked (no Docker)
  dto/<x>.dto.ts          `export class XDto extends createZodDto(XSchema) {}` and nothing else
test/<name>.e2e-spec.ts   one happy path + one error-shape test against Docker Postgres
```

Register the module in `src/app.module.ts`. Cross-cutting code lives in `src/common/` (config, prisma,
filters, guards, request-id).

## Rules

- Inputs are validated by the global `ZodValidationPipe` through the DTO. Every handler has
  `@ZodSerializerDto(ResponseDto)` so the OpenAPI document stays true. Swagger decorators only describe
  (`@ApiTags`, `@ApiOkResponse({ type })`, `@ApiBearerAuth`); they never redeclare shapes.
- Errors: `throw new ApiError('NOT_FOUND', 'Profile not found')` from `src/common/errors/api-error.ts`.
  Never throw Nest `HttpException` subclasses directly; the global filter formats everything (ADR 0017).
- Lists: `PaginationQuerySchema` in, `paginatedSchema(ItemSchema)` out, cursor = last id (UUID v7 is
  time-ordered). No `total`.
- Routes: `/v1/<plural-kebab>`; `/v1/me/...` for the current user's own resources; admin routes under
  `/v1/admin/...` with `@Roles('ADMIN')`.
- Auth (ADR 0009): `JwtAuthGuard` is global; `@Public()` opts out. Read the user from `@CurrentUser()`;
  never take a user id from the body for ownership checks.
- Prisma only in services (a `<name>.repository.ts` once a service passes ~300 lines). `select` the fields
  you return; `passwordHash`, token hashes and contact values never leave the service except through the
  contact-reveal endpoint.
- Visibility: public reads filter `status = PUBLISHED AND hiddenAt IS NULL`; owners and admins bypass
  (`docs/domain.md`).
- Rate limits: global 100/min; add `@Throttle` on auth and contact-reveal routes (ADR 0018).
- Config: read env through `ConfigService<Env, true>`; new variables go into `EnvSchema` and
  `.env.example`, never into `.env`.
- Logging: Nest `Logger` with the requestId; no emails, tokens or bodies.
- After any change to routes or schemas: `pnpm api-client:generate`, commit the result.
- Relative imports end with `.js` (Nest compiles ESM syntax to CommonJS; the suffix keeps both happy).
- Tests: `*.spec.ts` next to the service (Jest, `Test.createTestingModule`, `PrismaService` mocked with
  `useValue`; see `health.service.spec.ts`). E2e tests in `test/` need `pnpm db:up`.
