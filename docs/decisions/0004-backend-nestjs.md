# 0004. Backend: Nest.js as a separate API

Date: 2026-10-14 · Status: Accepted

## Context

A future React Native app needs the same backend. Agents work best with a strict, predictable module layout.

## Decision

Nest.js in `apps/api`, one folder per domain module under `src/modules/<name>/` containing
`<name>.module.ts`, `<name>.controller.ts`, `<name>.service.ts`, `<name>.service.spec.ts`, and `dto/`
(classes created from shared Zod schemas, ADR 0014). Cross-cutting code in `src/common/`
(filters, guards, interceptors, prisma service, config). Controllers: route + auth guard + call one service
method. Services: all business logic. Prisma access only inside services (or small repositories if a
service grows past ~300 lines).

## Consequences

More files than an Express app, but every feature looks the same, which is what makes copying the reference
feature safe. API is deployed separately from the web (ADR 0013).
