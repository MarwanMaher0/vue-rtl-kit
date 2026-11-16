import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import {
  FORMATTER_CACHE_LIMIT,
  formatCurrency,
  formatDate,
  formatNumber,
  formatterCacheStats,
  resetFormatterCaches,
  transliterateDigits,
  withNumberingSystem,
} from '../src/format'
import { useFormat } from '../src/composables/useFormat'
import { createRtl } from '../src/core'
import { RtlProvider } from '../src/components/RtlProvider'
import { LRI, PDI } from '../src/bidi'

const ARABIC_INDIC = /[٠-٩]/

describe('withNumberingSystem', () => {
  it.each([
    { locale: 'ar-EG', numberingSystem: 'latn', expected: 'ar-EG-u-nu-latn' },
    { locale: 'ar-EG-u-ca-gregory', numberingSystem: 'latn', expected: 'ar-EG-u-ca-gregory-nu-latn' },
    { locale: 'ar-EG-u-nu-arab', numberingSystem: 'latn', expected: 'ar-EG-u-nu-arab' },
    { locale: 'en-x-foo', numberingSystem: 'arab', expected: 'en-u-nu-arab-x-foo' },
    { locale: 'en-u-ca-gregory-x-foo', numberingSystem: 'arab', expected: 'en-u-ca-gregory-nu-arab-x-foo' },
    { locale: 'en-x-u-nu-latn', numberingSystem: 'arab', expected: 'en-u-nu-arab-x-u-nu-latn' },
    { locale: 'en-US-X-foo', numberingSystem: 'arab', expected: 'en-US-u-nu-arab-X-foo' },
    { locale: 'en-US-U-NU-latn-X-foo', numberingSystem: 'arab', expected: 'en-US-U-NU-latn-X-foo' },
    { locale: 'ar_EG', numberingSystem: 'latn', expected: 'ar-EG-u-nu-latn' },
    { locale: 'en-x-foo', numberingSystem: undefined, expected: 'en-x-foo' },
    { locale: 'ar-EG', numberingSystem: 'invalid', expected: 'ar-EG-u-nu-latn' },
    { locale: 'ar-EG', numberingSystem: 'not-a-numbering-system', expected: 'ar-EG-u-nu-latn' },
    { locale: 'ar-EG', numberingSystem: '!!', expected: 'ar-EG-u-nu-latn' },
    { locale: 'en-x-foo', numberingSystem: '', expected: 'en-u-nu-latn-x-foo' },
  ] as const)('normalizes and extends $locale', ({ locale, numberingSystem, expected }) => {
    expect(withNumberingSystem(locale, numberingSystem)).toBe(expected)
  })

  it('falls back to syntax validation and latn when Intl.supportedValuesOf is unavailable', () => {
    const descriptor = Object.getOwnPropertyDescriptor(Intl, 'supportedValuesOf')
    delete (Intl as { supportedValuesOf?: unknown }).supportedValuesOf
    resetFormatterCaches()
    try {
      expect('supportedValuesOf' in Intl).toBe(false)
      expect(withNumberingSystem('ar-EG', undefined)).toBe('ar-EG')
      expect(withNumberingSystem('ar-EG', 'latn')).toBe('ar-EG-u-nu-latn')
      expect(withNumberingSystem('en', 'ARAB')).toBe('en-u-nu-arab')
      expect(withNumberingSystem('ar-EG', 'arabext')).toBe('ar-EG-u-nu-arabext')
      expect(withNumberingSystem('ar-EG', 'not-a-numbering-system')).toBe('ar-EG-u-nu-latn')
      expect(withNumberingSystem('ar-EG', 'ab')).toBe('ar-EG-u-nu-latn')
      expect(withNumberingSystem('ar-EG', '123456789')).toBe('ar-EG-u-nu-latn')
      expect(withNumberingSystem('ar-EG', '!!')).toBe('ar-EG-u-nu-latn')
      expect(withNumberingSystem('ar-EG', '')).toBe('ar-EG-u-nu-latn')
      expect(formatNumber(1234.5, { locale: 'ar-EG', numberingSystem: 'latn' })).toBe('1,234.5')
      expect(formatNumber(12, { locale: 'en', numberingSystem: 'arab' })).toBe('١٢')
      expect(formatNumber(1234.5, { locale: 'ar-EG', numberingSystem: 'not-a-numbering-system' })).toBe('1,234.5')
      expect(ARABIC_INDIC.test(formatCurrency(2500, 'EGP', { locale: 'ar-EG', numberingSystem: '!!' }))).toBe(false)
      expect(ARABIC_INDIC.test(formatDate('2024-05-12T00:00:00Z', { locale: 'ar-EG', numberingSystem: '', timeZone: 'UTC', dateStyle: 'short' }))).toBe(false)
    }
    finally {
      if (descriptor) Object.defineProperty(Intl, 'supportedValuesOf', descriptor)
      resetFormatterCaches()
    }
    expect(withNumberingSystem('ar-EG', 'invalid')).toBe('ar-EG-u-nu-latn')
  })

  it('queries Intl.supportedValuesOf at most once across many calls and remembers when it throws', () => {
    resetFormatterCaches()
    const spy = vi.spyOn(Intl, 'supportedValuesOf')
    try {
      for (let i = 0; i < 50; i++) {
        expect(withNumberingSystem('ar-EG', 'latn')).toBe('ar-EG-u-nu-latn')
        expect(withNumberingSystem('en', 'arab')).toBe('en-u-nu-arab')
        expect(withNumberingSystem('ar-EG', 'invalid')).toBe('ar-EG-u-nu-latn')
        expect(withNumberingSystem('ar-EG', undefined)).toBe('ar-EG')
        expect(formatNumber(i, { locale: 'ar-EG', numberingSystem: 'latn' })).toBe(String(i))
        expect(ARABIC_INDIC.test(formatCurrency(10 + i, 'USD', { locale: 'ar-EG', numberingSystem: 'latn' }))).toBe(false)
        expect(ARABIC_INDIC.test(formatDate('2024-05-12T00:00:00Z', { locale: 'ar-EG', numberingSystem: 'latn', timeZone: 'UTC' }))).toBe(false)
      }
      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy).toHaveBeenCalledWith('numberingSystem')

      resetFormatterCaches()
      spy.mockClear()
      spy.mockImplementation(() => {
        throw new RangeError('unsupported key')
      })
      for (let i = 0; i < 50; i++) {
        expect(withNumberingSystem('ar-EG', 'latn')).toBe('ar-EG-u-nu-latn')
        expect(withNumberingSystem('ar-EG', 'not-a-numbering-system')).toBe('ar-EG-u-nu-latn')
        expect(formatNumber(i, { locale: 'ar-EG', numberingSystem: 'latn' })).toBe(String(i))
      }
      expect(spy).toHaveBeenCalledTimes(1)
    }
    finally {
      spy.mockRestore()
      resetFormatterCaches()
    }
  })
})

