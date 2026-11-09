import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { BidiText, RtlProvider } from '../src/components'
import { useDirection } from '../src/composables/useDirection'
import { createRtl } from '../src/core'
import { LRI, PDI, RLI } from '../src/bidi'

const ARABIC_WITH_DATE = 'آخر تحديث 12-05-2024'

describe('BidiText', () => {
  it('wraps the reordering run in a <bdi> element', () => {
    const wrapper = mount(BidiText, { props: { text: ARABIC_WITH_DATE, dir: 'rtl' } })
    const bdi = wrapper.findAll('bdi')
    expect(bdi).toHaveLength(1)
    expect(bdi[0]!.text()).toBe('12-05-2024')
    expect(bdi[0]!.attributes('dir')).toBe('ltr')
  })

  it('preserves the full text content', () => {
    const wrapper = mount(BidiText, { props: { text: ARABIC_WITH_DATE, dir: 'rtl' } })
    expect(wrapper.text()).toBe(ARABIC_WITH_DATE)
  })

  it('merges adjacent plain runs into one text node so SSR output hydrates on Vue 3.3', () => {
    const wrapper = mount(BidiText, {
      props: { text: 'آخر تحديث 12-05-2024 عبر api.example.com/v1', dir: 'rtl' },
    })
    const nodes = Array.from(wrapper.element.childNodes) as ChildNode[]
    const kinds = nodes.map(node => (node.nodeType === Node.TEXT_NODE ? 'text' : (node as Element).tagName.toLowerCase()))
    expect(kinds).toEqual(['text', 'bdi', 'text', 'bdi'])
    expect(nodes[0]!.textContent).toBe('آخر تحديث ')
    expect(nodes[2]!.textContent).toBe(' عبر ')
    for (let i = 1; i < kinds.length; i++) {
      expect(kinds[i] === 'text' && kinds[i - 1] === 'text').toBe(false)
    }
  })

  it('emits Unicode isolates with the chars strategy', () => {
    const wrapper = mount(BidiText, {
      props: { text: ARABIC_WITH_DATE, dir: 'rtl', strategy: 'chars' },
    })
    expect(wrapper.find('bdi').exists()).toBe(false)
    expect(wrapper.text()).toBe(`آخر تحديث ${LRI}12-05-2024${PDI}`)
  })

  it('renders raw text when disabled, for a before/after comparison', () => {
    const wrapper = mount(BidiText, {
      props: { text: ARABIC_WITH_DATE, dir: 'rtl', enabled: false },
    })
    expect(wrapper.find('bdi').exists()).toBe(false)
    expect(wrapper.text()).toBe(ARABIC_WITH_DATE)
  })

  it('renders a custom tag', () => {
    const wrapper = mount(BidiText, { props: { text: 'abc', as: 'p' } })
    expect(wrapper.element.tagName).toBe('P')
  })

  it('takes its text from the default slot', () => {
    const wrapper = mount(BidiText, {
      props: { dir: 'rtl' },
      slots: { default: () => ARABIC_WITH_DATE },
    })
    expect(wrapper.findAll('bdi')).toHaveLength(1)
  })

  it('passes markup slots through untouched', () => {
    const wrapper = mount(BidiText, {
      props: { dir: 'rtl' },
      slots: { default: () => h('strong', 'مرحبا 12-05-2024') },
    })
    expect(wrapper.find('strong').exists()).toBe(true)
    expect(wrapper.find('bdi').exists()).toBe(false)
  })

  it('detects the base direction with dir="auto"', () => {
    const wrapper = mount(BidiText, { props: { text: ARABIC_WITH_DATE, dir: 'auto' } })
    expect(wrapper.attributes('dir')).toBe('auto')
    expect(wrapper.findAll('bdi')).toHaveLength(1)
  })

  it('inherits the base direction from the surrounding scope', async () => {
    const rtl = createRtl({ dir: 'ltr', syncDocument: false })
    const wrapper = mount(BidiText, {
      props: { text: 'The word مرحبا means hello' },
      global: { plugins: [rtl] },
    })
    expect(wrapper.findAll('bdi')[0]!.attributes('dir')).toBe('rtl')

    rtl.setDirection('rtl')
    await nextTick()
    // With an RTL base the Arabic no longer needs isolating; the Latin does.
    expect(wrapper.findAll('bdi')[0]!.attributes('dir')).toBe('ltr')
    rtl.dispose()
  })

  it('switches BidiText runs accurately on ltr -> rtl -> ltr transitions without warnings', async () => {
    const warnings: string[] = []
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation((msg: unknown) => {
      warnings.push(String(msg))
    })

    const rtl = createRtl({ dir: 'ltr', syncDocument: false })
    const dynamicText = ref('Version مرحبا 12-05-2024')
    const wrapper = mount(
      defineComponent({
        setup() {
          return () => h('div', [
            h(BidiText, { class: 'el-mode' }, () => dynamicText.value),
            h(BidiText, { class: 'char-mode', strategy: 'chars' }, () => dynamicText.value),
          ])
        },
      }),
      { global: { plugins: [rtl] } },
    )

    expect(wrapper.findAll('.el-mode bdi')).toHaveLength(1)
    expect(wrapper.find('.el-mode bdi').attributes('dir')).toBe('rtl')
    expect(wrapper.find('.el-mode bdi').text()).toBe('مرحبا')
    expect(wrapper.find('.char-mode').text()).toBe(`Version ${RLI}مرحبا${PDI} 12-05-2024`)

    rtl.setDirection('rtl')
    await nextTick()

    expect(wrapper.findAll('.el-mode bdi')).toHaveLength(2)
    expect(wrapper.findAll('.el-mode bdi')[0]!.attributes('dir')).toBe('ltr')
    expect(wrapper.findAll('.el-mode bdi')[0]!.text()).toBe('Version')
    expect(wrapper.findAll('.el-mode bdi')[1]!.attributes('dir')).toBe('ltr')
    expect(wrapper.findAll('.el-mode bdi')[1]!.text()).toBe('12-05-2024')
    expect(wrapper.find('.char-mode').text()).toBe(`${LRI}Version${PDI} مرحبا ${LRI}12-05-2024${PDI}`)

    rtl.setDirection('ltr')
    await nextTick()

    expect(wrapper.findAll('.el-mode bdi')).toHaveLength(1)
    expect(wrapper.find('.el-mode bdi').attributes('dir')).toBe('rtl')
    expect(wrapper.find('.el-mode bdi').text()).toBe('مرحبا')

    wrapper.unmount()
    rtl.dispose()
    warnSpy.mockRestore()
    expect(warnings).toEqual([])
  })
})

