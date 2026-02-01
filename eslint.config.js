const { fixupConfigRules } = require('@eslint/compat');
const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Load legacy @react-native/eslint-config and fix rules for ESLint 9
const reactNativeConfig = compat.extends('@react-native/eslint-config');
const fixed = fixupConfigRules(reactNativeConfig);

module.exports = [
  ...fixed,
  {
    files: ['jest.setup.js', 'jest.config.js', '__mocks__/**/*.js'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        expect: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      },
    },
  },
];
