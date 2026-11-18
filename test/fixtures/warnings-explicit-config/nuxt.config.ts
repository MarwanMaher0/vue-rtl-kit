/* global defineNuxtConfig */
export default defineNuxtConfig({
  modules: ['vue-rtl-kit/nuxt'],
  rtl: {
    locales: ['fa', 'he'],
    defaultLocale: 'en',
  },
  compatibilityDate: '2024-11-01',
})
