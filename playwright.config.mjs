import { defineConfig, devices } from '@playwright/test';

// Test-only browser dependency and synthetic responses are never copied to dist.
const port = 4173;
const launchOptions = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
  : {};
export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.spec.mjs',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  outputDir: 'test-results/TEST-ONLY-MOCK-browser',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/TEST-ONLY-MOCK-report', open: 'never' }],
  ],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'off', // Our hook uses explicitly labeled screenshot filenames.
    video: 'off',
  },
  projects: [{
    name: 'TEST-ONLY-MOCK-chromium',
    testMatch: '**/TEST-ONLY-MOCK-ui.spec.mjs',
    use: {
      ...devices['Desktop Chrome'],
      locale: 'ja-JP',
      reducedMotion: 'reduce',
      launchOptions,
    },
  }, {
    name: 'TEST-ONLY-MOCK-mobile-chromium',
    testMatch: '**/TEST-ONLY-MOCK-mobile.spec.mjs',
    use: {
      ...devices['Pixel 7'],
      locale: 'ja-JP',
      reducedMotion: 'reduce',
      launchOptions,
    },
  }],
  webServer: {
    command: 'node server.mjs',
    env: { PORT: String(port) },
    url: `http://127.0.0.1:${port}/healthz`,
    reuseExistingServer: false,
    timeout: 15_000,
  },
});
