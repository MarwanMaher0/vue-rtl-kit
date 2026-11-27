// @vitest-environment node
/**
 * These run with no `window` and no `document`. Anything that reaches for the
 * DOM at import time, at `createRtl()` time, or during render fails here - which
 * is the point: an RTL app that only gets its direction after hydration shows a
 * frame of LTR first, and that frame is very visible.
 */
import { describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h, ref, withDirectives } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { BidiText, RtlProvider } from '../src/components'
import { useDirection, useRtl } from '../src/composables/useDirection'
import { useFormat } from '../src/composables/useFormat'
import { useInlineScroll } from '../src/composables/useInlineScroll'
import { compareText, digitsDirective, resolvePlacement, sortByLocale, toLogicalPlacement, useLogicalPlacement, vDigits } from '../src'
import { useLogicalStyles } from '../src/composables/useLogicalStyles'
import { createRtl } from '../src/core'
import { vRtl } from '../src/directives/vRtl'
import { isClient, isServer } from '../src/env'
import { LRI, PDI, isolateRuns } from '../src/bidi'
import { logicalArrow } from '../src/logical'
import {
  getScrollInline,
  getScrollInlineMax,
  scrollByInline,
  scrollInlineEdges,
  scrollToInline,
} from '../src/scroll'
import { findSearchMatches, foldSearchText, matchesSearch } from '../src/search'
import { truncateText } from '../src/truncate'
import { formatDuration } from '../src/duration'
import { formatDateRange, formatNumberRange, formatPlural } from '../src/format'
import { formatPhone, normalizePhone, validatePhone } from '../src/phone'

