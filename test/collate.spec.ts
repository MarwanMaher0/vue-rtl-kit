import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { RtlProvider, compareText, createRtl, sortByLocale, useFormat } from '../src'
import type { CompareOptions } from '../src'
import { FORMATTER_CACHE_LIMIT, formatterCacheStats, resetFormatterCaches } from '../src/format'

const arabicNames = ['تامر', 'احمد', 'آدم', 'باسم', 'إبراهيم', 'انتصار', 'أحمد', 'ابراهيم', 'ادم'] as const
const namesByLocale = {
  ar: ['آدم', 'إبراهيم', 'ابراهيم', 'أحمد', 'احمد', 'ادم', 'انتصار', 'باسم', 'تامر'],
  fa: ['آدم', 'ابراهيم', 'احمد', 'ادم', 'انتصار', 'إبراهيم', 'أحمد', 'باسم', 'تامر'],
  en: ['آدم', 'أحمد', 'إبراهيم', 'ابراهيم', 'احمد', 'ادم', 'انتصار', 'باسم', 'تامر'],
}

const collatorSpy = () => {
  const Collator = Intl.Collator
  return vi.spyOn(Intl, 'Collator').mockImplementation(function (
    locales?: Intl.LocalesArgument,
    options?: Intl.CollatorOptions,
  ) {
    return new Collator(locales, options)
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  resetFormatterCaches()
})

describe('compareText', () => {
  it.each(Object.entries(namesByLocale))('sorts Arabic names with plain alef, hamza, and madda in %s', (locale, expected) => {
    for (const ignoreDiacritics of [true, false]) {
      expect(sortByLocale(arabicNames, { locale, ignoreDiacritics })).toEqual(expected)
    }
    expect(sortByLocale(arabicNames, { locale })).toEqual(expected)
    expect(compareText('احمد', 'أحمد', { locale })).not.toBe(0)
    expect(compareText('ابراهيم', 'إبراهيم', { locale })).not.toBe(0)
    expect(compareText('ادم', 'آدم', { locale })).not.toBe(0)
    // The same letter written as a base plus a combining hamza or madda still ties.
    for (const name of ['أحمد', 'إبراهيم', 'آدم']) {
      expect(compareText(name, name.normalize('NFD'), { locale })).toBe(0)
    }
  })

  it.each(['ar', 'fa', 'en'])('ignores core harakat and tatweel in %s by default', (locale) => {
    expect(compareText('مُحَـمَّدٌ', 'محمد', { locale })).toBe(0)
    expect(compareText('مُحَمَّدٌ', 'محمد', { locale, ignoreDiacritics: false })).not.toBe(0)
    expect(compareText('هٰذا', 'هذا', { locale })).toBe(0)
  })

  it('preserves Hebrew niqqud in collation', () => {
    expect(sortByLocale(['תמר', 'בָּרוּךְ', 'אברהם', 'ברוך'], { locale: 'he' }))
      .toEqual(['אברהם', 'ברוך', 'בָּרוּךְ', 'תמר'])
  })

  it('defaults to English and honors the first supported locale in an ordered list', () => {
    expect(compareText('ع', 'a')).toBeGreaterThan(0)
    expect(compareText('ع', 'a', { locale: 'ar' })).toBeLessThan(0)
    expect(compareText('ع', 'a', { locale: ['zz-ZZ', 'ar', 'en'] })).toBeLessThan(0)
    expect(compareText('ع', 'a', { locale: ['zz-ZZ', 'en', 'ar'] })).toBeGreaterThan(0)
    expect(compareText('ع', 'a', { locale: [] })).toBeGreaterThan(0)
  })

  it('keeps valid locale preferences when another tag is malformed', () => {
    expect(compareText('ع', 'a', { locale: ['@', 'ar_EG', 'en'] })).toBeLessThan(0)
    expect(compareText('ع', 'a', { locale: 'ar-!!' })).toBeLessThan(0)
    expect(compareText('ع', 'a', { locale: '@' })).toBeGreaterThan(0)
  })

  it('preserves Latin case and accents, with optional case priority', () => {
    for (const ignoreDiacritics of [true, false]) {
      const options = { locale: 'en', ignoreDiacritics }
      expect(compareText('a', 'A', options)).toBeLessThan(0)
      expect(compareText('e', 'é', options)).toBeLessThan(0)
      expect(compareText('e', 'é', { ...options, caseFirst: 'upper' })).toBeLessThan(0)
      expect(compareText('A', 'a', { ...options, caseFirst: 'upper' })).toBeLessThan(0)
      expect(compareText('A', 'a', { ...options, caseFirst: 'lower' })).toBeGreaterThan(0)
    }
  })

  it('compares runs containing Western, Arabic-Indic, and Persian digits numerically by default', () => {
    expect(compareText('ملف 1٢۳', 'ملف 123')).toBe(0)
    // Ignoring the decoration must join the digit run before numeric collation.
    expect(compareText('ملف ١ـَ0', 'ملف 10', { locale: 'ar' })).toBe(0)
    expect(compareText('ملف ١ـَ0', 'ملف 10', { locale: 'ar', ignoreDiacritics: false })).not.toBe(0)
    expect(compareText('ملف ۲', 'ملف ١0')).toBeLessThan(0)
    expect(compareText('ملف ۲', 'ملف ١0', { numeric: false })).toBeGreaterThan(0)
    expect(compareText('ملف ۲', 'ملف ١0', { direction: 'desc' })).toBeGreaterThan(0)
    expect(sortByLocale(['ملف 10', 'ملف ۲', 'ملف ١', 'ملف 2']))
      .toEqual(['ملف ١', 'ملف ۲', 'ملف 2', 'ملف 10'])
  })
})

describe('sortByLocale', () => {
  it('stably sorts a fresh array without mutating its input or changing item identities', () => {
    const first = Object.freeze({ id: 1, name: 'تامر' })
    const second = Object.freeze({ id: 2, name: 'بَاسِم' })
    const third = Object.freeze({ id: 3, name: 'بـاسم' })
    const empty = Object.freeze({ id: 4, name: '' })
    const items = Object.freeze([first, second, third, empty])
    const key = vi.fn((item: (typeof items)[number]) => item.name)

    const sorted = sortByLocale(items, { locale: 'ar', key })
    expect(sorted).not.toBe(items)
    expect(sorted).toEqual([empty, second, third, first])
    expect(sorted[1]).toBe(second)
    expect(key.mock.calls.map(([item]) => item)).toEqual(items)

    key.mockClear()
    expect(sortByLocale(items, { locale: 'ar', key, direction: 'desc' })).toEqual([empty, first, second, third])
    expect(key.mock.calls.map(([item]) => item)).toEqual(items)
    expect(items.map(item => item.id)).toEqual([1, 2, 3, 4])
  })

  it('returns a fresh empty array and reads a singleton key exactly once', () => {
    const empty: readonly string[] = Object.freeze([])
    const key = vi.fn((item: string) => item)
    const result = sortByLocale(empty, { key })
    expect(result).toEqual([])
    expect(result).not.toBe(empty)
    expect(key).not.toHaveBeenCalled()
    expect(sortByLocale(['بيت'], { key })).toEqual(['بيت'])
    expect(key).toHaveBeenCalledOnce()
  })

  it.each(['asc', 'desc'] as const)('puts only actual empty strings first in %s', (direction) => {
    const options = { direction }
    expect(compareText('', 'ب', options)).toBeLessThan(0)
    expect(compareText('ب', '', options)).toBeGreaterThan(0)
    expect(compareText('', '', options)).toBe(0)
    expect(compareText('', 'ـ', options)).toBeLessThan(0)
    expect(sortByLocale(['ب', 'ـ', ''], options)).toEqual(direction === 'asc' ? ['', 'ـ', 'ب'] : ['', 'ب', 'ـ'])
  })

  it.each([null, undefined])('rejects a %s input or key in development, even for one item', (missing) => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(() => compareText(missing as never, '')).toThrow(TypeError)
    expect(() => compareText('', missing as never)).toThrow(TypeError)
    expect(() => sortByLocale([missing])).toThrow(TypeError)
    expect(() => sortByLocale([{ name: missing }], { key: item => item.name as never })).toThrow(TypeError)
  })

  it.each(['asc', 'desc'] as const)('keeps missing values and keys last and stable in production (%s)', (direction) => {
    vi.stubEnv('NODE_ENV', 'production')
    const options = { direction }
    expect(compareText(null as never, '', options)).toBeGreaterThan(0)
    expect(compareText('', undefined as never, options)).toBeLessThan(0)
    expect(compareText(null as never, undefined as never, options)).toBe(0)
    const present = direction === 'asc' ? ['a', 'z'] : ['z', 'a']
    expect(sortByLocale([null, 'z', undefined, '', 'a'], options)).toEqual(['', ...present, null, undefined])

    const items = [
      { id: 1, label: undefined },
      { id: 2, label: 'z' },
      { id: 3, label: null },
      { id: 4, label: '' },
      { id: 5, label: 'a' },
    ]
    expect(sortByLocale(items, { ...options, key: item => item.label as string }).map(item => item.id))
      .toEqual(direction === 'asc' ? [4, 5, 2, 1, 3] : [4, 2, 5, 1, 3])
  })
})

