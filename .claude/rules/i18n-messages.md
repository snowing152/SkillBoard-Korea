---
paths:
  - 'apps/web/messages/**'
  - 'apps/web/src/i18n/**'
---

# UI translation rules

- One file per namespace per locale: `messages/<locale>/<ns>.json`. `en` is the source; `ko` and `ru`
  must have exactly the same keys (`src/i18n/routing.test.ts` enforces it). New namespace → add it to
  `NAMESPACES` in `src/i18n/messages.ts`.
- Keys: camelCase, nested by screen and section (`profile.form.headline.label`), never derived from the
  English text. Values: plain text with ICU (`{count, plural, one {# skill} other {# skills}}`, `{name}`).
  No HTML in values, no concatenation in code.
- Korean is usually shorter than English, Russian 20–40 % longer: never size layout by text length.
  Korean UI strings use the friendly polite register (해요체: "로그인하세요", "저장되었어요") and legal texts the formal one (합니다체); Russian uses neutral "вы". Keep `SkillBoard Korea`
  untranslated.
- Error messages live under `errors.<CODE>` and map from `packages/shared/src/api/errors.ts`.
- Adding a language is `/add-language`: one folder plus one line in
  `packages/shared/src/i18n/locales.ts`, nothing else.
- User content (profiles) is never machine-translated; only UI strings are translated.
