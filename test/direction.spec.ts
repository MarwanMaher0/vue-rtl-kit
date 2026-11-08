import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h, nextTick, ref, withDirectives } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { mount } from '@vue/test-utils'
import { BidiText, RtlProvider } from '../src/components'
import { createRtl } from '../src/core'
import { resetDetachedDirection, useDirection, useRtl } from '../src/composables/useDirection'
import { useFormat } from '../src/composables/useFormat'
import { useLogicalStyles } from '../src/composables/useLogicalStyles'
import { vRtl } from '../src/directives/vRtl'
import { directionOfLocale, normaliseLocales, oppositeDirection, resolveDirection } from '../src/locale'

describe('createRtl', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('dir')
    document.documentElement.removeAttribute('lang')
    document.documentElement.className = ''
  })

  it('infers the initial direction from the default locale', () => {
    const rtl = createRtl({ locales: ['en', 'ar'], defaultLocale: 'ar' })
    expect(rtl.dir.value).toBe('rtl')
    expect(rtl.isRtl.value).toBe(true)
    expect(rtl.isLtr.value).toBe(false)
    rtl.dispose()
  })

  it('honours an explicit dir over the locale', () => {
    const rtl = createRtl({ locales: ['ar'], defaultLocale: 'ar', dir: 'ltr' })
    expect(rtl.dir.value).toBe('ltr')
    rtl.dispose()
  })

  it('toggles direction and returns the new value', () => {
    const rtl = createRtl({ defaultLocale: 'en' })
    expect(rtl.dir.value).toBe('ltr')
    expect(rtl.toggleDirection()).toBe('rtl')
    expect(rtl.isRtl.value).toBe(true)
    expect(rtl.toggleDirection()).toBe('ltr')
    rtl.dispose()
  })

  it('follows the locale until the direction is pinned', async () => {
    const rtl = createRtl({ locales: { en: 'ltr', ar: 'rtl' }, defaultLocale: 'en' })
    rtl.setLocale('ar')
    expect(rtl.dir.value).toBe('rtl')

    rtl.setDirection('ltr')
    rtl.setLocale('ar-EG')
    expect(rtl.dir.value).toBe('ltr')
    rtl.dispose()
  })

  it('exposes derived side and sign helpers', () => {
    const rtl = createRtl({ dir: 'rtl' })
    expect(rtl.startSide.value).toBe('right')
    expect(rtl.endSide.value).toBe('left')
    expect(rtl.sign.value).toBe(-1)
    rtl.setDirection('ltr')
    expect(rtl.startSide.value).toBe('left')
    expect(rtl.sign.value).toBe(1)
    rtl.dispose()
  })

  it('syncs document dir and lang', async () => {
    const rtl = createRtl({ locales: ['ar'], defaultLocale: 'ar' })
    await nextTick()
    expect(document.documentElement.getAttribute('dir')).toBe('rtl')
    expect(document.documentElement.getAttribute('lang')).toBe('ar')

    rtl.setDirection('ltr')
    await nextTick()
    expect(document.documentElement.getAttribute('dir')).toBe('ltr')
    rtl.dispose()
  })

  it('toggles html classes when asked', async () => {
    const rtl = createRtl({ dir: 'rtl', htmlClass: true })
    await nextTick()
    expect(document.documentElement.classList.contains('rtl')).toBe(true)
    rtl.toggleDirection()
    await nextTick()
    expect(document.documentElement.classList.contains('ltr')).toBe(true)
    expect(document.documentElement.classList.contains('rtl')).toBe(false)
    rtl.dispose()
  })

  it('does not touch the document when syncDocument is false', async () => {
    const rtl = createRtl({ dir: 'rtl', syncDocument: false })
    await nextTick()
    expect(document.documentElement.getAttribute('dir')).toBeNull()
    rtl.dispose()
  })

  it('stops syncing after dispose', async () => {
    const rtl = createRtl({ dir: 'ltr' })
    await nextTick()
    rtl.dispose()
    rtl.setDirection('rtl')
    await nextTick()
    expect(document.documentElement.getAttribute('dir')).toBe('ltr')
  })

  it('returns html attributes for an SSR shell', () => {
    const rtl = createRtl({ locales: ['ar'], defaultLocale: 'ar-EG' })
    expect(rtl.htmlAttrs()).toEqual({ dir: 'rtl', lang: 'ar-EG' })
    rtl.dispose()
  })
})

