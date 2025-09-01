export default {
    testEnvironment: 'node',
    testMatch: ['**/test/**/*.test.js'],
    collectCoverageFrom: ['**/*.js', '!**/node_modules/**', '!**/test/**', '!**/examples/**'],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    testTimeout: 30000,
    setupFilesAfterEnv: [],
    verbose: true,
    forceExit: true,
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,
    transform: {},
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
    },
    extensionsToTreatAsEsm: ['.js'],
    globals: {
        'ts-jest': {
            useESM: true
        }
    }
}
