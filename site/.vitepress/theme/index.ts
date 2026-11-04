import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { createRtl } from 'vue-rtl-kit'
import BidiDemo from './components/BidiDemo.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.use(createRtl({
      locales: { en: 'ltr', ar: 'rtl' },
      defaultLocale: 'en',
      syncDocument: false,
    }))
    app.component('BidiDemo', BidiDemo)
  },
} satisfies Theme
