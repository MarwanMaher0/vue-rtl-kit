import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitepress'
import { seo, siteBase } from './seo'

const guide = [
  { text: 'Direction store', link: '/guide/direction-store' },
  { text: 'createRtl', link: '/guide/create-rtl' },
  { text: 'useDirection', link: '/guide/use-direction' },
  { text: 'useRtl', link: '/guide/use-rtl' },
  { text: 'useLogicalStyles', link: '/guide/use-logical-styles' },
  { text: 'useFormat', link: '/guide/use-format' },
  { text: 'BidiText', link: '/guide/bidi-text' },
  { text: 'RtlProvider', link: '/guide/rtl-provider' },
  { text: 'v-rtl directive', link: '/guide/v-rtl' },
  { text: 'CSS utilities', link: '/guide/css-utilities' },
  { text: 'Nuxt module', link: '/guide/nuxt-module' },
]

const arabicGuide = [
  { text: 'مخزن الاتجاه', link: '/ar/guide/direction-store' },
  { text: 'createRtl', link: '/ar/guide/create-rtl' },
  { text: 'useDirection', link: '/ar/guide/use-direction' },
  { text: 'useRtl', link: '/ar/guide/use-rtl' },
  { text: 'useLogicalStyles', link: '/ar/guide/use-logical-styles' },
  { text: 'useFormat', link: '/ar/guide/use-format' },
  { text: 'BidiText', link: '/ar/guide/bidi-text' },
  { text: 'RtlProvider', link: '/ar/guide/rtl-provider' },
  { text: 'التوجيه v-rtl', link: '/ar/guide/v-rtl' },
  { text: 'أدوات CSS', link: '/ar/guide/css-utilities' },
  { text: 'وحدة Nuxt', link: '/ar/guide/nuxt-module' },
]

export default defineConfig({
  ...seo,
  base: siteBase,
  title: 'vue-rtl-kit',
  description: 'Direction state, logical styles, and bidirectional text for Vue and Nuxt.',
  cleanUrls: true,
  markdown: {
    theme: {
      light: 'github-light-high-contrast',
      dark: 'github-dark-high-contrast',
    },
  },
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${siteBase}favicon.svg` }],
    ['link', { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '', href: `${siteBase}fonts/Manrope-latin.woff2` }],
    ['meta', { name: 'theme-color', content: '#f8f8f3', media: '(prefers-color-scheme: light)' }],
    ['meta', { name: 'theme-color', content: '#171c20', media: '(prefers-color-scheme: dark)' }],
  ],
  locales: {
    root: {
      label: 'English',
      lang: 'en',
      dir: 'ltr',
      themeConfig: {
        nav: [
          { text: 'Getting started', link: '/getting-started' },
          { text: 'Guide', link: '/guide/direction-store' },
          { text: 'API', link: '/api' },
        ],
        sidebar: [
          {
            text: 'Introduction',
            items: [
              { text: 'Why vue-rtl-kit?', link: '/' },
              { text: 'Getting started', link: '/getting-started' },
            ],
          },
          { text: 'Guide', items: guide },
          {
            text: 'Reference',
            items: [{ text: 'API reference', link: '/api' }],
          },
        ],
      },
    },
    ar: {
      label: 'العربية',
      lang: 'ar',
      dir: 'rtl',
      title: 'vue-rtl-kit',
      description: 'إدارة الاتجاه والتنسيقات المنطقية والنص ثنائي الاتجاه لـ Vue وNuxt.',
      link: '/ar/',
      themeConfig: {
        nav: [
          { text: 'الرئيسية', link: '/ar/' },
          { text: 'ابدأ الآن', link: '/ar/getting-started' },
          { text: 'الدليل', link: '/ar/guide/direction-store' },
          { text: 'مرجع API', link: '/ar/api' },
        ],
        sidebar: [
          {
            text: 'مقدمة',
            items: [
              { text: 'لماذا vue-rtl-kit؟', link: '/ar/' },
              { text: 'ابدأ الآن', link: '/ar/getting-started' },
            ],
          },
          { text: 'الدليل', items: arabicGuide },
          {
            text: 'المرجع',
            items: [{ text: 'مرجع API', link: '/ar/api' }],
          },
        ],
        outline: { label: 'في هذه الصفحة' },
        docFooter: { prev: 'السابق', next: 'التالي' },
        darkModeSwitchLabel: 'المظهر',
        sidebarMenuLabel: 'القائمة',
        returnToTopLabel: 'العودة إلى الأعلى',
        langMenuLabel: 'تغيير اللغة',
        darkModeSwitchTitle: 'التبديل إلى المظهر الداكن',
        lightModeSwitchTitle: 'التبديل إلى المظهر الفاتح',
        editLink: {
          pattern: 'https://github.com/MarwanMaher0/vue-rtl-kit/edit/main/site/:path',
          text: 'عدّل هذه الصفحة على GitHub',
        },
        footer: {
          message: 'متاح بترخيص MIT.',
          copyright: 'لواجهات تُقرأ بطبيعتها في كل اتجاه.',
        },
      },
    },
  },
  themeConfig: {
    siteTitle: 'vue-rtl-kit',
    socialLinks: [
      { icon: 'github', link: 'https://github.com/MarwanMaher0/vue-rtl-kit' },
    ],
    editLink: {
      pattern: 'https://github.com/MarwanMaher0/vue-rtl-kit/edit/main/site/:path',
      text: 'Edit this page on GitHub',
    },
    search: {
      provider: 'local',
      options: {
        locales: {
          ar: {
            translations: {
              button: {
                buttonText: 'بحث',
                buttonAriaLabel: 'البحث في التوثيق',
              },
              modal: {
                displayDetails: 'عرض التفاصيل',
                resetButtonTitle: 'مسح البحث',
                backButtonTitle: 'إغلاق البحث',
                noResultsText: 'لا توجد نتائج لـ',
                footer: {
                  selectText: 'للاختيار',
                  selectKeyAriaLabel: 'مفتاح الإدخال',
                  navigateText: 'للتنقل',
                  navigateUpKeyAriaLabel: 'السهم إلى الأعلى',
                  navigateDownKeyAriaLabel: 'السهم إلى الأسفل',
                  closeText: 'للإغلاق',
                  closeKeyAriaLabel: 'مفتاح الهروب',
                },
              },
            },
          },
        },
      },
    },
    outline: { level: [2, 3], label: 'On this page' },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Built for interfaces that read naturally in every direction.',
    },
  },
  vite: {
    resolve: {
      alias: [
        {
          find: 'vue-rtl-kit/styles.css',
          replacement: fileURLToPath(new URL('../../src/styles/logical.css', import.meta.url)),
        },
        {
          find: /^vue-rtl-kit$/,
          replacement: fileURLToPath(new URL('../../src/index.ts', import.meta.url)),
        },
      ],
    },
  },
})
