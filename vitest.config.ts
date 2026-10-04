import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import minimums from './coverage-minimums.json'

const metrics = ['statements', 'branches', 'functions', 'lines'] as const
if (minimums.status !== 'pending-platform-evidence' && metrics.some(metric => typeof minimums[metric] !== 'number')) {
  throw new Error('Verified coverage minimums must specify all four metrics')
}
const thresholds = minimums.status === 'pending-platform-evidence' ? undefined :
  Object.fromEntries(metrics.map(metric => [metric, minimums[metric]]))

export default defineConfig({
  test: {
    globals: true,
    projects: [
      { extends: true, test: { name: 'node', environment: 'node', include: ['tests/*.test.ts'] } },
      { extends: true, test: {
        name: 'renderer', environment: 'jsdom', include: ['tests/renderer/*.test.{ts,tsx}'],
        setupFiles: ['tests/renderer/setup.ts']
      } }
    ],
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: 'coverage',
      thresholds
    },
    // Local architectural references are deliberately not part of this
    // project's test suite and may carry their own unresolved workspace deps.
    exclude: ['References-project/**', 'node_modules/**', 'out/**', 'e2e/**', 'dist/**']
  },
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'src/core')
    }
  }
})
