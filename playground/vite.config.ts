import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const root = resolve(import.meta.dirname, '..')

export default defineConfig({
  root: resolve(root, 'playground'),
  plugins: [vue()],
  resolve: {
    alias: {
      'vue-rtl-kit/styles.css': resolve(root, 'src/styles/logical.css'),
      'vue-rtl-kit': resolve(root, 'src/index.ts'),
    },
  },
  build: {
    outDir: resolve(root, 'playground/dist'),
    emptyOutDir: true,
  },
  server: { port: 5178 },
})