describe('collator cache', () => {
  it('shares the collator regardless of decoration stripping, direction, or key', () => {
    const ctor = collatorSpy()
    compareText('a', 'b')
    compareText('b', 'a', { locale: 'en', numeric: true, ignoreDiacritics: true, caseFirst: 'false' })
    expect(compareText('مُحَمَّد', 'محمد')).toBe(0)
    expect(compareText('مُحَمَّد', 'محمد', { ignoreDiacritics: false })).not.toBe(0)
    sortByLocale([{ name: 'a' }, { name: 'b' }], { direction: 'desc', key: item => item.name })
    sortByLocale(['b', 'a'], { direction: 'asc', ignoreDiacritics: false })
    expect(ctor).toHaveBeenCalledTimes(1)
    expect(formatterCacheStats().collator).toBe(1)

    for (const options of [
      { locale: 'ar' },
      { numeric: false },
      { caseFirst: 'upper' },
      { caseFirst: 'lower' },
      { locale: ['ar', 'fa'] },
      { locale: ['fa', 'ar'] },
    ] satisfies CompareOptions[]) {
      compareText('a', 'b', options)
      compareText('a', 'b', { ...options, direction: 'desc', ignoreDiacritics: false })
    }
    expect(formatterCacheStats().collator).toBe(7)
    expect(ctor).toHaveBeenCalledTimes(7)

    resetFormatterCaches()
    expect(formatterCacheStats().collator).toBe(0)
    compareText('a', 'b')
    expect(ctor).toHaveBeenCalledTimes(8)
  })

  it('bounds the cache, refreshing recency on hits before evicting the oldest entry', () => {
    const ctor = collatorSpy()
    const locales = Array.from({ length: FORMATTER_CACHE_LIMIT + 1 }, (_, i) => `en-x-coll${i}`)
    for (const locale of locales.slice(0, -1)) compareText('a', 'b', { locale })
    expect(ctor).toHaveBeenCalledTimes(FORMATTER_CACHE_LIMIT)
    expect(formatterCacheStats().collator).toBe(FORMATTER_CACHE_LIMIT)

    compareText('a', 'b', { locale: locales[0]! })
    expect(ctor).toHaveBeenCalledTimes(FORMATTER_CACHE_LIMIT)
    compareText('a', 'b', { locale: locales.at(-1)! })
    expect(ctor).toHaveBeenCalledTimes(FORMATTER_CACHE_LIMIT + 1)
    expect(formatterCacheStats().collator).toBe(FORMATTER_CACHE_LIMIT)

    ctor.mockClear()
    compareText('a', 'b', { locale: locales[0]! })
    expect(ctor).not.toHaveBeenCalled()
    compareText('a', 'b', { locale: locales[1]! })
    expect(ctor).toHaveBeenCalledOnce()
  })
})

