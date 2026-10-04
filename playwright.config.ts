import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './e2e', testMatch: process.env.CANVASTUBE_PERFORMANCE ? /performance\.spec\.ts/ : /smoke\.spec\.ts/, fullyParallel: false, workers: 1,
  timeout: 60_000, expect: { timeout: 15_000 }, retries: 0,
  outputDir: process.env.CANVASTUBE_PACKAGED ? 'test-results/packaged' : 'test-results/compiled',
  reporter: [['list'], ['html', { outputFolder: process.env.CANVASTUBE_PACKAGED ? 'playwright-report/packaged' : 'playwright-report/compiled', open: 'never' }]],
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' }
})
