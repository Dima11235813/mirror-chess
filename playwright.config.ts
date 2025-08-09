import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',                  // scan the whole repo
  testMatch: /.*\.e2e\.ts/,      // only run files ending with .e2e.ts
  retries: process.env.CI ? 2 : 0,
  fullyParallel: true,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  },
  testIgnore: ['**/node_modules/**', '**/docs/**', '**/assets/**'],

});
