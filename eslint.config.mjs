import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

const testFiles = [
  '**/__tests__/**/*.{ts,tsx}',
  '**/*.test.{ts,tsx}',
  '**/jest.setup.js',
  '**/jest.config.js',
];

const typeCheckedConfigs = tseslint.configs.recommendedTypeChecked.map((c) => ({
  ...c,
  files: ['**/*.ts', '**/*.tsx'],
}));

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...typeCheckedConfigs,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        __DEV__: 'readonly',
      },
    },
  },
  {
    files: ['**/*.{tsx,jsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
  {
    files: testFiles,
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
  {
    ignores: [
      'node_modules/',
      'android/',
      'ios/',
      '**/__mocks__/**',
      '**/eslint.config.mjs',
      '**/*.config.js',
      'babel.config.js',
      'metro.config.js',
      '.prettierrc.js',
    ],
  },
  eslintConfigPrettier,
);
