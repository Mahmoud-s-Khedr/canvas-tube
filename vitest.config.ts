import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
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
