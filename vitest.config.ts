import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'coverage'
    },
    // Local architectural references are deliberately not part of this
    // project's test suite and may carry their own unresolved workspace deps.
    exclude: ['References-project/**', 'node_modules/**', 'out/**']
  },
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'src/core')
    }
  }
})
