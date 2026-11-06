import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: false },
  modules: ['vue-rtl-kit/nuxt'],
  rtl: {
    locales: { ar: 'rtl', en: 'ltr' },
    defaultLocale: 'ar',
    numberingSystem: { ar: 'arab', en: 'latn' },
  },
  app: {
    head: {
      title: 'vue-rtl-kit · Nuxt starter',
      meta: [
        { name: 'description', content: 'A server-rendered Arabic and English starter with direction-aware text, styles and numbers.' },
      ],
    },
  },
})
