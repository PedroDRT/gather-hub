import globals from 'globals';

export default [
  {
    ignores: ['node_modules/**', 'dist/**', '*.zip'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.serviceworker,
        chrome: 'readonly',
        GH: 'readonly',
        GH_UTILS: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-undef': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'warn',
      'no-var': 'error',
    },
  },
  {
    files: ['background.js'],
    languageOptions: {
      sourceType: 'module',
    },
  },
];
