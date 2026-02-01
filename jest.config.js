module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@icco/etu-proto$': '<rootDir>/__mocks__/etu-proto.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@react-navigation|react-native|@react-native|react-native-markdown-display|@connectrpc|@bufbuild)/)',
  ],
};
