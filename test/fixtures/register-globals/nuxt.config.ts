/* global defineNuxtConfig */
export default defineNuxtConfig({
  modules: ['vue-rtl-kit/nuxt'],
  rtl: {
    locales: { en: 'ltr', ar: 'rtl' },
    defaultLocale: 'ar',
    registerGlobals: false,
  },
  compatibilityDate: '2024-11-01',
})
