import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';
import { digestServer } from './test/browser/digest-server.ts';
import { CANARY_PASSWORD, CANARY_USERNAME } from './test/browser/fixtures.ts';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      reporter: ['text', 'lcov'],
    },
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          include: ['test/unit/**/*.{test,spec}.ts', 'test/e2e/**/*.{test,spec}.ts'],
        },
      },
      {
        // Same-origin Digest endpoint for the browser tests.
        plugins: [digestServer()],
        test: {
          name: 'browser',
          include: ['test/browser/**/*.{test,spec}.ts'],
          browser: {
            enabled: true,
            // The canary is answered only when the browser takes its own HTTP
            // auth path, i.e. when a real user would see the login dialog.
            provider: playwright({
              contextOptions: {
                httpCredentials: { username: CANARY_USERNAME, password: CANARY_PASSWORD },
              },
            }),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
