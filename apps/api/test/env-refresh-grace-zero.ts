// Imported first by auth.e2e-spec.ts. `ConfigModule.forRoot({ validate })` reads process.env when
// `app.module.js` is loaded, so a value set in `beforeAll` would be too late (docs/pitfalls.md).
// Grace 0: a rotated refresh token counts as replayed at once, so reuse is testable without sleeping.
// Jest gives every test file its own copy of `process.env`; other e2e files keep the default 30.
process.env.REFRESH_GRACE_SECONDS = '0';
