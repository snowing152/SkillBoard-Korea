---
name: add-language
description: Add a new UI language (one locale folder plus one config line), translate every namespace, verify key parity.
argument-hint: <locale code, e.g. uz> [language name]
disable-model-invocation: true
---

Add the UI language `$0` ($ARGUMENTS).

1. `packages/shared/src/i18n/locales.ts`: append `'$0'` to `LOCALES` (keep `en` first). No other code
   changes (ADR 0008).
2. Create `apps/web/messages/$0/<ns>.json` for every namespace listed in `apps/web/src/i18n/messages.ts`,
   with exactly the English key set. Translate from `messages/en`; keep ICU placeholders and use the
   plural categories of the language (CLDR). Keep `SkillBoard Korea` untranslated. Add the language's own
   display name under `common.language.$0` in **every** locale file, including the new one.
3. `pnpm --filter @skillboard/shared build`, then `pnpm --filter @skillboard/web test` (key parity) and
   `pnpm --filter @skillboard/web typecheck`.
4. Add a case for `/$0` with the translated h1 to `apps/web/e2e/home.spec.ts`.
5. `pnpm check`. In the PR note that `User.locale` validation picks the locale up through `LocaleSchema`,
   and open a follow-up issue for email templates and legal pages in `$0` if those exist.
