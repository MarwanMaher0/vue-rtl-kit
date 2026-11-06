// @vitest-environment node
/**
 * These run with no `window` and no `document`. Anything that reaches for the
 * DOM at import time, at `createRtl()` time, or during render fails here - which
 * is the point: an RTL app that only gets its direction after hydration shows a
 * frame of LTR first, and that frame is very visible.
 */
import { describe, expect, it } from 'vitest'
import { createSSRApp, defineComponent, h, withDirectives } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { BidiText, RtlProvider } from '../src/components'
import { useDirection, useRtl } from '../src/composables/useDirection'
import { useFormat } from '../src/composables/useFormat'
import { useLogicalStyles } from '../src/composables/useLogicalStyles'
import { createRtl } from '../src/core'
import { vRtl } from '../src/directives/vRtl'
import { isClient, isServer } from '../src/env'
import { isolateRuns } from '../src/bidi'

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

  it('renders BidiText isolates on the server', async () => {
    const app = createSSRApp(
      defineComponent({
        render: () => h(BidiText, { text: 'آخر تحديث 12-05-2024', dir: 'rtl', as: 'p' }),
      }),
    )
    const html = await renderToString(app)
    expect(html).toContain('<bdi dir="ltr">12-05-2024</bdi>')
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
    expect(isolateRuns('تم في 12-05-2024', 'rtl')).toBe('تم في ⁦12-05-2024⁩')
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
})