describe('SSR environment', () => {
  it('reports a server environment', () => {
    expect(typeof document).toBe('undefined')
    expect(isClient).toBe(false)
    expect(isServer).toBe(true)
  })

  it('creates the store without touching the DOM', () => {
    const rtl = createRtl({ locales: ['ar'], defaultLocale: 'ar' })
    expect(rtl.dir.value).toBe('rtl')
    expect(rtl.htmlAttrs()).toEqual({ dir: 'rtl', lang: 'ar' })
    rtl.dispose()
  })

  it('survives a direction change with no document', () => {
    const rtl = createRtl({ dir: 'ltr' })
    expect(() => rtl.toggleDirection()).not.toThrow()
    expect(rtl.dir.value).toBe('rtl')
    rtl.dispose()
  })

  it('renders the direction into the server HTML', async () => {
    const rtl = createRtl({ locales: ['ar'], defaultLocale: 'ar' })
    const app = createSSRApp(
      defineComponent({
        setup() {
          const { dir, startSide } = useDirection()
          return () => h('main', { dir: dir.value }, startSide.value)
        },
      }),
    )
    app.use(rtl)
    expect(await renderToString(app)).toBe('<main dir="rtl">right</main>')
    rtl.dispose()
  })

  it('renders BidiText isolates on the server and strips embedded bidi controls', async () => {
    const app = createSSRApp(
      defineComponent({
        render: () => h(BidiText, { text: 'آخر تحديث \u202E12-05-2024\u202C', dir: 'rtl', as: 'p' }),
      }),
    )
    const html = await renderToString(app)
    expect(html).toContain('<bdi dir="ltr">12-05-2024</bdi>')
    expect(html).not.toMatch(/\p{Bidi_Control}/u)
  })

  it('renders RtlProvider scopes on the server', async () => {
    const app = createSSRApp(
      defineComponent({
        render: () => h(RtlProvider, { dir: 'ltr', tag: 'pre' }, () => 'npm i vue-rtl-kit'),
      }),
    )
    const html = await renderToString(app)
    expect(html).toContain('dir="ltr"')
    expect(html).toContain('unicode-bidi:isolate')
  })

  it('renders the v-rtl directive into the server HTML', async () => {
    const app = createSSRApp(
      defineComponent({
        render: () =>
          withDirectives(h('pre', 'npm i vue-rtl-kit'), [[vRtl, undefined, 'ltr', { isolate: true }]]),
      }),
    )
    const html = await renderToString(app)
    expect(html).toContain('dir="ltr"')
    expect(html).toContain('unicode-bidi:isolate')
  })

  it('imports v-digits without a DOM and leaves the server-rendered value alone', async () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')
    expect(vDigits).toBeDefined()
    expect(digitsDirective).toBe(vDigits)

    const app = createSSRApp({
      render: () => withDirectives(h('input', { value: '٠۱۲' }), [[vDigits]]),
    })
    expect(await renderToString(app)).toBe('<input value="٠۱۲">')
  })

  it('isolates text identically on server and client', () => {
    expect(isolateRuns('تم في 12-05-2024', 'rtl')).toBe(`تم في ${LRI}12-05-2024${PDI}`)
    expect(logicalArrow('ArrowRight', 'rtl')).toBe('previous')
    expect(logicalArrow('ArrowRight', 'ltr')).toBe('next')
  })

  it('switches ltr -> rtl -> ltr across all composables, providers, and directives with no window or document', async () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')

    const rtl = createRtl({
      locales: { en: 'ltr', ar: 'rtl' },
      defaultLocale: 'en',
      numberingSystem: 'latn',
      syncDocument: true,
      htmlClass: true,
    })

    const renderSnapshot = async () => {
      const app = createSSRApp(
        defineComponent({
          setup() {
            const { dir, startSide, sign } = useDirection()
            const root = useRtl()
            const { mirror, toPhysical } = useLogicalStyles()
            const fmt = useFormat()
            return () => h('div', { 'data-root': root.dir.value }, [
              h('span', { class: 'main' }, `${dir.value}:${startSide.value}:${sign.value}:${mirror(10)}:${Object.keys(toPhysical({ marginInlineStart: '4px' }))[0]}:${fmt.value.formatNumber(1000)}`),
              h(RtlProvider, { dir: 'ltr', tag: 'aside' }, () => [
                h(
                  defineComponent({
                    setup() {
                      const inner = useDirection()
                      return () => h('span', { class: 'nested' }, `${inner.dir.value}:${inner.startSide.value}`)
                    },
                  }),
                ),
              ]),
              withDirectives(h('code', 'v1.0.0'), [[vRtl, dir]]),
            ])
          },
        }),
      )
      app.use(rtl)
      return renderToString(app)
    }

    const ltrHtml = await renderSnapshot()
    expect(ltrHtml).toContain('data-root="ltr"')
    expect(ltrHtml).toContain('ltr:left:1:10:marginLeft:1,000')
    expect(ltrHtml).toContain('ltr:left')
    expect(ltrHtml).toContain('<code dir="ltr">v1.0.0</code>')

    rtl.setLocale('ar')
    const rtlHtml = await renderSnapshot()
    expect(rtlHtml).toContain('data-root="rtl"')
    expect(rtlHtml).toContain('rtl:right:-1:-10:marginRight:1,000')
    expect(rtlHtml).toContain('ltr:left')
    expect(rtlHtml).toContain('<code dir="rtl">v1.0.0</code>')

    rtl.setLocale('en')
    const backToLtrHtml = await renderSnapshot()
    expect(backToLtrHtml).toBe(ltrHtml)

    rtl.dispose()
  })

  it('isolates detached useDirection() fallback across createSSRApp renders without the plugin', async () => {
    const appOne = createSSRApp(
      defineComponent({
        setup() {
          const { dir, setDirection } = useDirection()
          setDirection('rtl')
          return () => h('main', { dir: dir.value }, dir.value)
        },
      }),
    )

    const appTwo = createSSRApp(
      defineComponent({
        setup() {
          const { dir } = useDirection()
          return () => h('main', { dir: dir.value }, dir.value)
        },
      }),
    )

    expect(await renderToString(appOne)).toBe('<main dir="rtl">rtl</main>')
    expect(await renderToString(appTwo)).toBe('<main dir="ltr">ltr</main>')
  })

  it('imports and resolves placements without window or document', async () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')
    expect(resolvePlacement('inline-end-start', 'rtl')).toBe('left-start')
    expect(toLogicalPlacement('top-end', 'rtl')).toBe('top-start')

    const Probe = defineComponent({
      setup() {
        const anchor = ref<HTMLElement | null>(null)
        const withTarget = useLogicalPlacement('inline-start', anchor)
        const withoutTarget = useLogicalPlacement('bottom-start')
        return () => h('button', {
          ref: anchor,
          'data-anchor-placement': withTarget.value,
          'data-scope-placement': withoutTarget.value,
        }, 'مساعدة')
      },
    })
    const app = createSSRApp({ render: () => h(RtlProvider, { dir: 'rtl' }, () => h(Probe)) })
    expect(await renderToString(app)).toContain(
      '<button data-anchor-placement="right" data-scope-placement="bottom-end">مساعدة</button>',
    )
  })

  it('keeps inline scroll helpers and useInlineScroll SSR-safe with no window or document', async () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')

    const stub = { scrollLeft: -120, scrollWidth: 500, clientWidth: 200 } as unknown as Element
    expect(getScrollInline(null)).toBe(0)
    expect(getScrollInline(stub)).toBe(0)
    expect(getScrollInlineMax(null)).toBe(0)
    expect(getScrollInlineMax(stub)).toBe(0)
    expect(scrollInlineEdges(null)).toEqual({ atStart: true, atEnd: true })
    expect(scrollInlineEdges(stub)).toEqual({ atStart: true, atEnd: true })
    expect(() => {
      scrollToInline(null, 50)
      scrollToInline(stub, 50, { behavior: 'smooth' })
      scrollByInline(null, 20)
      scrollByInline(stub, 20)
    }).not.toThrow()

    const rtl = createRtl({ locales: ['en', 'ar'], defaultLocale: 'ar' })
    const app = createSSRApp(
      defineComponent({
        setup() {
          const track = ref<HTMLElement | null>(null)
          const { offset, max, atStart, atEnd, scrollTo, scrollBy, scrollToStart, scrollToEnd } = useInlineScroll(track)
          scrollTo(100)
          scrollBy(50)
          scrollToStart()
          scrollToEnd()
          return () => h('div', { ref: track }, `${offset.value}:${max.value}:${atStart.value}:${atEnd.value}`)
        },
      }),
    )
    app.use(rtl)
    expect(await renderToString(app)).toBe('<div>0:0:true:true</div>')
    rtl.dispose()
  })

  it('folds, matches, and highlights RTL search queries on the server with no window or document', async () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')

    const text = 'مرحبا مُحَمَّدٌ في القاهرة ١٢٣'
    expect(foldSearchText(text)).toBe('مرحبا محمد في القاهره 123')
    expect(matchesSearch(text, 'محمد في القاهره 123')).toBe(true)
    expect(matchesSearch(null, 'محمد')).toBe(false)
    expect(findSearchMatches(null, 'محمد')).toEqual([])

    const ranges = findSearchMatches(text, 'محمد')
    expect(ranges).toEqual([{ start: 6, end: 15 }])

    const app = createSSRApp(
      defineComponent({
        render() {
          const children: Array<string | ReturnType<typeof h>> = []
          let cursor = 0
          for (const { start, end } of ranges) {
            if (start > cursor) children.push(text.slice(cursor, start))
            children.push(h('mark', text.slice(start, end)))
            cursor = end
          }
          if (cursor < text.length) children.push(text.slice(cursor))
          return h('p', { dir: 'rtl' }, children)
        },
      }),
    )
    expect(await renderToString(app)).toBe('<p dir="rtl">مرحبا <mark>مُحَمَّدٌ</mark> في القاهرة ١٢٣</p>')
  })

  it('renders locale-aware sorted labels on the server without a DOM', async () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')

    const labels = ['بَيْت ١0', 'أَحْمَد', 'بَيْت ۲', 'Alice'] as const
    expect(compareText('بَيْت ۲', 'بَيْت ١0', { locale: 'ar' })).toBeLessThan(0)
    expect(sortByLocale(labels, { locale: 'ar' })).toEqual(['أَحْمَد', 'بَيْت ۲', 'بَيْت ١0', 'Alice'])

    const rtl = createRtl({ locales: ['ar', 'en'], defaultLocale: 'ar' })
    const root = defineComponent({
      setup() {
        const fmt = useFormat()
        return () => h('ul', { dir: fmt.value.dir, lang: fmt.value.locale },
          fmt.value.sortByLocale(labels).map(label => h('li', { key: label }, label)),
        )
      },
    })

    try {
      expect(await renderToString(createSSRApp(root).use(rtl)))
        .toBe('<ul dir="rtl" lang="ar"><li>أَحْمَد</li><li>بَيْت ۲</li><li>بَيْت ١0</li><li>Alice</li></ul>')
      rtl.setLocale('en')
      expect(await renderToString(createSSRApp(root).use(rtl)))
        .toBe('<ul dir="ltr" lang="en"><li>Alice</li><li>أَحْمَد</li><li>بَيْت ۲</li><li>بَيْت ١0</li></ul>')
    }
    finally {
      rtl.dispose()
    }
  })

  it('selects Arabic plural categories on the server with no window or document', async () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')

    const files = {
      zero: 'لا ملفات',
      one: 'ملف واحد',
      two: 'ملفان',
      few: '{count} ملفات',
      many: '{count} ملفًا',
      other: '{count} ملف',
    }
    expect(formatPlural(0, files, { locale: 'ar' })).toBe('لا ملفات')
    expect(formatPlural(1, files, { locale: 'ar' })).toBe('ملف واحد')
    expect(formatPlural(2, files, { locale: 'ar' })).toBe('ملفان')
    expect(formatPlural(3, files, { locale: 'ar' })).toBe('3 ملفات')
    expect(formatPlural(11, files, { locale: 'ar' })).toBe('11 ملفًا')
    expect(formatPlural(100, files, { locale: 'ar' })).toBe('100 ملف')
    expect(formatPlural(3, files, { locale: 'ar-EG' })).toBe('٣ ملفات')
    expect(formatPlural(NaN, files, { locale: 'en' })).toBe('NaN ملف')
    expect(formatPlural(1, { other: '' }, { locale: 'ar' })).toBe('')

    const rtl = createRtl({ locales: { en: 'ltr', ar: 'rtl' }, defaultLocale: 'ar', numberingSystem: 'latn' })
    const app = createSSRApp(
      defineComponent({
        setup() {
          const { dir } = useDirection()
          const fmt = useFormat()
          return () => h('p', { dir: dir.value }, fmt.value.formatPlural(11, files))
        },
      }),
    )
    app.use(rtl)
    expect(await renderToString(app)).toBe('<p dir="rtl">11 ملفًا</p>')
    rtl.dispose()
  })

  it('renders Arabic date and price ranges on the server with no window or document', async () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')

    const dateOptions = { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' } as const
    expect(formatDateRange('2024-03-03', '2024-03-05', { ...dateOptions, locale: 'ar' })).toBe('3–5 مارس 2024')
    expect(formatNumberRange(100, 250, { locale: 'ar', numberingSystem: 'latn' })).toBe('100–250')

    const rtl = createRtl({ locales: { en: 'ltr', ar: 'rtl' }, defaultLocale: 'ar', numberingSystem: 'latn' })
    const app = createSSRApp(
      defineComponent({
        setup() {
          const { dir } = useDirection()
          const fmt = useFormat()
          return () => h('p', { dir: dir.value }, [
            fmt.value.formatDateRange('2024-03-03', '2024-03-05', dateOptions),
            ' | ',
            fmt.value.formatNumberRange(100, 250, { style: 'currency', currency: 'EGP' }),
          ].join(''))
        },
      }),
    )
    app.use(rtl)
    expect(await renderToString(app)).toBe('<p dir="rtl">3–5 مارس 2024 | \u200F100.00–250.00\u00A0ج.م.\u200F</p>')
    rtl.dispose()
  })

  it('renders bound display names on the server with no window or document', async () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')

    const rtl = createRtl({ locales: { en: 'ltr', ar: 'rtl' }, defaultLocale: 'ar' })
    const renderPicker = async () => {
      const app = createSSRApp(
        defineComponent({
          setup() {
            const { dir } = useDirection()
            const fmt = useFormat()
            return () => h(
              'p',
              { dir: dir.value },
              `${fmt.value.formatDisplayName('ar', { type: 'language' })} / ${fmt.value.formatDisplayName('EG', { type: 'region' })} / ${fmt.value.formatDisplayName('en', { type: 'language', locale: 'en' })}`,
            )
          },
        }),
      )
      app.use(rtl)
      return renderToString(app)
    }

    expect(await renderPicker()).toBe('<p dir="rtl">العربية / مصر / English</p>')
    rtl.setLocale('en')
    expect(await renderPicker()).toBe('<p dir="ltr">Arabic / Egypt / English</p>')
    rtl.dispose()
  })
})

