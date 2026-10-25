module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@theme/(.*)$': '<rootDir>/src/theme/$1',
    '^@spa/api-client$': '<rootDir>/../../packages/api-client/src/index.ts',
    '^@spa/shared-types$': '<rootDir>/../../packages/shared-types/src/index.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native(-community)?|expo|@expo|@react-navigation|react-native-safe-area-context|react-native-screens)',
  ],
};
