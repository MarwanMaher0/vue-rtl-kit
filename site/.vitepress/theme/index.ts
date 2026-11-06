import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme-without-fonts'
import { createRtl } from 'vue-rtl-kit'
import Layout from './Layout.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.use(createRtl({
      locales: { en: 'ltr', ar: 'rtl' },
      defaultLocale: 'en',
      syncDocument: false,
    }))
  },
} satisfies Theme
