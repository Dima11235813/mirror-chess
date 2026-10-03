import { defineConfig, devices } from '@playwright/test';

/**
 * The port the e2e suite talks to.
 *
 * `vite preview` serves 4173 by default and `vite dev` 5173, and on a developer machine
 * either may already be taken by **another project**. That is not hypothetical: on
 * 2026-10-03 every e2e test failed with `waiting for getByTestId('square-b3')` because
 * `reuseExistingServer` had happily reused a different app's dev server on 5173 and
 * Playwright spent 30 seconds per test hunting for a chessboard inside it.
 *
 * So the port is one place, overridable, and the failure above is worth remembering:
 * **a check that fails for an environment reason should say which.** `scripts/check-a11y.mjs`
 * now prints the title of whatever page it found; here, `E2E_PORT=4175 npm run e2e` is the
 * escape hatch.
 */
const PORT = process.env.E2E_PORT ?? '4173';
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: '.',                  // scan the whole repo
  testMatch: /.*\.e2e\.ts/,      // only run files ending with .e2e.ts
  retries: process.env.CI ? 2 : 0,
  fullyParallel: true,
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: {
    command: `npm run preview -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  },
  testIgnore: ['**/node_modules/**', '**/docs/**', '**/assets/**'],

});
