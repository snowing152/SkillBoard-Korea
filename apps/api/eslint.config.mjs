import { nestConfig } from '@skillboard/config/eslint/base.mjs';

export default nestConfig({
  tsconfigRootDir: import.meta.dirname,
  extraIgnores: ['src/generated/**'],
});
