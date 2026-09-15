import { createApp } from 'vue'
import { createRtl } from 'vue-rtl-kit'
import 'vue-rtl-kit/styles.css'
import './styles.css'
import App from './App.vue'

const rtl = createRtl({
  locales: { 'en-GB': 'ltr', 'ar-EG': 'rtl', 'he-IL': 'rtl' },
  defaultLocale: 'ar-EG',
  htmlClass: true,
})

createApp(App).use(rtl).mount('#app')
