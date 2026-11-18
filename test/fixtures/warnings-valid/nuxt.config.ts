/* global defineNuxtConfig */
export default defineNuxtConfig({
  modules: ['vue-rtl-kit/nuxt'],
  rtl: {
    locales: { ar: 'rtl', en: 'ltr' },
    defaultLocale: 'ar-EG',
  },
  compatibilityDate: '2024-11-01',
})
