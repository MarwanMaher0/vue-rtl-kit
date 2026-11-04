/* global defineNuxtConfig */
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

export default defineNuxtConfig({
  modules: [resolve(root, 'src/nuxt/module.ts')],
  alias: {
    'vue-rtl-kit/styles.css': resolve(root, 'src/styles/logical.css'),
    'vue-rtl-kit': resolve(root, 'src/index.ts'),
  },
  rtl: {
    locales: { en: 'ltr', ar: 'rtl' },
    defaultLocale: 'ar',
  },
  compatibilityDate: '2024-11-01',
})