describe('formatNumber', () => {
  it('uses Arabic-Indic digits for an Arabic locale by default', () => {
    expect(ARABIC_INDIC.test(formatNumber(1234, { locale: 'ar-EG' }))).toBe(true)
  })

  it('switches to Western digits on request', () => {
    const out = formatNumber(1234.5, { locale: 'ar-EG', numberingSystem: 'latn' })
    expect(ARABIC_INDIC.test(out)).toBe(false)
    expect(out).toContain('1')
  })

  it('forwards Intl options', () => {
    expect(formatNumber(0.256, { locale: 'en', style: 'percent', maximumFractionDigits: 1 }))
      .toBe('25.6%')
  })

  it('can isolate the result', () => {
    const out = formatNumber(1234, { locale: 'en', isolate: 'ltr' })
    expect(out.startsWith(LRI)).toBe(true)
    expect(out.endsWith(PDI)).toBe(true)
  })

  it.each([
    'invalid',
    'not-a-numbering-system',
    '!!',
    '',
  ])('falls back to latn when numberingSystem %j is invalid', (numberingSystem) => {
    const out = formatNumber(1234.5, { locale: 'ar-EG', numberingSystem })
    expect(out).toBe(formatNumber(1234.5, { locale: 'ar-EG', numberingSystem: 'latn' }))
    expect(ARABIC_INDIC.test(out)).toBe(false)
  })

  it.each([
    { locale: 'ar_EG', numberingSystem: undefined, expected: '١٢' },
    { locale: 'en-x-foo', numberingSystem: 'arab', expected: '١٢' },
    { locale: 'en-!!', numberingSystem: 'arab', expected: '١٢' },
    { locale: 'ar_EG', numberingSystem: 'latn', expected: '12' },
  ] as const)('formats $locale with numbering system $numberingSystem', ({ locale, numberingSystem, expected }) => {
    expect(formatNumber(12, { locale, numberingSystem })).toBe(expected)
  })

  it.each([
    { locale: 'ar--EG', expected: formatNumber(12, { locale: 'ar' }) },
    { locale: '123-en', expected: '12' },
    { locale: '', expected: '12' },
    { locale: '@', expected: '12' },
  ])('falls back from invalid locale $locale', ({ locale, expected }) => {
    expect(formatNumber(12, { locale })).toBe(expected)
  })
})

