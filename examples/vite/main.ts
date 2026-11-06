import { createApp } from 'vue'
import { createRtl } from 'vue-rtl-kit'
import 'vue-rtl-kit/styles.css'
import App from './App.vue'

const rtl = createRtl({
  locales: { ar: 'rtl', en: 'ltr' },
  defaultLocale: 'ar',
  numberingSystem: { ar: 'arab', en: 'latn' },
})

createApp(App).use(rtl).mount('#app')
