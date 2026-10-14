/** E2E tests: real Nest app against the Docker Postgres (`pnpm db:up`). Run with `pnpm test:e2e`. */
// Jest runs CommonJS. The app tsconfig emits ESM for packages/shared (type: module), so override
// the module format for the test transform only. Everything else comes from tsconfig.json.
const JEST_TS_OVERRIDES = { module: 'CommonJS', moduleResolution: 'Node10' };

module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  testRegex: 'test/.*\\.e2e-spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: JEST_TS_OVERRIDES }] },
  moduleNameMapper: {
    '^@skillboard/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testTimeout: 20000,
};