describe('formatCurrency', () => {
  it('formats with the requested numbering system', () => {
    const out = formatCurrency(2500, 'USD', { locale: 'ar-EG', numberingSystem: 'latn' })
    expect(out).toContain('2,500')
    expect(ARABIC_INDIC.test(out)).toBe(false)
  })

  it('keeps the currency symbol for the locale', () => {
    expect(formatCurrency(10, 'USD', { locale: 'en-US' })).toBe('$10.00')
  })

  it('keeps throwing for invalid Intl options', () => {
    expect(() => formatCurrency(12, 'not-a-currency')).toThrow(RangeError)
  })

  it('falls back to latn when numberingSystem is invalid', () => {
    expect(formatCurrency(2500, 'EGP', { locale: 'ar-EG', numberingSystem: 'invalid' }))
      .toBe(formatCurrency(2500, 'EGP', { locale: 'ar-EG', numberingSystem: 'latn' }))
    expect(formatCurrency(2500, 'EGP', { locale: 'ar-EG', numberingSystem: 'not-a-numbering-system' }))
      .toBe(formatCurrency(2500, 'EGP', { locale: 'ar-EG', numberingSystem: 'latn' }))
  })
})

describe('formatDate', () => {
  const date = new Date(Date.UTC(2024, 4, 12))

  it('accepts a Date, a timestamp and a string', () => {
    const options = { locale: 'en-GB', timeZone: 'UTC', dateStyle: 'short' } as const
    expect(formatDate(date, options)).toBe(formatDate(date.getTime(), options))
    expect(formatDate(date, options)).toBe(formatDate('2024-05-12T00:00:00Z', options))
  })

  it('renders Western digits in Arabic when asked', () => {
    const out = formatDate(date, {
      locale: 'ar-EG',
      numberingSystem: 'latn',
      timeZone: 'UTC',
      dateStyle: 'short',
    })
    expect(ARABIC_INDIC.test(out)).toBe(false)
  })

  it('supports non-Gregorian calendars', () => {
    const out = formatDate(date, {
      locale: 'ar-SA',
      calendar: 'islamic-umalqura',
      timeZone: 'UTC',
      dateStyle: 'long',
    })
    expect(out.length).toBeGreaterThan(0)
  })

  it.each([
    { value: 'not a date' },
    { value: new Date(NaN) },
    { value: NaN },
    { value: Infinity },
  ])('returns an empty string for invalid date $value', ({ value }) => {
    expect(formatDate(value)).toBe('')
    expect(formatDate(value, { isolate: true })).toBe('')
  })

  it.each([
    { locale: 'ar_EG', expected: formatDate('2024-05-12T00:00:00Z', { locale: 'ar-EG', timeZone: 'UTC' }) },
    { locale: 'ar--EG', expected: formatDate('2024-05-12T00:00:00Z', { locale: 'ar', timeZone: 'UTC' }) },
    { locale: '123-en', expected: formatDate('2024-05-12T00:00:00Z', { locale: 'en', timeZone: 'UTC' }) },
  ])('falls back from invalid locale $locale', ({ locale, expected }) => {
    expect(formatDate('2024-05-12T00:00:00Z', { locale, timeZone: 'UTC' })).toBe(expected)
  })

  it.each([
    'invalid',
    'not-a-numbering-system',
    '!!',
    '',
  ])('falls back to latn in formatDate when numberingSystem %j is invalid', (numberingSystem) => {
    const out = formatDate(date, {
      locale: 'ar-EG',
      numberingSystem,
      timeZone: 'UTC',
      dateStyle: 'short',
    })
    expect(out).toBe(formatDate(date, {
      locale: 'ar-EG',
      numberingSystem: 'latn',
      timeZone: 'UTC',
      dateStyle: 'short',
    }))
    expect(ARABIC_INDIC.test(out)).toBe(false)
  })
})

