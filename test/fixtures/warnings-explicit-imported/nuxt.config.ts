/* global defineNuxtConfig */
import rtl from 'vue-rtl-kit/nuxt'

export default defineNuxtConfig({
  modules: [[rtl, { locales: ['fa', 'he'], defaultLocale: 'en' }]],
  compatibilityDate: '2024-11-01',
})