describe('useDirection', () => {
  it('reads the app-level store through the plugin', () => {
    const rtl = createRtl({ dir: 'rtl', syncDocument: false })
    const Probe = defineComponent({
      setup() {
        const { dir, isRtl } = useDirection()
        return () => h('i', `${dir.value}:${isRtl.value}`)
      },
    })
    const wrapper = mount(Probe, { global: { plugins: [rtl] } })
    expect(wrapper.text()).toBe('rtl:true')
    rtl.dispose()
  })

  it('falls back to a detached context with no plugin installed', () => {
    const Probe = defineComponent({
      setup() {
        const { dir } = useDirection()
        return () => h('i', dir.value)
      },
    })
    expect(mount(Probe).text()).toBe('ltr')
  })

  it('throws a helpful error from useRtl without the plugin', () => {
    const Probe = defineComponent({
      setup() {
        useRtl()
        return () => h('i')
      },
    })
    expect(() => mount(Probe, { global: { config: { warnHandler: () => {} } } }))
      .toThrow(/useRtl\(\) needs the plugin/)
  })
})

describe('locale helpers', () => {
  const localeCases = [
    ['ar-u-nu-latn', 'rtl'],
    ['he-x-abcd', 'rtl'],
    ['ar-EG-u-nu-latn', 'rtl'],
    ['ar-x-latn', 'rtl'],
    ['ar-a-foo-latn', 'rtl'],
    ['fr-u-attr-arab', 'ltr'],
    ['fr-x-arab', 'ltr'],
    ['ar-Latn-u-nu-arab', 'ltr'],
    ['en-Arab-x-latn', 'rtl'],
    ['ha', 'ltr'],
    ['ku', 'ltr'],
    ['ha-Arab', 'rtl'],
    ['ku-Arab', 'rtl'],
    ['ku-Latn', 'ltr'],
    ['ha_Latn_NG', 'ltr'],
    ['pnb', 'rtl'],
    ['mzn', 'rtl'],
    ['lrc', 'rtl'],
    ['glk', 'rtl'],
    ['bal', 'rtl'],
    ['sdh', 'rtl'],
    ['pnb-Latn', 'ltr'],
    ['fr', 'ltr'],
    ['fr-FR', 'ltr'],
    ['qaa', 'ltr'],
    ['arab', 'ltr'],
    ['de-1996', 'ltr'],
    ['ar-aao-Arab-EG', 'rtl'],
    ['uz-AF-u-nu-latn', 'rtl'],
    ['uz-Latn-AF', 'ltr'],
    ['AR_arab_EG_U_NU_LATN', 'rtl'],
    ['x-arab', 'ltr'],
    ['i-klingon', 'ltr'],
    ['en-GB-oed', 'ltr'],
    ['sgn-BE-FR', 'ltr'],
  ] as const

  it.each(localeCases)('detects %s as %s regardless of fallback', (locale, direction) => {
    for (const fallback of ['ltr', 'rtl'] as const) {
      expect(directionOfLocale(locale, fallback)).toBe(direction)
      expect(resolveDirection(locale, {}, fallback)).toBe(direction)
    }
    expect(normaliseLocales([locale])).toEqual({ [locale]: direction })
  })

  it.each(localeCases)('setLocale(%s) derives %s for an unlisted locale after Arabic', (locale, direction) => {
    const rtl = createRtl({ locales: {}, defaultLocale: 'ar', syncDocument: false })
    try {
      expect(rtl.dir.value).toBe('rtl')
      rtl.setLocale(locale)
      expect(rtl.htmlAttrs()).toEqual({ dir: direction, lang: locale })
      rtl.setLocale('ar')
      expect(rtl.dir.value).toBe('rtl')
    }
    finally {
      rtl.dispose()
    }
  })

  it.each(localeCases)('RtlProvider locale %s derives %s inside an RTL parent', async (locale, direction) => {
    const rtl = createRtl({ locales: {}, defaultLocale: 'ar', syncDocument: false })
    const Probe = defineComponent({
      setup() {
        const scope = useDirection()
        return () => h('i', `${scope.dir.value}:${scope.locale.value}`)
      },
    })
    const wrapper = mount(RtlProvider, {
      props: { locale },
      slots: { default: () => h(Probe) },
      global: { plugins: [rtl] },
    })
    try {
      expect(wrapper.attributes('dir')).toBe(direction)
      expect(wrapper.attributes('lang')).toBe(locale)
      expect(wrapper.text()).toBe(`${direction}:${locale}`)
      await wrapper.setProps({ locale: 'ar' })
      expect(wrapper.attributes('dir')).toBe('rtl')
      await wrapper.setProps({ locale })
      expect(wrapper.attributes('dir')).toBe(direction)
      expect(wrapper.text()).toBe(`${direction}:${locale}`)
      expect(rtl.htmlAttrs()).toEqual({ dir: 'rtl', lang: 'ar' })
    }
    finally {
      wrapper.unmount()
      rtl.dispose()
    }
  })

  it.each([
    undefined,
    null,
    '',
    '   ',
    'a',
    '12',
    'en--US',
    'ar-1234abcde',
    'ar-u',
    'he-x',
    'ar-EG-Latn',
    'fr-Latn-Abcd',
    'en-u-nu-latn-u-ca-gregory',
    'sl-rozaj-rozaj',
  ])('uses the fallback only for an empty or invalid tag: %s', (locale) => {
    expect(directionOfLocale(locale, 'rtl')).toBe('rtl')
    expect(directionOfLocale(locale, 'ltr')).toBe('ltr')
  })

  it('retains explicit locale map overrides and pinned direction', () => {
    expect(resolveDirection('ku-Arab', { ku: 'ltr' }, 'rtl')).toBe('ltr')
    expect(resolveDirection('fr', { fr: 'rtl' })).toBe('rtl')
    expect(resolveDirection('ar-Latn', { ar: 'rtl', 'ar-Latn': 'ltr' })).toBe('ltr')
    const rtl = createRtl({ defaultLocale: 'ar', dir: 'rtl', syncDocument: false })
    try {
      rtl.setLocale('fr')
      expect(rtl.htmlAttrs()).toEqual({ dir: 'rtl', lang: 'fr' })
    }
    finally {
      rtl.dispose()
    }
  })

  it('maps language subtags to directions', () => {
    expect(directionOfLocale('ar-EG')).toBe('rtl')
    expect(directionOfLocale('he')).toBe('rtl')
    expect(directionOfLocale('fa-IR')).toBe('rtl')
    expect(directionOfLocale('en-US')).toBe('ltr')
    expect(directionOfLocale(undefined)).toBe('ltr')
  })

  it('lets the script subtag override the language', () => {
    expect(directionOfLocale('ku-Latn')).toBe('ltr')
    expect(directionOfLocale('az-Arab')).toBe('rtl')
    expect(directionOfLocale('uz-Arab-AF')).toBe('rtl')
  })

  it('resolves a regional tag against a language-keyed map', () => {
    expect(resolveDirection('ar-EG', { ar: 'rtl', en: 'ltr' })).toBe('rtl')
    expect(resolveDirection('de', {})).toBe('ltr')
  })

  it('flips a direction', () => {
    expect(oppositeDirection('rtl')).toBe('ltr')
    expect(oppositeDirection('ltr')).toBe('rtl')
  })
})

