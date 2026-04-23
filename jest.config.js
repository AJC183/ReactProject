module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@react-native-async-storage/async-storage$': require.resolve(
      '@react-native-async-storage/async-storage/jest/async-storage-mock'
    ),
    '^expo-sqlite$': '<rootDir>/__mocks__/expo-sqlite.js',
  },
  // Expand transform scope to cover all expo-* packages, which ship ESM
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      '(jest-)?react-native' +
      '|@react-native(-community)?' +
      '|expo[^/]*' +
      '|@expo[^/]*(/.*)?'  +
      '|@expo-google-fonts(/.*)?'  +
      '|react-navigation' +
      '|@react-navigation(/.*)?'  +
      '|@unimodules(/.*)?'  +
      '|unimodules' +
      '|drizzle-orm' +
      ')/)',
  ],
};
