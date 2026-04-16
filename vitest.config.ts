import { defineConfig } from 'vitest/config';

/**
 * Vitest config for planetearth.live unit tests.
 *
 * Kept intentionally small: jsdom for DOM-touching modules (i18n, data-status),
 * node for pure modules (math, format, validation). Coverage is enforced with
 * floor thresholds so regressions show up in CI as a test failure, not a
 * silent "percentage went down".
 */
export default defineConfig({
    test: {
        environment: 'jsdom',
        include: ['tests/unit/**/*.test.ts'],
        globals: false,
        reporters: process.env['CI'] ? ['default', 'junit'] : ['default'],
        outputFile: {
            junit: './test-results/junit.xml',
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov', 'json-summary'],
            reportsDirectory: './coverage',
            include: [
                'src/services/**/*.ts',
                'src/i18n/**/*.ts',
                'src/utils/**/*.ts',
            ],
            exclude: [
                'src/**/*.d.ts',
                'src/**/index.ts',
                'src/services/api-client.ts', // covered indirectly via Playwright smoke
            ],
            thresholds: {
                lines: 70,
                statements: 70,
                functions: 70,
                branches: 60,
            },
        },
    },
});