describe('RtlProvider', () => {
  const Probe = defineComponent({
    name: 'Probe',
    setup() {
      const { dir, isRtl, startSide } = useDirection()
      return () => h('i', `${dir.value}|${isRtl.value}|${startSide.value}`)
    },
  })

  it('scopes a subtree to its own direction', () => {
    const rtl = createRtl({ dir: 'rtl', syncDocument: false })
    const wrapper = mount(
      defineComponent({
        components: { RtlProvider, Probe },
        template: `<div><Probe class="outer" /><RtlProvider dir="ltr"><Probe class="inner" /></RtlProvider></div>`,
      }),
      { global: { plugins: [rtl] } },
    )
    expect(wrapper.find('.outer').text()).toBe('rtl|true|right')
    expect(wrapper.find('.inner').text()).toBe('ltr|false|left')
    rtl.dispose()
  })

  it('renders the dir attribute and an isolate', () => {
    const wrapper = mount(RtlProvider, { props: { dir: 'ltr' }, slots: { default: () => 'x' } })
    expect(wrapper.attributes('dir')).toBe('ltr')
    expect(wrapper.attributes('style')).toContain('isolate')
  })

  it('derives its direction from a locale prop', () => {
    const wrapper = mount(RtlProvider, { props: { locale: 'ar' }, slots: { default: () => 'x' } })
    expect(wrapper.attributes('dir')).toBe('rtl')
    expect(wrapper.attributes('lang')).toBe('ar')
  })

  it('keeps a scope toggle local to the scope', async () => {
    const rtl = createRtl({ dir: 'rtl', syncDocument: false })
    const wrapper = mount(
      defineComponent({
        components: { RtlProvider, Probe },
        template: `
          <div>
            <Probe class="outer" />
            <RtlProvider dir="ltr" v-slot="{ toggleDirection }">
              <button @click="toggleDirection()">flip</button>
              <Probe class="inner" />
            </RtlProvider>
          </div>`,
      }),
      { global: { plugins: [rtl] } },
    )

    await wrapper.find('button').trigger('click')
    expect(wrapper.find('.inner').text()).toBe('rtl|true|right')
    expect(wrapper.find('.outer').text()).toBe('rtl|true|right')
    expect(rtl.dir.value).toBe('rtl')
    rtl.dispose()
  })

  it('follows the parent when neither dir nor locale is given', async () => {
    const rtl = createRtl({ dir: 'ltr', syncDocument: false })
    const wrapper = mount(
      defineComponent({
        components: { RtlProvider, Probe },
        template: `<RtlProvider><Probe class="inner" /></RtlProvider>`,
      }),
      { global: { plugins: [rtl] } },
    )
    expect(wrapper.find('.inner').text()).toBe('ltr|false|left')
    rtl.setDirection('rtl')
    await nextTick()
    expect(wrapper.find('.inner').text()).toBe('rtl|true|right')
    rtl.dispose()
  })

  it('renders without a wrapper element when tag is null', () => {
    const wrapper = mount(RtlProvider, {
      props: { tag: null },
      slots: { default: () => h('span', { class: 'bare' }, 'x') },
    })
    expect(wrapper.find('[data-rtl-scope]').exists()).toBe(false)
    expect(wrapper.find('.bare').exists()).toBe(true)
  })

  it('nests scopes', () => {
    const rtl = createRtl({ dir: 'rtl', syncDocument: false })
    const wrapper = mount(
      defineComponent({
        components: { RtlProvider, Probe },
        template: `
          <RtlProvider dir="ltr">
            <RtlProvider dir="rtl"><Probe class="deep" /></RtlProvider>
          </RtlProvider>`,
      }),
      { global: { plugins: [rtl] } },
    )
    expect(wrapper.find('.deep').text()).toBe('rtl|true|right')
    rtl.dispose()
  })

  it('allows setLocale inside an unpinned RtlProvider to update direction and respects root custom locales', async () => {
    const rtl = createRtl({
      locales: { 'en': 'ltr', 'custom-rtl': 'rtl' },
      defaultLocale: 'en',
      syncDocument: false,
    })

    const ScopeControl = defineComponent({
      setup() {
        const { dir, locale, setLocale } = useDirection()
        return () => h('button', { onClick: () => setLocale(locale.value === 'en' ? 'custom-rtl' : 'en') }, `${dir.value}:${locale.value}`)
      },
    })

    const wrapper = mount(
      defineComponent({
        setup() {
          return () => h(RtlProvider, { locale: 'en' }, () => [h(ScopeControl)])
        },
      }),
      { global: { plugins: [rtl] } },
    )

    expect(wrapper.find('button').text()).toBe('ltr:en')
    expect(wrapper.attributes('dir')).toBe('ltr')

    await wrapper.find('button').trigger('click')
    expect(wrapper.find('button').text()).toBe('rtl:custom-rtl')
    expect(wrapper.attributes('dir')).toBe('rtl')
    expect(wrapper.attributes('lang')).toBe('custom-rtl')
    expect(rtl.dir.value).toBe('ltr')

    await wrapper.find('button').trigger('click')
    expect(wrapper.find('button').text()).toBe('ltr:en')
    expect(wrapper.attributes('dir')).toBe('ltr')

    wrapper.unmount()
    rtl.dispose()
  })

  it('reacts when dynamic dir and locale props are set and cleared', async () => {
    const rtl = createRtl({ locales: { en: 'ltr', ar: 'rtl' }, defaultLocale: 'en', syncDocument: false })
    const propDir = ref<'ltr' | 'rtl' | undefined>('rtl')
    const propLocale = ref<string | undefined>(undefined)

    const wrapper = mount(
      defineComponent({
        setup() {
          return () => h(RtlProvider, { dir: propDir.value, locale: propLocale.value }, () => [h(Probe, { class: 'inner' })])
        },
      }),
      { global: { plugins: [rtl] } },
    )

    expect(wrapper.find('.inner').text()).toBe('rtl|true|right')
    propDir.value = undefined
    await nextTick()
    expect(wrapper.find('.inner').text()).toBe('ltr|false|left')

    propLocale.value = 'ar'
    await nextTick()
    expect(wrapper.find('.inner').text()).toBe('rtl|true|right')

    propLocale.value = undefined
    await nextTick()
    expect(wrapper.find('.inner').text()).toBe('ltr|false|left')

    wrapper.unmount()
    rtl.dispose()
  })
})
