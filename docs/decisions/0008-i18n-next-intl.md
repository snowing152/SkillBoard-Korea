# 0008. i18n with next-intl; en/ko/ru; new language = folder + config line

Date: 2026-10-14 · Status: Accepted

## Context

UI in English (default), Korean, Russian. Adding a language must need no code changes.

## Decision

next-intl 4 with locale-prefixed routes (`/en/...`, `/ko/...`, `/ru/...`; `localePrefix: 'as-needed'` so
English has no prefix). Files: `src/i18n/routing.ts` (`defineRouting({ locales, defaultLocale: 'en' })`),
`src/i18n/request.ts`, `src/i18n/navigation.ts`, `src/proxy.ts`. Messages in `apps/web/messages/<locale>/`
split by namespace (`common.json`, `profile.json`, …), merged in `request.ts`. The locale list is one array
in `packages/shared/src/i18n/locales.ts`; it also drives `User.locale` validation and email templates.
Dates/times formatted by next-intl with `timeZone: 'Asia/Seoul'` default (ADR 0017).
User-generated content (profile text) is stored as written and never machine-translated in MVP.
DB reference data uses JSON `{ en, ko, ru }` names with English fallback (see `docs/domain.md`).

## Consequences

Adding Japanese = add `messages/ja/`, add `'ja'` to the locale array. A Haiku `add-language` skill does it.
Hard-coded UI strings are a lint/subagent violation (`i18n-checker`, Phase C).
