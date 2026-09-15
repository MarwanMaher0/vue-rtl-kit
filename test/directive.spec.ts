import { describe, expect, it } from 'vitest'
import { defineComponent, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { vRtl } from '../src/directives/vRtl'
import { createRtl } from '../src/core'

const global = { directives: { rtl: vRtl } }

describe('v-rtl', () => {
  it('defaults to rtl with no value', () => {
    const wrapper = mount({ template: `<p v-rtl>x</p>` }, { global })
    expect(wrapper.attributes('dir')).toBe('rtl')
  })

  it('takes a direction from the argument', () => {
    const wrapper = mount({ template: `<pre v-rtl:ltr>npm i</pre>` }, { global })
    expect(wrapper.attributes('dir')).toBe('ltr')
  })

  it('takes a direction from a modifier', () => {
    expect(mount({ template: `<p v-rtl.ltr>x</p>` }, { global }).attributes('dir')).toBe('ltr')
    expect(mount({ template: `<p v-rtl.auto>x</p>` }, { global }).attributes('dir')).toBe('auto')
  })

  it('takes a direction from the bound value', () => {
    const wrapper = mount({ template: `<p v-rtl="'ltr'">x</p>` }, { global })
    expect(wrapper.attributes('dir')).toBe('ltr')
  })

  it('accepts an object value with an isolate flag', () => {
    const wrapper = mount(
      { template: `<p v-rtl="{ dir: 'ltr', isolate: true }">x</p>` },
      { global },
    )
    expect(wrapper.attributes('dir')).toBe('ltr')
    expect(wrapper.attributes('style')).toContain('isolate')
  })

  it('applies unicode-bidi with the isolate modifier', () => {
    const wrapper = mount({ template: `<p v-rtl.ltr.isolate>x</p>` }, { global })
    expect(wrapper.attributes('style')).toContain('unicode-bidi: isolate')
  })

  it('reacts to a changing bound value', async () => {
    const dir = ref<'rtl' | 'ltr'>('ltr')
    const wrapper = mount(
      defineComponent({
        setup: () => ({ dir }),
        template: `<p v-rtl="dir">x</p>`,
      }),
      { global },
    )
    expect(wrapper.attributes('dir')).toBe('ltr')
    dir.value = 'rtl'
    await wrapper.vm.$nextTick()
    expect(wrapper.attributes('dir')).toBe('rtl')
  })

  it('removes the attribute it added on unbind', async () => {
    const show = ref(true)
    const wrapper = mount(
      defineComponent({
        setup: () => ({ show }),
        template: `<div><p id="t" v-if="show" v-rtl:ltr>x</p></div>`,
      }),
      { global, attachTo: document.body },
    )
    const el = document.getElementById('t')!
    expect(el.getAttribute('dir')).toBe('ltr')

    show.value = false
    await wrapper.vm.$nextTick()
    expect(el.getAttribute('dir')).toBeNull()
    wrapper.unmount()
  })

  it('restores a pre-existing dir attribute on unbind', async () => {
    const show = ref(true)
    const wrapper = mount(
      defineComponent({
        setup: () => ({ show }),
        template: `<div><p id="t2" v-if="show" dir="rtl" v-rtl:ltr>x</p></div>`,
      }),
      { global, attachTo: document.body },
    )
    const el = document.getElementById('t2')!
    expect(el.getAttribute('dir')).toBe('ltr')

    show.value = false
    await wrapper.vm.$nextTick()
    expect(el.getAttribute('dir')).toBe('rtl')
    wrapper.unmount()
  })

  it('is registered globally by the plugin', () => {
    const rtl = createRtl({ syncDocument: false })
    const wrapper = mount({ template: `<p v-rtl:ltr>x</p>` }, { global: { plugins: [rtl] } })
    expect(wrapper.attributes('dir')).toBe('ltr')
    rtl.dispose()
  })

  it('provides SSR props', () => {
    expect(vRtl.getSSRProps!({ value: 'ltr', modifiers: {}, oldValue: null, arg: undefined, instance: null, dir: {} } as never, null as never))
      .toEqual({ dir: 'ltr' })
    expect(vRtl.getSSRProps!({ value: undefined, modifiers: { isolate: true }, oldValue: null, arg: 'ltr', instance: null, dir: {} } as never, null as never))
      .toEqual({ dir: 'ltr', style: { 'unicode-bidi': 'isolate' } })
  })
})
