import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createRtl } from '../src/core'
import { useDirection, useRtl } from '../src/composables/useDirection'
import { directionOfLocale, oppositeDirection, resolveDirection } from '../src/locale'

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
