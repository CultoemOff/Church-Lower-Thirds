import globals from 'globals';

// Frontend runs as native ES modules without a bundler: undefined names are runtime
// errors, so catch them here.
export default [
  {
    files: ['src/web/**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': 'error',
      'no-redeclare': 'error',
      'no-const-assign': 'error',
      'no-dupe-keys': 'error',
    },
  },
];
