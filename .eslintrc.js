module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier' // Must be last to override other configs
  ],
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    'prettier/prettier': ['error', { singleQuote: true }],
    'quotes': ['error', 'single', { avoidEscape: true }]
  },
  env: {
    browser: true,
    node: true,
    es2020: true
  }
};
