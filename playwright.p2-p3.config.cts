import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: 'p2-p3*.e2e.cts',
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  expect: { timeout: 15000 },
  use: {
    baseURL: 'http://127.0.0.1:4201',
    browserName: 'chromium',
    trace: 'retain-on-failure',
    actionTimeout: 15000,
  },
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 4201 --strictPort',
    url: 'http://127.0.0.1:4201',
    reuseExistingServer: false,
    env: { VITE_WS_ENDPOINT: 'ws://127.0.0.1:3102', VITE_API_BASE_URL: 'http://127.0.0.1:3101' },
  },
});
