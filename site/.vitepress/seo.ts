import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { URL } from 'node:url'
import type { HeadConfig, UserConfig } from 'vitepress'
import { faqs } from './faq'

export const siteBase = '/vue-rtl-kit/'
export const defaultSiteUrl = 'https://marwanmaher0.github.io/vue-rtl-kit/'
const deployment = new URL(process.env.SITE_URL || defaultSiteUrl)
if (!['http:', 'https:'].includes(deployment.protocol) || deployment.username || deployment.password) {
  throw new Error('SITE_URL must be an HTTP(S) deployment URL without credentials')
}
if (deployment.pathname === '/') deployment.pathname = siteBase
if (!deployment.pathname.endsWith('/')) deployment.pathname += '/'
if (deployment.pathname !== siteBase || deployment.search || deployment.hash) {
  throw new Error(`SITE_URL must use the ${siteBase} base without a query or fragment`)
}
export const siteUrl = deployment.href

const metadata: Record<string, { en: [string, string], ar: [string, string] }> = {
  index: {
    en: ['RTL tools for Vue and Nuxt', 'Build bidirectional Vue and Nuxt interfaces with reactive direction, scoped layouts, logical styles, locale formatting, and plain-text isolation.'],
    ar: ['أدوات RTL لتطبيقات Vue وNuxt', 'ابنِ واجهات Vue وNuxt ثنائية الاتجاه بحالة تفاعلية ونطاقات مستقلة وأنماط منطقية وتنسيق حسب اللغة وعزل للنص العادي.'],
  },
  'getting-started': {
    en: ['Getting started with Vue and Nuxt', 'Install the tagged vue-rtl-kit v0.1.1 GitHub release, configure the Vue plugin or Nuxt module, and start switching locale and direction.'],
    ar: ['ابدأ مع Vue وNuxt', 'ثبّت إصدار vue-rtl-kit الموسوم v0.1.1 من GitHub، وأعدّ إضافة Vue أو وحدة Nuxt، وابدأ بتغيير اللغة واتجاه الواجهة.'],
  },
  api: {
    en: ['API reference', 'Explore vue-rtl-kit exports and TypeScript signatures for direction stores, composables, components, bidi utilities, logical styles, and formatting.'],
    ar: ['مرجع الواجهات البرمجية API', 'تعرّف على صادرات vue-rtl-kit وتواقيع TypeScript لمخازن الاتجاه والدوال والمكوّنات وعزل النص والأنماط المنطقية والتنسيق.'],
  },
  'guide/direction-store': {
    en: ['Direction store and pinning', 'Understand reactive RTL/LTR state, locale resolution, direction pinning, document synchronization, SSR attributes, and standalone direction stores.'],
    ar: ['مخزن الاتجاه وتثبيته', 'افهم حالة RTL وLTR التفاعلية وحلّ اللغة وتثبيت الاتجاه ومزامنة المستند وسمات SSR وإنشاء مخزن اتجاه مستقل.'],
  },
  'guide/create-rtl': {
    en: ['createRtl: configure the Vue plugin', 'Configure createRtl options, locale maps, initial direction, document classes, numbering systems, global registration, and store cleanup.'],
    ar: ['إعداد إضافة Vue باستخدام createRtl', 'اضبط خيارات createRtl وخرائط اللغات والاتجاه الأولي وفئات المستند وأنظمة الأرقام والتسجيل العام وتنظيف مخزن الاتجاه.'],
  },
  'guide/use-direction': {
    en: ['useDirection: read and control a scope', 'Read the nearest direction scope with useDirection, update locale or direction, and understand the root store and detached fallback resolution.'],
    ar: ['قراءة نطاق الاتجاه والتحكم به عبر useDirection', 'اقرأ أقرب نطاق اتجاه باستخدام useDirection وغيّر اللغة أو الاتجاه وافهم الرجوع إلى مخزن الجذر أو الحالة المستقلة الافتراضية.'],
  },
  'guide/use-rtl': {
    en: ['useRtl: access the root direction store', 'Access the installed app-level direction store with useRtl, even inside an RtlProvider, and learn when a missing plugin causes an error.'],
    ar: ['الوصول إلى مخزن اتجاه الجذر عبر useRtl', 'استخدم useRtl للوصول إلى مخزن اتجاه التطبيق حتى داخل RtlProvider، وتعرّف على الفرق عن النطاق المحلي والخطأ عند غياب الإضافة.'],
  },
  'guide/use-logical-styles': {
    en: ['useLogicalStyles: direction-aware JavaScript styles', 'Convert logical and physical styles, resolve inline sides, and mirror JavaScript offsets with useLogicalStyles bound to the current direction scope.'],
    ar: ['أنماط JavaScript المتكيفة مع الاتجاه عبر useLogicalStyles', 'حوّل الأنماط المنطقية والمادية وحدّد جانبي البداية والنهاية واعكس إزاحات JavaScript باستخدام useLogicalStyles المرتبطة بالنطاق الحالي.'],
  },
  'guide/use-format': {
    en: ['useFormat: locale-aware numbers, currency, and dates', 'Format numbers, currencies, and dates with scope-aware Intl helpers, numbering-system overrides, optional isolation, and standalone format functions.'],
    ar: ['تنسيق الأرقام والعملات والتواريخ عبر useFormat', 'نسّق الأرقام والعملات والتواريخ بأدوات Intl المرتبطة بلغة النطاق مع تخصيص نظام الأرقام والعزل الاختياري ودوال التنسيق المستقلة.'],
  },
  'guide/bidi-text': {
    en: ['BidiText: isolate mixed-direction plain text', 'Use BidiText for simplified plain-text bidi run isolation with bdi elements or Unicode characters; learn its props, strategies, and rich-markup limits.'],
    ar: ['عزل النص العادي مختلط الاتجاهات عبر BidiText', 'استخدم BidiText لعزل مبسط لمقاطع النص العادي بعناصر bdi أو محارف Unicode، وتعرّف على خصائصه واستراتيجياته وحدوده مع الوسوم الغنية.'],
  },
  'guide/rtl-provider': {
    en: ['RtlProvider: nested direction and locale scopes', 'Create independent RTL or LTR subtrees with RtlProvider, local direction controls, locale inheritance, DOM isolation, and renderless scope options.'],
    ar: ['نطاقات اتجاه ولغة متداخلة عبر RtlProvider', 'أنشئ أجزاء RTL أو LTR مستقلة باستخدام RtlProvider مع تحكم محلي بالاتجاه ووراثة اللغة وعزل DOM وخيار العمل دون عنصر حاوٍ.'],
  },
  'guide/v-rtl': {
    en: ['v-rtl: element direction directive', 'Set element direction with v-rtl arguments, modifiers, or reactive bindings, add Unicode isolation, and preserve SSR attributes and unmount cleanup.'],
    ar: ['تحديد اتجاه العناصر بالتوجيه v-rtl', 'حدّد اتجاه العناصر بمعاملات v-rtl أو معدّلاته أو قيمه التفاعلية، وأضف عزل Unicode مع دعم سمات SSR واستعادة القيم عند الإزالة.'],
  },
  'guide/css-utilities': {
    en: ['CSS utilities for logical RTL and LTR layouts', 'Use optional logical spacing, alignment, border, position, bidi, and directional icon utilities without swapping stylesheets when direction changes.'],
    ar: ['أدوات CSS لتخطيطات RTL وLTR المنطقية', 'استخدم أدوات اختيارية للتباعد والمحاذاة والحدود والمواضع المنطقية وعزل النص والأيقونات الاتجاهية دون تبديل ملف CSS عند تغيير الاتجاه.'],
  },
  'guide/nuxt-module': {
    en: ['Nuxt module: setup, SSR, and options', 'Integrate vue-rtl-kit with Nuxt 3 or 4, configure SSR dir and lang, composable auto-imports, CSS, and component registration with documented caveats.'],
    ar: ['وحدة Nuxt: الإعداد وخيارات SSR', 'ادمج vue-rtl-kit مع Nuxt 3 أو 4 واضبط سمتَي dir وlang في SSR والاستيراد التلقائي وملف CSS وتسجيل المكوّنات مع توضيح حدود الخيارات.'],
  },
}

