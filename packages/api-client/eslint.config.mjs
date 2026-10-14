import { baseConfig } from '@skillboard/config/eslint/base.mjs';

export default baseConfig({
  tsconfigRootDir: import.meta.dirname,
  extraIgnores: ['src/schema.ts'],
});
