import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: {
      globals: globals.browser,
      ecmaVersion: 2025,
      sourceType: 'module',
    },
    rules: {
      // Warn for unused variables, allow "_" prefix to ignore
      'no-unused-vars': [
        'warn',
        {
          vars: 'all', // check all variables
          args: 'after-used', // only check arguments that are used
          argsIgnorePattern: '^_', // ignore function args starting with "_"
          varsIgnorePattern: '^_', // ignore variables starting with "_"
          ignoreRestSiblings: true, // ignore rest siblings in object destructuring
        },
      ],

      // Optional: warn for unused functions
      'no-unused-vars-except-underscored': 'off', // already handled above
      // Optional: stricter checks for consistent usage
      'no-shadow': 'warn', // avoid variable shadowing
      'no-undef': 'error', // catch undefined variables
    },
  },
]);
