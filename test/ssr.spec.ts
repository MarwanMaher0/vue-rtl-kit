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
import { useDirection } from '../src/composables/useDirection'
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
})
