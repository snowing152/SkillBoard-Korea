// Shared ESLint preset (flat config, ESLint 10). Rules a tool can check live here, not in docs.
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import { importX } from 'eslint-plugin-import-x';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Absolute path of the monorepo root (this file is <root>/packages/config/eslint/base.mjs). */
export const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

export const TS_FILES = ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'];
export const JS_FILES = ['**/*.js', '**/*.mjs', '**/*.cjs'];

/**
 * Module boundaries (docs/architecture.md "Boundaries"). Relative imports that cross these lines
 * are errors; package imports across them already fail because they are not declared dependencies.
 */
const boundaryZones = [
  {
    target: './apps/web',
    from: ['./apps/api'],
    message: 'web must not import from api; use packages/*.',
  },
  {
    target: './apps/api',
    from: ['./apps/web', './packages/api-client'],
    message: 'api must not import from web or api-client; only packages/shared.',
  },
  {
    target: './packages/shared/src',
    from: ['./apps', './packages/api-client'],
    message: 'shared imports nothing from apps or other packages (ADR 0006).',
  },
  {
    target: './packages/api-client',
    from: ['./apps'],
    message: 'api-client must not import from apps.',
  },
];

/**
 * @param {{ tsconfigRootDir: string, extraIgnores?: string[] }} options
 */
export function baseConfig({ tsconfigRootDir, extraIgnores = [] }) {
  return defineConfig([
    globalIgnores(['dist/**', 'coverage/**', '.turbo/**', 'node_modules/**', ...extraIgnores]),
    {
      // Plain JS: config files, scripts. No type information available.
      files: JS_FILES,
      extends: [js.configs.recommended],
      languageOptions: { globals: { ...globals.node } },
    },
    {
      files: TS_FILES,
      extends: [
        js.configs.recommended,
        ...tseslint.configs.strictTypeChecked,
        ...tseslint.configs.stylisticTypeChecked,
        importX.flatConfigs.recommended,
        importX.flatConfigs.typescript,
      ],
      languageOptions: {
        parserOptions: { projectService: true, tsconfigRootDir },
      },
      settings: {
        'import-x/resolver-next': [createTypeScriptImportResolver({ project: tsconfigRootDir })],
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/consistent-type-imports': [
          'error',
          { fixStyle: 'inline-type-imports' },
        ],
        '@typescript-eslint/consistent-type-definitions': 'off',
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
        ],
        '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
        '@typescript-eslint/no-misused-promises': [
          'error',
          { checksVoidReturn: { attributes: false } },
        ],
        'import-x/no-restricted-paths': ['error', { basePath: repoRoot, zones: boundaryZones }],
        'import-x/no-cycle': 'error',
        'no-console': ['error', { allow: ['warn', 'error'] }],
        eqeqeq: ['error', 'always'],
      },
    },
    {
      // Tool config files are TS but outside the app's type-checked program.
      files: ['*.config.ts', '*.config.mts'],
      extends: [tseslint.configs.disableTypeChecked],
    },
    prettier,
  ]);
}

/** For packages/shared: pure TypeScript, must run in Node, browsers and React Native. */
export function libraryConfig(options) {
  return defineConfig([
    ...baseConfig(options),
    {
      files: ['src/**/*.ts'],
      rules: {
        'import-x/no-nodejs-modules': 'error',
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['react', 'react-*', 'next', 'next/*', '@nestjs/*', '@prisma/*'],
                message: 'packages/shared imports only zod (ADR 0006).',
              },
            ],
          },
        ],
      },
    },
  ]);
}

/** For apps/api: Nest decorators and DI classes. */
export function nestConfig(options) {
  return defineConfig([
    ...baseConfig(options),
    {
      files: ['src/**/*.ts', 'test/**/*.ts'],
      rules: {
        // Nest modules and nestjs-zod DTOs are intentionally empty classes.
        '@typescript-eslint/no-extraneous-class': 'off',
        // `@Injectable() constructor(private readonly x: X)` is the Nest DI idiom.
        '@typescript-eslint/parameter-properties': 'off',
      },
    },
  ]);
}