describe('useFormat collation', () => {
  it('follows the current locale and the nearest RtlProvider, and accepts a per-call locale override', () => {
    const rtl = createRtl({ syncDocument: false, locales: ['en', 'ar'], defaultLocale: 'en' })
    let root: ReturnType<typeof useFormat> | undefined
    let scoped: ReturnType<typeof useFormat> | undefined
    const Probe = defineComponent({
      setup() {
        scoped = useFormat()
        return () => h('i')
      },
    })
    const wrapper = mount(defineComponent({
      setup() {
        root = useFormat()
        return () => h(RtlProvider, { locale: 'ar' }, () => h(Probe))
      },
    }), { global: { plugins: [rtl] } })

    try {
      expect(root!.value.compareText('ع', 'a')).toBeGreaterThan(0)
      expect(root!.value.sortByLocale(['ع', 'a'])).toEqual(['a', 'ع'])
      expect(scoped!.value.compareText('ع', 'a')).toBeLessThan(0)
      expect(scoped!.value.sortByLocale(['a', 'ع'])).toEqual(['ع', 'a'])
      expect(scoped!.value.compareText('ع', 'a', { locale: ['zz-ZZ', 'en'] })).toBeGreaterThan(0)
      expect(scoped!.value.sortByLocale([{ name: 'ع' }, { name: 'a' }], { locale: 'en', key: item => item.name }))
        .toEqual([{ name: 'a' }, { name: 'ع' }])

      rtl.setLocale('ar')
      expect(root!.value.compareText('ع', 'a')).toBeLessThan(0)
      expect(root!.value.sortByLocale(['a', 'ع'])).toEqual(['ع', 'a'])
    }
    finally {
      wrapper.unmount()
      rtl.dispose()
    }
  })
})
