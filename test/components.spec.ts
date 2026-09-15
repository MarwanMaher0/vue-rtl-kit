import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { BidiText, RtlProvider } from '../src/components'
import { useDirection } from '../src/composables/useDirection'
import { createRtl } from '../src/core'
import { LRI, PDI } from '../src/bidi'

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
})
