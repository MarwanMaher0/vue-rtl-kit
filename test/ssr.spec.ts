// @vitest-environment node
/**
 * These run with no `window` and no `document`. Anything that reaches for the
 * DOM at import time, at `createRtl()` time, or during render fails here - which
 * is the point: an RTL app that only gets its direction after hydration shows a
 * frame of LTR first, and that frame is very visible.
 */
import { describe, expect, it } from 'vitest'
import { createSSRApp, defineComponent, h, ref, withDirectives } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { BidiText, RtlProvider } from '../src/components'
import { useDirection, useRtl } from '../src/composables/useDirection'
import { useFormat } from '../src/composables/useFormat'
import { useInlineScroll } from '../src/composables/useInlineScroll'
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
})
