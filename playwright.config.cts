import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.e2e.cts',
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:4201', browserName: 'chromium', trace: 'retain-on-failure', actionTimeout: 10000, navigationTimeout: 20000 },
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 4201 --strictPort',
    url: 'http://127.0.0.1:4201',
    reuseExistingServer: false,
    env: { VITE_WS_ENDPOINT: process.env.VITE_WS_ENDPOINT || 'ws://127.0.0.1:3002' },
  },
})