describe('truncateText on the server', () => {
  it('truncates by grapheme clusters with no window or document', () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')
    expect(truncateText('مُحَمَّدٌ عَبْدُ اللَّهِ', 5)).toBe('مُحَمَّدٌ\u2026')
    expect(truncateText('مرحبا بالعالم يا أصدقاء', 8, { unit: 'word' })).toBe('مرحبا\u2026')
    expect(truncateText('שָׁלוֹם עֲלֵיכֶם', 5)).toBe('שָׁלוֹם\u2026')
  })

  it('renders an isolated truncated title inside an LTR shell on the server', async () => {
    const title = truncateText('الإصدار v1.2.3 متاح الآن للجميع', 12, { unit: 'word', isolate: true })
    const app = createSSRApp(
      defineComponent({
        setup() {
          return () => h('div', { dir: 'ltr', class: 'card' }, [h('h3', { title }, title)])
        },
      }),
    )
    const html = await renderToString(app)
    expect(html).toContain('\u2068الإصدار\u2026\u2069')
    expect(html).toContain('dir="ltr"')
  })
})

describe('formatDuration on the server', () => {
  it('formats durations with no window or document', () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')
    expect(formatDuration({ hours: 2, minutes: 3 }, { locale: 'ar', numberingSystem: 'latn' })).toBe('ساعتان و3 دقائق')
    expect(formatDuration({ hours: 11, minutes: 2 }, { locale: 'ar-EG', numberingSystem: 'arab' })).toBe('١١ ساعة ودقيقتان')
    expect(formatDuration(3_723_000, { locale: 'ar-SA', numberingSystem: 'arab', style: 'digital' })).toBe('١:٠٢:٠٣')
    expect(formatDuration(0, { locale: 'fa' })).toBe('۰ ثانیه')
    expect(formatDuration({ hours: 2 }, { locale: 'he' })).toBe('שעתיים')
  })

  it('renders the same duration into the server HTML of an RTL card on every request', async () => {
    const render = () => renderToString(createSSRApp(
      defineComponent({
        setup() {
          const length = formatDuration(5_531_000, { locale: 'ar-EG', numberingSystem: 'arab', maxUnits: 2 })
          const time = formatDuration(5_531_000, { locale: 'ar-EG', numberingSystem: 'arab', style: 'digital' })
          return () => h('article', { dir: 'rtl', lang: 'ar', class: 'card' }, [
            h('p', { class: 'length' }, length),
            h('time', { class: 'time' }, time),
          ])
        },
      }),
    ))
    const html = await render()
    expect(html).toBe(
      '<article dir="rtl" lang="ar" class="card"><p class="length">ساعة و٣٢ دقيقة</p><time class="time">١:٣٢:١١</time></article>',
    )
    // The formatter cache is shared between requests and must not change the output.
    expect(await render()).toBe(html)
  })

  it('returns an empty string for invalid input in a production server render', () => {
    vi.stubEnv('NODE_ENV', 'production')
    try {
      expect(formatDuration(Number.NaN, { locale: 'ar' })).toBe('')
    }
    finally {
      vi.unstubAllEnvs()
    }
    expect(() => formatDuration(Number.NaN, { locale: 'ar' })).toThrow(TypeError)
  })
})