describe('hard cases: runtime switching, nesting, hydration, and unmount cleanup', () => {
  beforeEach(() => {
    resetDetachedDirection()
    document.documentElement.removeAttribute('dir')
    document.documentElement.removeAttribute('lang')
    document.documentElement.className = ''
  })

  it('switches direction ltr -> rtl -> ltr across every composable and directive', async () => {
    const rtl = createRtl({
      locales: { en: 'ltr', ar: 'rtl' },
      defaultLocale: 'en',
      htmlClass: true,
    })

    const App = defineComponent({
      setup() {
        const direction = useDirection()
        const root = useRtl()
        const logical = useLogicalStyles()
        const fmt = useFormat()

        return () => h('div', [
          h('span', { class: 'dir' }, `${direction.dir.value}:${direction.isRtl.value}:${direction.isLtr.value}:${direction.startSide.value}:${direction.endSide.value}:${direction.sign.value}`),
          h('span', { class: 'root' }, `${root.dir.value}:${root.locale.value}`),
          h('span', { class: 'logical' }, `${logical.dir.value}:${logical.startSide.value}:${logical.endSide.value}:${logical.sign.value}:${logical.mirror(16)}:${logical.mirror(0)}:${JSON.stringify(logical.toPhysical({ marginInlineStart: '8px', textAlign: 'start' }))}`),
          h('span', { class: 'fmt' }, `${fmt.value.dir}:${fmt.value.locale}:${fmt.value.formatNumber(1234)}`),
          withDirectives(h('div', { class: 'directive' }, 'box'), [[vRtl, direction.dir]]),
        ])
      },
    })

    const wrapper = mount(App, { global: { plugins: [rtl] } })
    await nextTick()

    expect(wrapper.find('.dir').text()).toBe('ltr:false:true:left:right:1')
    expect(wrapper.find('.root').text()).toBe('ltr:en')
    expect(wrapper.find('.logical').text()).toBe('ltr:left:right:1:16:0:{"marginLeft":"8px","textAlign":"left"}')
    expect(wrapper.find('.fmt').text()).toBe('ltr:en:1,234')
    expect(wrapper.find('.directive').attributes('dir')).toBe('ltr')
    expect(document.documentElement.getAttribute('dir')).toBe('ltr')
    expect(document.documentElement.classList.contains('ltr')).toBe(true)

    rtl.setLocale('ar')
    await nextTick()

    expect(wrapper.find('.dir').text()).toBe('rtl:true:false:right:left:-1')
    expect(wrapper.find('.root').text()).toBe('rtl:ar')
    expect(wrapper.find('.logical').text()).toBe('rtl:right:left:-1:-16:0:{"marginRight":"8px","textAlign":"right"}')
    expect(wrapper.find('.fmt').text()).toContain('rtl:ar:')
    expect(wrapper.find('.directive').attributes('dir')).toBe('rtl')
    expect(document.documentElement.getAttribute('dir')).toBe('rtl')
    expect(document.documentElement.classList.contains('rtl')).toBe(true)
    expect(document.documentElement.classList.contains('ltr')).toBe(false)

    rtl.setLocale('en')
    await nextTick()

    expect(wrapper.find('.dir').text()).toBe('ltr:false:true:left:right:1')
    expect(wrapper.find('.root').text()).toBe('ltr:en')
    expect(wrapper.find('.logical').text()).toBe('ltr:left:right:1:16:0:{"marginLeft":"8px","textAlign":"left"}')
    expect(wrapper.find('.fmt').text()).toBe('ltr:en:1,234')
    expect(wrapper.find('.directive').attributes('dir')).toBe('ltr')
    expect(document.documentElement.getAttribute('dir')).toBe('ltr')
    expect(document.documentElement.classList.contains('ltr')).toBe(true)
    expect(document.documentElement.classList.contains('rtl')).toBe(false)

    wrapper.unmount()
  })

  it('maintains independent direction on nested elements while root flips ltr -> rtl -> ltr', async () => {
    const rtl = createRtl({
      locales: { en: 'ltr', ar: 'rtl' },
      defaultLocale: 'en',
      syncDocument: false,
    })

    const ScopeReader = defineComponent({
      props: { id: { type: String, required: true } },
      setup(props) {
        const { dir, startSide, sign } = useDirection()
        const root = useRtl()
        const { toPhysical } = useLogicalStyles()
        const fmt = useFormat()
        return () => h(
          'div',
          { class: props.id },
          `${dir.value}|${startSide.value}|${sign.value}|${Object.keys(toPhysical({ paddingInlineStart: '4px' }))[0]}|${fmt.value.dir}|root:${root.dir.value}`,
        )
      },
    })

    const App = defineComponent({
      setup() {
        return () => h('div', [
          h(ScopeReader, { id: 'root-scope' }),
          h(RtlProvider, { dir: 'rtl' }, () => [
            h(ScopeReader, { id: 'rtl-island' }),
            h(RtlProvider, { dir: 'ltr' }, () => [
              h(ScopeReader, { id: 'nested-ltr-island' }),
            ]),
          ]),
          h(RtlProvider, { dir: 'ltr' }, () => [
            h(ScopeReader, { id: 'ltr-island' }),
          ]),
          h(RtlProvider, {}, () => [
            h(ScopeReader, { id: 'inheriting-island' }),
          ]),
          withDirectives(h('pre', { class: 'pinned-code' }, 'npm test'), [[vRtl, 'ltr']]),
        ])
      },
    })

    const wrapper = mount(App, { global: { plugins: [rtl] } })

    expect(wrapper.find('.root-scope').text()).toBe('ltr|left|1|paddingLeft|ltr|root:ltr')
    expect(wrapper.find('.rtl-island').text()).toBe('rtl|right|-1|paddingRight|rtl|root:ltr')
    expect(wrapper.find('.nested-ltr-island').text()).toBe('ltr|left|1|paddingLeft|ltr|root:ltr')
    expect(wrapper.find('.ltr-island').text()).toBe('ltr|left|1|paddingLeft|ltr|root:ltr')
    expect(wrapper.find('.inheriting-island').text()).toBe('ltr|left|1|paddingLeft|ltr|root:ltr')
    expect(wrapper.find('.pinned-code').attributes('dir')).toBe('ltr')

    rtl.setDirection('rtl')
    await nextTick()

    expect(wrapper.find('.root-scope').text()).toBe('rtl|right|-1|paddingRight|rtl|root:rtl')
    expect(wrapper.find('.rtl-island').text()).toBe('rtl|right|-1|paddingRight|rtl|root:rtl')
    expect(wrapper.find('.nested-ltr-island').text()).toBe('ltr|left|1|paddingLeft|ltr|root:rtl')
    expect(wrapper.find('.ltr-island').text()).toBe('ltr|left|1|paddingLeft|ltr|root:rtl')
    expect(wrapper.find('.inheriting-island').text()).toBe('rtl|right|-1|paddingRight|rtl|root:rtl')
    expect(wrapper.find('.pinned-code').attributes('dir')).toBe('ltr')

    rtl.setDirection('ltr')
    await nextTick()

    expect(wrapper.find('.root-scope').text()).toBe('ltr|left|1|paddingLeft|ltr|root:ltr')
    expect(wrapper.find('.rtl-island').text()).toBe('rtl|right|-1|paddingRight|rtl|root:ltr')
    expect(wrapper.find('.nested-ltr-island').text()).toBe('ltr|left|1|paddingLeft|ltr|root:ltr')
    expect(wrapper.find('.ltr-island').text()).toBe('ltr|left|1|paddingLeft|ltr|root:ltr')
    expect(wrapper.find('.inheriting-island').text()).toBe('ltr|left|1|paddingLeft|ltr|root:ltr')
    expect(wrapper.find('.pinned-code').attributes('dir')).toBe('ltr')

    wrapper.unmount()
  })

  it('hydrates plain Vue SSR output with zero mismatch warnings and supports post-hydration switching', async () => {
    const warnings: string[] = []
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation((msg: unknown) => {
      warnings.push(String(msg))
    })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation((msg: unknown) => {
      warnings.push(String(msg))
    })

    const createSharedApp = (rtl: ReturnType<typeof createRtl>) => {
      const app = createSSRApp(
        defineComponent({
          setup() {
            const { dir, startSide, sign } = useDirection()
            const { toLogical } = useLogicalStyles()
            const fmt = useFormat()
            return () => h('div', { id: 'ssr-root', dir: dir.value }, [
              h('p', { class: 'meta', style: toLogical({ marginLeft: '12px', textAlign: 'left' }) }, `${dir.value}:${startSide.value}:${sign.value}:${fmt.value.formatNumber(2024)}`),
              h(BidiText, { as: 'p', class: 'bidi-el', text: 'آخر تحديث 12-05-2024 عبر api.example.com/v1' }),
              h(BidiText, { as: 'p', class: 'bidi-chars', text: 'الإصدار v1.2.3 متاح', strategy: 'chars' }),
              h(RtlProvider, { dir: 'ltr', tag: 'section' }, () => [
                h('span', { class: 'scoped-ltr' }, 'git checkout -b rtl-hardening'),
                h(BidiText, { as: 'span', class: 'scoped-bidi', text: 'Hello مرحبا world' }),
              ]),
              withDirectives(h('pre', { class: 'dir-directive' }, 'npm run build'), [[vRtl, { dir: 'ltr', isolate: true }]]),
            ])
          },
        }),
      )
      app.config.warnHandler = (msg) => {
        warnings.push(msg)
      }
      app.use(rtl)
      return app
    }

    const ssrRtl = createRtl({
      locales: { en: 'ltr', ar: 'rtl' },
      defaultLocale: 'ar',
      numberingSystem: 'latn',
      syncDocument: false,
    })
    const ssrApp = createSharedApp(ssrRtl)
    const html = await renderToString(ssrApp)
    ssrRtl.dispose()

    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)

    const clientRtl = createRtl({
      locales: { en: 'ltr', ar: 'rtl' },
      defaultLocale: 'ar',
      numberingSystem: 'latn',
      syncDocument: true,
    })
    const clientApp = createSharedApp(clientRtl)
    clientApp.mount(container)
    await nextTick()

    expect(warnings).toEqual([])
    expect(container.querySelector('.meta')?.textContent).toBe('rtl:right:-1:2,024')
    expect(container.querySelector('.bidi-el bdi')?.getAttribute('dir')).toBe('ltr')
    expect(container.querySelector('.scoped-bidi bdi')?.getAttribute('dir')).toBe('rtl')
    expect(container.querySelector('.dir-directive')?.getAttribute('dir')).toBe('ltr')

    clientRtl.setLocale('en')
    await nextTick()
    expect(container.querySelector('.meta')?.textContent).toBe('ltr:left:1:2,024')

    clientRtl.setLocale('ar')
    await nextTick()
    expect(container.querySelector('.meta')?.textContent).toBe('rtl:right:-1:2,024')

    clientApp.unmount()
    container.remove()
    warnSpy.mockRestore()
    errorSpy.mockRestore()
    expect(warnings).toEqual([])
  })

  it('cleans up watchers and DOM state on unmount without leaking', async () => {
    const rtl = createRtl({ locales: { en: 'ltr', ar: 'rtl' }, defaultLocale: 'en', htmlClass: true })
    const dirRef = ref<'ltr' | 'rtl'>('ltr')
    const showChild = ref(true)

    const Child = defineComponent({
      setup() {
        const { dir, startSide } = useDirection()
        const { mirror } = useLogicalStyles()
        const fmt = useFormat()
        return () => h(RtlProvider, { locale: 'ar' }, () => [
          h('span', { class: 'child-state' }, `${dir.value}:${startSide.value}:${mirror(10)}:${fmt.value.locale}`),
          h(BidiText, { text: 'تحديث 12-05-2024' }),
          withDirectives(h('p', { id: 'unmount-target' }, 'code'), [[vRtl, dirRef]]),
        ])
      },
    })

    const Root = defineComponent({
      setup() {
        return () => h('div', [showChild.value ? h(Child) : null])
      },
    })

    const wrapper = mount(Root, { global: { plugins: [rtl] }, attachTo: document.body })
    await nextTick()

    const targetEl = document.getElementById('unmount-target')!
    expect(targetEl.getAttribute('dir')).toBe('ltr')
    expect(document.documentElement.getAttribute('dir')).toBe('ltr')

    showChild.value = false
    await nextTick()

    expect(targetEl.getAttribute('dir')).toBeNull()
    dirRef.value = 'rtl'
    await nextTick()
    expect(targetEl.getAttribute('dir')).toBeNull()

    wrapper.unmount()

    rtl.setDirection('rtl')
    await nextTick()
    expect(document.documentElement.getAttribute('dir')).toBe('ltr')
    expect(document.documentElement.classList.contains('rtl')).toBe(false)
  })

  it('keeps syncing documentElement when one of two apps sharing a store unmounts, and stops after the last app unmounts', async () => {
    const rtl = createRtl({
      locales: { en: 'ltr', ar: 'rtl' },
      defaultLocale: 'en',
      syncDocument: true,
    })

    const AppOne = defineComponent({
      setup() {
        const { dir } = useDirection()
        return () => h('div', { class: 'app-one' }, dir.value)
      },
    })

    const AppTwo = defineComponent({
      setup() {
        const { dir } = useDirection()
        return () => h('div', { class: 'app-two' }, dir.value)
      },
    })

    const wrapperOne = mount(AppOne, { global: { plugins: [rtl] } })
    const wrapperTwo = mount(AppTwo, { global: { plugins: [rtl] } })
    await nextTick()
    expect(document.documentElement.getAttribute('dir')).toBe('ltr')

    wrapperOne.unmount()

    rtl.setLocale('ar')
    await nextTick()
    expect(document.documentElement.getAttribute('dir')).toBe('rtl')
    expect(document.documentElement.getAttribute('lang')).toBe('ar')
    expect(wrapperTwo.text()).toBe('rtl')

    wrapperTwo.unmount()

    rtl.setLocale('en')
    await nextTick()
    expect(document.documentElement.getAttribute('dir')).toBe('rtl')
  })

  it('isolates detached useDirection() fallback per app across createSSRApp renders without the plugin', async () => {
    const FirstApp = createSSRApp(
      defineComponent({
        setup() {
          const { dir, setDirection } = useDirection()
          setDirection('rtl')
          return () => h('div', dir.value)
        },
      }),
    )

    const SecondApp = createSSRApp(
      defineComponent({
        setup() {
          const { dir } = useDirection()
          return () => h('div', dir.value)
        },
      }),
    )

    expect(await renderToString(FirstApp)).toBe('<div>rtl</div>')
    expect(await renderToString(SecondApp)).toBe('<div>ltr</div>')
  })

  it('works outside component setup without Vue inject() warnings', () => {
    const warnings: string[] = []
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation((msg: unknown) => {
      warnings.push(String(msg))
    })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation((msg: unknown) => {
      warnings.push(String(msg))
    })

    const dir = useDirection()
    const logical = useLogicalStyles()
    const fmt = useFormat()

    expect(dir.dir.value).toBe('ltr')
    expect(dir.locale.value).toBe('en')
    expect(logical.startSide.value).toBe('left')
    expect(fmt.value.dir).toBe('ltr')
    expect(fmt.value.formatNumber(42)).toBe('42')

    dir.setDirection('rtl')
    expect(dir.dir.value).toBe('rtl')
    expect(fmt.value.dir).toBe('rtl')
    expect(useDirection()).toBe(dir)

    expect(() => useRtl()).toThrow(/useRtl\(\) needs the plugin/)
    expect(warnings.filter(w => /inject\(\)/.test(w))).toEqual([])
    expect(warnings).toEqual([])

    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('does not leak a detached direction set outside setup into a later app render', async () => {
    const outside = useDirection()
    outside.setDirection('rtl')

    const app = createSSRApp(defineComponent({
      setup() {
        const { dir } = useDirection()
        return () => h('i', dir.value)
      },
    }))
    expect(await renderToString(app)).toBe('<i>ltr</i>')
    expect(outside.dir.value).toBe('rtl')
  })
})
