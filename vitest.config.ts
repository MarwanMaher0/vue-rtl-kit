import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['test/**/*.spec.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/nuxt/**'],
      thresholds: {
        statements: 96.99,
        branches: 94.06,
        functions: 96.7,
        lines: 96.99,
      },
    },
  },
})