describe('phone helpers on the server', () => {
  it('normalizes, validates, and formats phone numbers with no window or document', () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')

    expect(normalizePhone('٠٥٠ ١٢٣ ٤٥٦٧', { defaultRegion: 'SA' })).toBe('+966501234567')
    expect(normalizePhone('0020 (0)10-1234-5678')).toBe('+201012345678')
    expect(validatePhone('۰۷۹ ۱۲۳ ۴۵۶۷', { regions: ['JO'], mobileOnly: true })).toEqual({
      valid: true,
      e164: '+962791234567',
      region: 'JO',
      type: 'mobile',
    })
    expect(formatPhone('+966501234567', { locale: 'ar-EG' })).toBe(`${LRI}+٩٦٦ ٥٠ ١٢٣ ٤٥٦٧${PDI}`)
    expect(formatPhone('+201012345678', { locale: 'ar', numberingSystem: 'latn', isolate: false })).toBe('+20 10 1234 5678')
  })

  it('renders an isolated formatted phone number into server HTML on every request', async () => {
    const render = () => renderToString(createSSRApp(
      defineComponent({
        setup() {
          const e164 = normalizePhone('٠٠٩٦٦ ٥٠ ١٢٣ ٤٥٦٧')
          const display = formatPhone(e164, { locale: 'ar-EG', numberingSystem: 'arab' })
          return () => h('p', { dir: 'rtl', lang: 'ar' }, `للتواصل: ${display}`)
        },
      }),
    ))
    const html = await render()
    expect(html).toBe(`<p dir="rtl" lang="ar">للتواصل: ${LRI}+٩٦٦ ٥٠ ١٢٣ ٤٥٦٧${PDI}</p>`)
    expect(await render()).toBe(html)
  })
})
