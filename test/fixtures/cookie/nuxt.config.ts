/* global defineNuxtConfig */
export default defineNuxtConfig({
  modules: ['vue-rtl-kit/nuxt'],
  rtl: {
    locales: { en: 'ltr', ar: 'rtl' },
    defaultLocale: 'en',
    cookie: { name: 'fixture-rtl', maxAge: 3600, sameSite: 'lax' },
  },
  compatibilityDate: '2024-11-01',
})
