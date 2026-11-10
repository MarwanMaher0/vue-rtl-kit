import { createApp } from 'vue'
import { createRtl } from 'vue-rtl-kit'
import App from './App.vue'

createApp(App)
  .use(createRtl({ locales: { en: 'ltr', ar: 'rtl' }, defaultLocale: 'ar' }))
  .mount('#app')
