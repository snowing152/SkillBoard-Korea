/** Unit tests: `*.spec.ts` next to the code, Prisma mocked, no Docker needed (ADR 0010). */
// Jest runs CommonJS. The app tsconfig emits ESM for packages/shared (type: module), so override
// the module format for the test transform only. Everything else comes from tsconfig.json.
const JEST_TS_OVERRIDES = { module: 'CommonJS', moduleResolution: 'Node10' };

module.exports = {
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: JEST_TS_OVERRIDES }] },
  moduleNameMapper: {
    // Jest cannot load the ESM build of shared; compile its TypeScript source instead.
    '^@skillboard/shared$': '<rootDir>/../../../packages/shared/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  clearMocks: true,
};
