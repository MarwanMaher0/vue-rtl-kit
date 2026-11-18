/* global defineNuxtConfig */
export default defineNuxtConfig({
  modules: ['vue-rtl-kit/nuxt'],
  rtl: {
    locales: { en: 'ltr', ar: 'rtl' },
    defaultLocale: 'fr',
    dir: 'sideways',
  },
  compatibilityDate: '2024-11-01',
})