function routeFor(file: string) {
  return file.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')
}

function absolute(route: string) {
  return new URL(route, siteUrl).href
}

function jsonLd(value: Record<string, unknown>): HeadConfig {
  return ['script', { type: 'application/ld+json' }, JSON.stringify(value).replace(/</g, '\\u003c')]
}

function socialHead(title: string, description: string, canonical: string | null, language: 'en' | 'ar', landing: boolean): HeadConfig[] {
  const image = absolute('og-image.png')
  const head: HeadConfig[] = []
  if (canonical) head.push(['link', { rel: 'canonical', href: canonical }])
  head.push(
    ['meta', { property: 'og:type', content: landing ? 'website' : 'article' }],
    ['meta', { property: 'og:site_name', content: 'vue-rtl-kit' }],
    ['meta', { property: 'og:title', content: title }],
    ['meta', { property: 'og:description', content: description }],
  )
  if (canonical) head.push(['meta', { property: 'og:url', content: canonical }])
  head.push(
    ['meta', { property: 'og:locale', content: language === 'ar' ? 'ar_AR' : 'en_US' }],
    ['meta', { property: 'og:image', content: image }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { property: 'og:image:type', content: 'image/png' }],
    ['meta', { property: 'og:image:alt', content: 'vue-rtl-kit — RTL tools for Vue and Nuxt' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: title }],
    ['meta', { name: 'twitter:description', content: description }],
    ['meta', { name: 'twitter:image', content: image }],
    ['meta', { name: 'twitter:image:alt', content: 'vue-rtl-kit — RTL tools for Vue and Nuxt' }],
  )
  return head
}

