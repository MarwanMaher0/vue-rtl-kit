import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      vue: 'vue/dist/vue.esm-bundler.js',
    },
  },
  test: {
    globals: true,
    include: ['test/browser/**/*.browser.ts'],
    browser: {
      enabled: true,
      provider: 'playwright',
      name: 'chromium',
      headless: true,
      screenshotFailures: false,
    },
  },
})
