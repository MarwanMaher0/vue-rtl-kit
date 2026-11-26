import { afterEach, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createRtl, useFormat } from '../../src'
import { attachHost, removeHosts } from './hosts'

afterEach(removeHosts)

it('renders a locale-sorted RTL list in Chromium and updates the order when the locale switches', async () => {
  const entries = [
    { id: 1, label: 'تَمْر' },
    { id: 2, label: 'بَيْت ١0' },
    { id: 3, label: 'Alice' },
    { id: 4, label: 'بَيْت ۲' },
  ] as const
  const rtl = createRtl({ locales: ['ar', 'en'], defaultLocale: 'ar', syncDocument: false })
  const wrapper = mount(defineComponent({
    setup() {
      const format = useFormat()
      return () => {
        const { dir, locale, sortByLocale } = format.value
        return h('ol', { dir, lang: locale }, sortByLocale(entries, { key: entry => entry.label })
          .map(({ id, label }) => h('li', { key: id }, label)))
      }
    },
  }), { attachTo: attachHost(document.createElement('div')), global: { plugins: [rtl] } })

  try {
    expect(getComputedStyle(wrapper.element).direction).toBe('rtl')
    expect(wrapper.findAll('li').map(({ element }) => element.textContent))
      .toEqual(['بَيْت ۲', 'بَيْت ١0', 'تَمْر', 'Alice'])

    const tops = wrapper.findAll('li').map(({ element }) => element.getBoundingClientRect().top)
    expect(tops).toEqual([...tops].sort((a, b) => a - b))
    expect(new Set(tops).size).toBe(entries.length)

    rtl.setLocale('en')
    await nextTick()
    expect(getComputedStyle(wrapper.element).direction).toBe('ltr')
    expect(wrapper.findAll('li').map(({ element }) => element.textContent))
      .toEqual(['Alice', 'بَيْت ۲', 'بَيْت ١0', 'تَمْر'])
  }
  finally {
    wrapper.unmount()
    rtl.dispose()
  }
})