describe('transliterateDigits', () => {
  it('converts to Arabic-Indic and back', () => {
    expect(transliterateDigits('طلب 4821', 'arab')).toBe('طلب ٤٨٢١')
    expect(transliterateDigits('طلب ٤٨٢١', 'latn')).toBe('طلب 4821')
  })

  it('leaves non-digits untouched', () => {
    expect(transliterateDigits('v1.2.3-beta', 'arab')).toBe('v١.٢.٣-beta')
  })
})

describe('useFormat', () => {
  const setup = (options: Parameters<typeof createRtl>[0]) => {
    const rtl = createRtl({ syncDocument: false, ...options })
    let formatters: ReturnType<typeof useFormat> | undefined
    const Probe = defineComponent({
      setup() {
        formatters = useFormat()
        return () => h('i')
      },
    })
    mount(Probe, { global: { plugins: [rtl] } })
    return { rtl, formatters: formatters! }
  }

  it.each([
    { locale: 'ar_EG', numberingSystem: 'arab', fallbackNumberingSystem: 'arab', expected: '١٢', fallbackLocale: 'ar-EG' },
    { locale: 'en-x-foo', numberingSystem: 'arab', fallbackNumberingSystem: 'arab', expected: '١٢', fallbackLocale: 'en-x-foo' },
    { locale: 'en-!!', numberingSystem: 'arab', fallbackNumberingSystem: 'arab', expected: '١٢', fallbackLocale: 'en' },
    { locale: 'ar-EG-!!', numberingSystem: { ar: 'arab' }, fallbackNumberingSystem: 'arab', expected: '١٢', fallbackLocale: 'ar' },
    { locale: 'ar--EG', numberingSystem: undefined, fallbackNumberingSystem: undefined, expected: '12', fallbackLocale: 'ar' },
    { locale: '123-en', numberingSystem: undefined, fallbackNumberingSystem: undefined, expected: '12', fallbackLocale: 'en' },
  ] as const)('formats bound locale $locale without throwing', ({ locale, numberingSystem, fallbackNumberingSystem, expected, fallbackLocale }) => {
    const { rtl, formatters } = setup({
      locales: [locale],
      defaultLocale: locale,
      numberingSystem,
    })
    expect(formatters.value.locale).toBe(locale)
    expect(formatters.value.formatNumber(12)).toBe(expected)
    expect(formatters.value.formatDate('not a date')).toBe('')
    expect(formatters.value.formatDate('2024-05-12T00:00:00Z', { timeZone: 'UTC' }))
      .toBe(formatDate('2024-05-12T00:00:00Z', { locale: fallbackLocale, numberingSystem: fallbackNumberingSystem, timeZone: 'UTC' }))
    rtl.dispose()
  })

  it('binds to the current locale', () => {
    const { rtl, formatters } = setup({ locales: ['en', 'ar-EG'], defaultLocale: 'en' })
    expect(formatters.value.formatNumber(1234)).toBe('1,234')
    rtl.setLocale('ar-EG')
    expect(ARABIC_INDIC.test(formatters.value.formatNumber(1234))).toBe(true)
    rtl.dispose()
  })

  it('applies a globally configured numbering system', () => {
    const { rtl, formatters } = setup({
      locales: ['ar-EG'],
      defaultLocale: 'ar-EG',
      numberingSystem: 'latn',
    })
    expect(ARABIC_INDIC.test(formatters.value.formatNumber(1234))).toBe(false)
    rtl.dispose()
  })

  it('applies a per-locale numbering system by language subtag', () => {
    const { rtl, formatters } = setup({
      locales: ['ar-EG'],
      defaultLocale: 'ar-EG',
      numberingSystem: { ar: 'latn' },
    })
    expect(ARABIC_INDIC.test(formatters.value.formatNumber(1234))).toBe(false)
    expect(formatters.value.dir).toBe('rtl')
    rtl.dispose()
  })

  it('falls back to latn when createRtl is configured with an invalid numbering system', () => {
    for (const numberingSystem of ['invalid', 'not-a-numbering-system', '', { ar: 'invalid' }, { ar: '' }] as const) {
      const { rtl, formatters } = setup({
        locales: ['ar-EG'],
        defaultLocale: 'ar-EG',
        numberingSystem,
      })
      expect(formatters.value.formatNumber(1234)).toBe('1,234')
      expect(ARABIC_INDIC.test(formatters.value.formatCurrency(2500, 'EGP'))).toBe(false)
      expect(ARABIC_INDIC.test(formatters.value.formatDate('2024-05-12T00:00:00Z', { timeZone: 'UTC', dateStyle: 'short' }))).toBe(false)
      rtl.dispose()
    }
  })

  it('switches runtime direction and locale (ltr -> rtl -> ltr) and respects nested RtlProvider', async () => {
    const rtl = createRtl({
      locales: ['en-US', 'ar-EG'],
      defaultLocale: 'en-US',
      numberingSystem: { ar: 'arab' },
      syncDocument: false,
    })

    let rootFormat: ReturnType<typeof useFormat> | undefined
    let nestedFormat: ReturnType<typeof useFormat> | undefined

    const NestedChild = defineComponent({
      setup() {
        const f = useFormat()
        nestedFormat = f
        return () => h('span', f.value.formatCurrency(50, 'USD'))
      },
    })

    const App = defineComponent({
      setup() {
        const f = useFormat()
        rootFormat = f
        return () => h('div', [
          h('p', f.value.formatNumber(1234)),
          h(RtlProvider, { locale: 'ar-EG' }, () => h(NestedChild)),
        ])
      },
    })

    const wrapper = mount(App, { global: { plugins: [rtl] } })
    expect(rootFormat!.value.dir).toBe('ltr')
    expect(rootFormat!.value.locale).toBe('en-US')
    expect(rootFormat!.value.formatNumber(1234)).toBe('1,234')
    expect(nestedFormat!.value.dir).toBe('rtl')
    expect(nestedFormat!.value.locale).toBe('ar-EG')
    expect(ARABIC_INDIC.test(nestedFormat!.value.formatNumber(1234))).toBe(true)

    rtl.setLocale('ar-EG')
    await nextTick()
    expect(rootFormat!.value.dir).toBe('rtl')
    expect(rootFormat!.value.locale).toBe('ar-EG')
    expect(ARABIC_INDIC.test(rootFormat!.value.formatNumber(1234))).toBe(true)

    rtl.setLocale('en-US')
    await nextTick()
    expect(rootFormat!.value.dir).toBe('ltr')
    expect(rootFormat!.value.locale).toBe('en-US')
    expect(rootFormat!.value.formatNumber(1234)).toBe('1,234')
    expect(nestedFormat!.value.dir).toBe('rtl')
    expect(nestedFormat!.value.locale).toBe('ar-EG')

    wrapper.unmount()
    rtl.dispose()
  })

  it('falls back cleanly outside component setup in a server-only environment without warnings', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const originalDoc = globalThis.document
    const originalWin = globalThis.window
    // @ts-expect-error simulating server-only runtime
    delete globalThis.document
    // @ts-expect-error simulating server-only runtime
    delete globalThis.window
    try {
      const f = useFormat()
      expect(f.value.dir).toBe('ltr')
      expect(f.value.locale).toBe('en')
      expect(f.value.formatNumber(1000)).toBe('1,000')
      expect(warnSpy).not.toHaveBeenCalled()
    }
    finally {
      globalThis.document = originalDoc
      globalThis.window = originalWin
      warnSpy.mockRestore()
    }
  })
})