export const seo: Pick<UserConfig, 'transformPageData' | 'transformHead' | 'sitemap' | 'buildEnd'> = {
  transformPageData(pageData, { siteConfig }) {
    const file = pageData.relativePath
    const language = file.startsWith('ar/') ? 'ar' : 'en'
    const key = file.replace(/^ar\//, '').replace(/\.md$/, '')
    const defaults = metadata[key]?.[language]
    const title = String(pageData.frontmatter.title || defaults?.[0] || '')
    const description = String(pageData.frontmatter.description || defaults?.[1] || '')
    if (!title || !description) throw new Error(`Missing SEO title or description for ${file}`)
    const fullTitle = title.includes('vue-rtl-kit') ? title : `${title} | vue-rtl-kit`
    pageData.title = fullTitle
    pageData.titleTemplate = false
    pageData.description = description
    pageData.frontmatter.title = title
    pageData.frontmatter.titleTemplate = false
    pageData.frontmatter.description = description
    const canonical = absolute(routeFor(file))
    const landing = key === 'index'
    const head = socialHead(fullTitle, description, canonical, language, landing)
    if (language === 'ar') {
      const font = landing ? 'NotoSansArabic-landing.woff2' : 'NotoSansArabic-arabic.woff2'
      head.unshift(['link', { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '', href: `${siteBase}fonts/${font}` }])
    }
    const englishFile = file.replace(/^ar\//, '')
    const arabicFile = `ar/${englishFile}`
    if (existsSync(resolve(siteConfig.srcDir, englishFile)) && existsSync(resolve(siteConfig.srcDir, arabicFile))) {
      head.push(
        ['link', { rel: 'alternate', hreflang: 'en', href: absolute(routeFor(englishFile)) }],
        ['link', { rel: 'alternate', hreflang: 'ar', href: absolute(routeFor(arabicFile)) }],
        ['link', { rel: 'alternate', hreflang: 'x-default', href: absolute(routeFor(englishFile)) }],
        ['meta', { property: 'og:locale:alternate', content: language === 'ar' ? 'en_US' : 'ar_AR' }],
      )
    }
    if (landing) {
      head.push(jsonLd({
        '@context': 'https://schema.org',
        '@type': 'SoftwareSourceCode',
        '@id': `${canonical}#software`,
        name: 'vue-rtl-kit',
        description,
        url: canonical,
        codeRepository: 'https://github.com/MarwanMaher0/vue-rtl-kit',
        license: 'https://opensource.org/licenses/MIT',
        version: '0.1.1',
        programmingLanguage: ['TypeScript', 'Vue'],
        runtimePlatform: ['Vue 3.3+', 'Nuxt 3', 'Nuxt 4'],
        inLanguage: language,
      }), jsonLd({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        '@id': `${canonical}#faq`,
        url: canonical,
        inLanguage: language,
        mainEntity: faqs[language].map(({ question, answer }) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      }))
    } else {
      head.push(jsonLd({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        '@id': `${canonical}#breadcrumbs`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: language === 'ar' ? 'الرئيسية' : 'Home', item: absolute(language === 'ar' ? 'ar/' : '') },
          { '@type': 'ListItem', position: 2, name: title, item: canonical },
        ],
      }))
    }
    pageData.frontmatter.head = [...(pageData.frontmatter.head || []), ...head]
  },
  transformHead({ page, title, description }) {
    if (page !== '404.md') return
    return [
      ['meta', { name: 'robots', content: 'noindex, follow' }],
      ...socialHead(title, description, null, 'en', false),
    ]
  },
  sitemap: {
    hostname: siteUrl,
    transformItems: items => items.filter(item => !/^404(?:\.html)?$/.test(item.url)).map(item => ({
      ...item,
      url: absolute(item.url),
      links: [
        ...(item.links?.filter(link => link.lang === 'en' || link.lang === 'ar').map(link => ({ ...link, url: absolute(link.url) })) ?? []),
        { lang: 'x-default', url: absolute(item.url.replace(/^\/?ar\//, '')) },
      ],
    })),
  },
  async buildEnd({ outDir }) {
    for (const name of ['robots.txt', 'llms.txt', 'llms-full.txt']) {
      const file = resolve(outDir, name)
      const content = await readFile(file, 'utf8')
      await writeFile(file, content.replaceAll(defaultSiteUrl, siteUrl))
    }
  },
}
