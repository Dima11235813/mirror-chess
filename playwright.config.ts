import { defineConfig, devices } from '@playwright/test';

/**
 * The port the e2e suite talks to.
 *
 * **41962 is ours**, from the block this project claimed in the workspace registry
 * (`D:\GDrive\proj-mgmt\inventory\local-ports.md`, 41960–41979). It is deliberately a
 * *different* port from the preview server a developer may be running by hand on 41961, so
 * an e2e run and a browser session can never fight over one server.
 *
 * It used to be a framework default, and that cost a day: on 2026-10-03 every e2e test
 * failed with `waiting for getByTestId('square-b3')` because `reuseExistingServer` had
 * happily reused **another project's** dev server on 5173 and Playwright spent 30 seconds
 * per test hunting for a chessboard inside a maze app. Framework defaults are shared by
 * every project on the machine; a claimed block is not.
 *
 * The other half of that lesson: **a check that fails for an environment reason should say
 * which.** `scripts/check-a11y.mjs` prints the title of whatever page it found. Here,
 * `E2E_PORT=41963 npm run e2e` is the escape hatch — stay inside the block.
 */
const PORT = process.env.E2E_PORT ?? '41962';
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