describe('formatter caches', () => {
  it('bounds the Intl.NumberFormat cache to a small fixed LRU and evicts the least recently used entry', () => {
    resetFormatterCaches()
    const ctor = vi.spyOn(Intl, 'NumberFormat')

    formatNumber(1, { locale: 'en' })
    formatNumber(2, { locale: 'en' })
    expect(ctor).toHaveBeenCalledTimes(1)
    expect(formatterCacheStats().number).toBe(1)

    resetFormatterCaches()
    ctor.mockClear()
    const keys = Array.from({ length: FORMATTER_CACHE_LIMIT * 4 }, (_, i) => `en-u-nu-latn-x-k${i}`)
    for (const locale of keys) formatNumber(1, { locale })
    expect(formatterCacheStats().number).toBe(FORMATTER_CACHE_LIMIT)
    expect(ctor).toHaveBeenCalledTimes(keys.length)

    ctor.mockClear()
    formatNumber(1, { locale: keys.at(-1)! })
    expect(ctor).not.toHaveBeenCalled()

    formatNumber(1, { locale: keys[0]! })
    expect(ctor).toHaveBeenCalledTimes(1)
    expect(formatterCacheStats().number).toBe(FORMATTER_CACHE_LIMIT)

    ctor.mockClear()
    formatNumber(1, { locale: keys[keys.length - FORMATTER_CACHE_LIMIT]! })
    expect(ctor).toHaveBeenCalledTimes(1)

    ctor.mockRestore()
  })

  it('bounds the Intl.DateTimeFormat cache the same way', () => {
    resetFormatterCaches()
    const ctor = vi.spyOn(Intl, 'DateTimeFormat')
    const date = new Date(Date.UTC(2024, 4, 12))
    const keys = Array.from({ length: FORMATTER_CACHE_LIMIT * 3 }, (_, i) => `en-u-ca-gregory-x-k${i}`)
    for (const locale of keys) formatDate(date, { locale, timeZone: 'UTC' })
    expect(formatterCacheStats().date).toBe(FORMATTER_CACHE_LIMIT)
    expect(ctor).toHaveBeenCalledTimes(keys.length)

    ctor.mockClear()
    formatDate(date, { locale: keys.at(-1)!, timeZone: 'UTC' })
    expect(ctor).not.toHaveBeenCalled()
    formatDate(date, { locale: keys[0]!, timeZone: 'UTC' })
    expect(ctor).toHaveBeenCalledTimes(1)
    expect(formatterCacheStats().date).toBe(FORMATTER_CACHE_LIMIT)
    ctor.mockRestore()
  })

  it('refreshes recency on hit so a hot formatter survives churn', () => {
    resetFormatterCaches()
    const ctor = vi.spyOn(Intl, 'NumberFormat')
    const hot = 'en-x-hot'
    formatNumber(1, { locale: hot })
    for (let i = 0; i < FORMATTER_CACHE_LIMIT * 2; i++) {
      formatNumber(1, { locale: `en-x-cold${i}` })
      formatNumber(1, { locale: hot })
    }
    ctor.mockClear()
    formatNumber(1, { locale: hot })
    expect(ctor).not.toHaveBeenCalled()
    expect(formatterCacheStats().number).toBe(FORMATTER_CACHE_LIMIT)
    ctor.mockRestore()
  })
})
