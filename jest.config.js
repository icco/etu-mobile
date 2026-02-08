module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@icco/etu-proto$': '<rootDir>/__mocks__/etu-proto.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@react-navigation|react-native|@react-native|react-native-markdown-display|@connectrpc|@bufbuild)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.styles.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 50,
      branches: 50,
      functions: 50,
      lines: 50,
    },
  },
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '/__mocks__/',
  ],
};
