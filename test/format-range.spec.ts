/**
 * `formatDateRange` / `formatNumberRange`: `Intl` `formatRange` wrappers that
 * collapse shared parts, keep the locale's range separator, and fall back to
 * an isolated join on runtimes without `formatRange`.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import {
  FORMATTER_CACHE_LIMIT,
  formatDate,
  formatDateRange,
  formatNumber,
  formatNumberRange,
  formatterCacheStats,
  resetFormatterCaches,
  withNumberingSystem,
} from '../src/format'
import { useFormat } from '../src/composables/useFormat'
import { createRtl } from '../src/core'
import { FSI, LRI, PDI } from '../src/bidi'

const ARABIC_INDIC = /[٠-٩]/
const DATE_OPTIONS = { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' } as const

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  resetFormatterCaches()
})

/** Remove `formatRange` from a prototype until the returned restore runs. */
function stubAwayFormatRange(prototype: object): () => void {
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'formatRange')!
  delete (prototype as { formatRange?: unknown }).formatRange
  resetFormatterCaches()
  return () => {
    Object.defineProperty(prototype, 'formatRange', descriptor)
    resetFormatterCaches()
  }
}

describe('formatDateRange', () => {
  const cases = [
    { name: 'same day', start: '2024-03-03', end: '2024-03-03' },
    { name: 'same month', start: '2024-03-03', end: '2024-03-05' },
    { name: 'same year', start: '2024-03-28', end: '2024-04-02' },
    { name: 'cross-year', start: '2023-12-30', end: '2024-01-02' },
    { name: 'reversed', start: '2024-03-05', end: '2024-03-03' },
  ] as const
  const locales = [
    { locale: 'ar', numberingSystem: undefined, calendar: undefined },
    { locale: 'ar-EG', numberingSystem: undefined, calendar: undefined },
    { locale: 'ar-EG', numberingSystem: 'latn', calendar: undefined },
    { locale: 'ar-SA', numberingSystem: 'latn', calendar: 'gregory' },
    { locale: 'ar-SA', numberingSystem: 'arab', calendar: 'gregory' },
    { locale: 'fa', numberingSystem: undefined, calendar: undefined },
    { locale: 'he', numberingSystem: undefined, calendar: undefined },
    { locale: 'en', numberingSystem: undefined, calendar: undefined },
  ] as const

  for (const { locale, numberingSystem, calendar } of locales) {
    for (const { name, start, end } of cases) {
      it(`formats a ${name} range in ${locale}${numberingSystem ? ` (${numberingSystem})` : ''} like Intl.formatRange`, () => {
        const options = { ...DATE_OPTIONS, locale, numberingSystem, ...(calendar ? { calendar } : {}) }
        const reference = new Intl.DateTimeFormat(withNumberingSystem(locale, numberingSystem), {
          ...DATE_OPTIONS,
          ...(calendar ? { calendar } : {}),
        })
        expect(formatDateRange(start, end, options))
          .toBe(reference.formatRange(new Date(`${start}T00:00:00Z`), new Date(`${end}T00:00:00Z`)))
      })
    }
  }

  it('does not repeat the shared month or year', () => {
    const ar = formatDateRange('2024-03-03', '2024-03-05', { ...DATE_OPTIONS, locale: 'ar' })
    expect(ar).toBe('3–5 مارس 2024')
    expect(ar.match(/مارس/g)).toHaveLength(1)
    expect(ar.match(/2024/g)).toHaveLength(1)
    expect(formatDateRange('2024-03-03', '2024-03-05', { ...DATE_OPTIONS, locale: 'ar-EG' })).toBe('٣–٥ مارس ٢٠٢٤')
    expect(formatDateRange('2024-03-28', '2024-04-02', { ...DATE_OPTIONS, locale: 'ar' })).toBe('28 مارس – 2 أبريل 2024')
    expect(formatDateRange('2024-03-03', '2024-03-05', { ...DATE_OPTIONS, locale: 'en' })).toBe('March 3\u2009–\u20095, 2024')
    expect(formatDateRange('2024-03-03', '2024-03-05', { ...DATE_OPTIONS, locale: 'he' })).toBe('3–5 במרץ 2024')
  })

  it('uses the locale range separator, not a hyphen', () => {
    expect(formatDateRange('2024-03-03', '2024-03-05', { ...DATE_OPTIONS, locale: 'ar-EG' })).toContain('–')
    expect(formatDateRange('2024-03-03', '2024-03-05', { ...DATE_OPTIONS, locale: 'ar-EG' })).not.toContain('-')
    const fa = formatDateRange('2024-03-03', '2024-03-05', { ...DATE_OPTIONS, locale: 'fa' })
    expect(fa).toBe('۱۳ تا ۱۵ اسفند ۱۴۰۲')
    expect(fa).toContain(' تا ')
  })

  it('switches digits with the numbering system in ar-SA', () => {
    const options = { ...DATE_OPTIONS, locale: 'ar-SA', calendar: 'gregory' } as const
    const latn = formatDateRange('2024-03-03', '2024-03-05', { ...options, numberingSystem: 'latn' })
    const arab = formatDateRange('2024-03-03', '2024-03-05', { ...options, numberingSystem: 'arab' })
    expect(latn).toBe('3–5 مارس 2024')
    expect(ARABIC_INDIC.test(latn)).toBe(false)
    expect(arab).toBe('٣–٥ مارس ٢٠٢٤')
    expect(ARABIC_INDIC.test(arab)).toBe(true)
  })

  it('keeps both years in a cross-year range', () => {
    expect(formatDateRange('2023-12-30', '2024-01-02', { ...DATE_OPTIONS, locale: 'ar-EG' }))
      .toBe('٣٠ ديسمبر ٢٠٢٣ – ٢ يناير ٢٠٢٤')
    expect(formatDateRange('2023-12-30', '2024-01-02', { ...DATE_OPTIONS, locale: 'en' }))
      .toBe('December 30, 2023\u2009–\u2009January 2, 2024')
    // fa runs on the Persian calendar: Nowruz 1403 falls inside March 2024.
    expect(formatDateRange('2024-03-19', '2024-03-22', { ...DATE_OPTIONS, locale: 'fa' }))
      .toBe('۲۹ اسفند ۱۴۰۲ تا ۳ فروردین ۱۴۰۳')
  })

  it('collapses a same-day range to a single date', () => {
    expect(formatDateRange('2024-03-03', '2024-03-03', { ...DATE_OPTIONS, locale: 'en' })).toBe('March 3, 2024')
    expect(formatDateRange('2024-03-03', '2024-03-03', { ...DATE_OPTIONS, locale: 'ar-EG' })).toBe('٣ مارس ٢٠٢٤')
    expect(formatDateRange('2024-03-03', '2024-03-03', { ...DATE_OPTIONS, locale: 'ar-SA', numberingSystem: 'latn', calendar: 'gregory' }))
      .toBe('3 مارس 2024')
  })

  it('keeps a reversed range working without throwing, like Intl', () => {
    expect(() => formatDateRange('2024-03-05', '2024-03-03', { ...DATE_OPTIONS, locale: 'ar-EG' })).not.toThrow()
    expect(formatDateRange('2024-03-05', '2024-03-03', { ...DATE_OPTIONS, locale: 'ar-EG' })).toBe('٥–٣ مارس ٢٠٢٤')
    expect(formatDateRange('2024-03-05', '2024-03-03', { ...DATE_OPTIONS, locale: 'en' })).toBe('March 5\u2009–\u20093, 2024')
  })

  it('formats time ranges', () => {
    const options = { timeZone: 'UTC', hour: 'numeric', minute: '2-digit' } as const
    const start = '2024-03-03T09:00:00Z'
    const end = '2024-03-03T11:30:00Z'
    expect(formatDateRange(start, end, { ...options, locale: 'en' })).toBe('9:00\u2009–\u200911:30\u202FAM')
    expect(formatDateRange(start, end, { ...options, locale: 'ar-EG' })).toBe('٩:٠٠–١١:٣٠ ص')
    expect(formatDateRange(start, end, { ...options, locale: 'ar-EG', numberingSystem: 'latn' })).toBe('9:00–11:30 ص')
    expect(formatDateRange(start, end, { ...options, locale: 'he' })).toBe('9:00–11:30')
  })

  it('accepts a Date, a timestamp and an ISO string for both ends', () => {
    const options = { ...DATE_OPTIONS, locale: 'en' }
    const date = new Date('2024-03-03T00:00:00Z')
    const expected = formatDateRange('2024-03-03', '2024-03-05', options)
    expect(formatDateRange(date, date.getTime() + 2 * 86400000, options)).toBe(expected)
    expect(formatDateRange(date.getTime(), '2024-03-05T00:00:00Z', options)).toBe(expected)
  })

  it('can isolate the whole range', () => {
    const plain = formatDateRange('2024-03-03', '2024-03-05', { ...DATE_OPTIONS, locale: 'ar-EG' })
    expect(formatDateRange('2024-03-03', '2024-03-05', { ...DATE_OPTIONS, locale: 'ar-EG', isolate: true }))
      .toBe(`${FSI}${plain}${PDI}`)
    expect(formatDateRange('2024-03-03', '2024-03-05', { ...DATE_OPTIONS, locale: 'en', isolate: 'ltr' }))
      .toBe(`${LRI}March 3\u2009–\u20095, 2024${PDI}`)
  })

  it.each(['not a date', new Date(NaN), NaN, Infinity])('rejects invalid endpoint %s in development', (value) => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(() => formatDateRange(value as string, '2024-03-05')).toThrow(TypeError)
    expect(() => formatDateRange('2024-03-03', value as string)).toThrow(TypeError)
  })

  it.each(['not a date', new Date(NaN), NaN, Infinity])('returns an empty string for invalid endpoint %s in production', (value) => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(formatDateRange(value as string, '2024-03-05')).toBe('')
    expect(formatDateRange('2024-03-03', value as string)).toBe('')
    expect(formatDateRange(value as string, '2024-03-05', { isolate: true })).toBe('')
  })

  it('falls back from invalid locale tags and numbering systems like formatDate', () => {
    expect(formatDateRange('2024-03-03', '2024-03-05', { ...DATE_OPTIONS, locale: 'ar_EG' }))
      .toBe(formatDateRange('2024-03-03', '2024-03-05', { ...DATE_OPTIONS, locale: 'ar-EG' }))
    expect(formatDateRange('2024-03-03', '2024-03-05', { ...DATE_OPTIONS, locale: '123-en' }))
      .toBe(formatDateRange('2024-03-03', '2024-03-05', { ...DATE_OPTIONS, locale: 'en' }))
    expect(formatDateRange('2024-03-03', '2024-03-05', { ...DATE_OPTIONS, locale: 'ar-EG', numberingSystem: 'invalid' }))
      .toBe(formatDateRange('2024-03-03', '2024-03-05', { ...DATE_OPTIONS, locale: 'ar-EG', numberingSystem: 'latn' }))
  })

  it('joins isolated ends with a spaced en dash when formatRange is missing', () => {
    const restore = stubAwayFormatRange(Intl.DateTimeFormat.prototype)
    try {
      const options = { ...DATE_OPTIONS, locale: 'en' }
      expect(formatDateRange('2024-03-03', '2024-03-05', options))
        .toBe(`${FSI}March 3, 2024${PDI} – ${FSI}March 5, 2024${PDI}`)
      const ar = formatDateRange('2024-03-03', '2024-03-05', { ...DATE_OPTIONS, locale: 'ar-EG' })
      expect(ar).toBe(
        `${FSI}${formatDate('2024-03-03', { ...DATE_OPTIONS, locale: 'ar-EG' })}${PDI}`
        + ` – ${FSI}${formatDate('2024-03-05', { ...DATE_OPTIONS, locale: 'ar-EG' })}${PDI}`,
      )
      expect(formatDateRange('2024-03-03', '2024-03-05', { ...options, isolate: true }))
        .toBe(`${FSI}${FSI}March 3, 2024${PDI} – ${FSI}March 5, 2024${PDI}${PDI}`)
    }
    finally {
      restore()
    }
    expect(formatDateRange('2024-03-03', '2024-03-05', { ...DATE_OPTIONS, locale: 'en' })).toBe('March 3\u2009–\u20095, 2024')
  })

  it('uses the Persian تا separator in the date fallback', () => {
    const restore = stubAwayFormatRange(Intl.DateTimeFormat.prototype)
    try {
      const options = { ...DATE_OPTIONS, locale: 'fa' }
      expect(formatDateRange('2024-03-03', '2024-03-05', options))
        .toBe(`${FSI}۱۳ اسفند ۱۴۰۲${PDI} تا ${FSI}۱۵ اسفند ۱۴۰۲${PDI}`)
    }
    finally {
      restore()
    }
  })

  it('detects the missing formatRange per call, even for an already-cached formatter', () => {
    const options = { ...DATE_OPTIONS, locale: 'en' }
    expect(formatDateRange('2024-03-03', '2024-03-05', options)).toBe('March 3\u2009–\u20095, 2024')
    const descriptor = Object.getOwnPropertyDescriptor(Intl.DateTimeFormat.prototype, 'formatRange')!
    delete (Intl.DateTimeFormat.prototype as { formatRange?: unknown }).formatRange
    try {
      // No cache reset: the cached formatter must take the fallback path too.
      expect(formatterCacheStats().date).toBe(1)
      expect(formatDateRange('2024-03-03', '2024-03-05', options))
        .toBe(`${FSI}March 3, 2024${PDI} – ${FSI}March 5, 2024${PDI}`)
    }
    finally {
      Object.defineProperty(Intl.DateTimeFormat.prototype, 'formatRange', descriptor)
    }
    expect(formatDateRange('2024-03-03', '2024-03-05', options)).toBe('March 3\u2009–\u20095, 2024')
  })
})

describe('formatNumberRange', () => {
  it('writes one currency symbol for the whole Arabic range', () => {
    const options = { locale: 'ar-EG', numberingSystem: 'latn', style: 'currency', currency: 'EGP' } as const
    const out = formatNumberRange(100, 250, options)
    expect(out).toBe('\u200F100.00–250.00\u00A0ج.م.\u200F')
    expect(out.match(/ج\.م\./g)).toHaveLength(1)
    expect(out).not.toContain('-')
    expect(formatNumberRange(100, 250, { ...options, numberingSystem: 'arab' }))
      .toBe('\u200F١٠٠٫٠٠–٢٥٠٫٠٠\u00A0ج.م.\u200F')
    expect(formatNumberRange(100, 250, { locale: 'ar-SA', numberingSystem: 'latn', style: 'currency', currency: 'SAR' }))
      .toBe('\u200F100.00–250.00\u00A0ر.س.\u200F')
  })

  it('follows the locale range pattern for currency in en, fa and he', () => {
    for (const [locale, currency] of [['en', 'USD'], ['fa', 'IRR'], ['he', 'ILS']] as const) {
      const options = { style: 'currency', currency } as const
      expect(formatNumberRange(100, 250, { ...options, locale }))
        .toBe(new Intl.NumberFormat(locale, options).formatRange(100, 250))
    }
    expect(formatNumberRange(100, 250, { locale: 'en', style: 'currency', currency: 'USD' })).toBe('$100.00 – $250.00')
  })

  it('formats percent ranges with the locale percent sign', () => {
    expect(formatNumberRange(0.1, 0.25, { locale: 'en', style: 'percent' })).toBe('10% – 25%')
    expect(formatNumberRange(0.1, 0.25, { locale: 'ar-EG', numberingSystem: 'latn', style: 'percent' })).toBe('10–25\u200E%\u200E')
    expect(formatNumberRange(0.1, 0.25, { locale: 'fa', style: 'percent' })).toBe('۱۰٪ – ۲۵٪')
    expect(ARABIC_INDIC.test(formatNumberRange(0.1, 0.25, { locale: 'ar-EG', style: 'percent' }))).toBe(true)
  })

  it('formats compact and unit ranges', () => {
    expect(formatNumberRange(1200, 3500, { locale: 'en', notation: 'compact' })).toBe('1.2K – 3.5K')
    expect(formatNumberRange(1200, 3500, { locale: 'ar', notation: 'compact' })).toBe('1.2–3.5\u00A0ألف')
    expect(formatNumberRange(5, 12, { locale: 'en', style: 'unit', unit: 'kilometer' })).toBe('5–12 km')
  })

  it('uses Arabic-Indic digits by default and Western digits on request', () => {
    expect(formatNumberRange(100, 250, { locale: 'ar-EG' })).toBe('١٠٠–٢٥٠')
    expect(formatNumberRange(100, 250, { locale: 'ar-EG', numberingSystem: 'latn' })).toBe('100–250')
    expect(formatNumberRange(100, 250, { locale: 'ar-SA', numberingSystem: 'arab' })).toBe('١٠٠–٢٥٠')
    expect(formatNumberRange(100, 250, { locale: 'ar-SA', numberingSystem: 'latn' })).toBe('100–250')
    expect(formatNumberRange(100, 250, { locale: 'fa' })).toBe('۱۰۰–۲۵۰')
    expect(formatNumberRange(100, 250, { locale: 'he' })).toBe('100–250')
    expect(formatNumberRange(100, 250, { locale: 'en' })).toBe('100–250')
  })

  it('accepts bigint ends, including values beyond Number.MAX_SAFE_INTEGER', () => {
    expect(formatNumberRange(10n, 25n, { locale: 'en' })).toBe('10–25')
    expect(formatNumberRange(10, 25n, { locale: 'en' })).toBe('10–25')
    expect(formatNumberRange(9007199254740993n, 9007199254740995n, { locale: 'en' }))
      .toBe('9,007,199,254,740,993–9,007,199,254,740,995')
    expect(formatNumberRange(10n, 25n, { locale: 'ar-EG' })).toBe('١٠–٢٥')
  })

  it('formats start equal to end like Intl (the approximate pattern)', () => {
    for (const locale of ['ar', 'ar-EG', 'fa', 'he', 'en'] as const) {
      expect(formatNumberRange(100, 100, { locale }))
        .toBe(new Intl.NumberFormat(withNumberingSystem(locale)).formatRange(100, 100))
    }
    expect(formatNumberRange(100, 100, { locale: 'en', style: 'currency', currency: 'USD' }))
      .toBe(new Intl.NumberFormat('en', { style: 'currency', currency: 'USD' }).formatRange(100, 100))
  })

  it('keeps a reversed range working without throwing, like Intl', () => {
    expect(() => formatNumberRange(250, 100, { locale: 'ar-EG' })).not.toThrow()
    expect(formatNumberRange(250, 100, { locale: 'en' })).toBe('250–100')
    expect(formatNumberRange(250, 100, { locale: 'ar-EG', numberingSystem: 'latn' })).toBe('250–100')
    expect(formatNumberRange(250, 100, { locale: 'en', style: 'currency', currency: 'USD' })).toBe('$250.00 – $100.00')
    expect(formatNumberRange(25n, 10n, { locale: 'en' })).toBe('25–10')
  })

  it('can isolate the whole range', () => {
    expect(formatNumberRange(100, 250, { locale: 'en', isolate: true })).toBe(`${FSI}100–250${PDI}`)
    expect(formatNumberRange(100, 250, { locale: 'en', isolate: 'ltr' })).toBe(`${LRI}100–250${PDI}`)
  })

  it.each([NaN, Infinity, -Infinity])('rejects non-finite endpoint %s in development', (value) => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(() => formatNumberRange(value, 250)).toThrow(TypeError)
    expect(() => formatNumberRange(100, value)).toThrow(TypeError)
  })

  it.each([NaN, Infinity, -Infinity])('returns an empty string for non-finite endpoint %s in production', (value) => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(formatNumberRange(value, 250)).toBe('')
    expect(formatNumberRange(100, value)).toBe('')
    expect(formatNumberRange(value, 250, { isolate: true })).toBe('')
  })

  it('falls back from invalid locale tags and numbering systems like formatNumber', () => {
    expect(formatNumberRange(100, 250, { locale: 'ar_EG' })).toBe(formatNumberRange(100, 250, { locale: 'ar-EG' }))
    expect(formatNumberRange(100, 250, { locale: '123-en' })).toBe('100–250')
    expect(formatNumberRange(100, 250, { locale: 'ar-EG', numberingSystem: 'invalid' })).toBe('100–250')
  })

  it('joins isolated ends with an en dash when formatRange is missing', () => {
    const restore = stubAwayFormatRange(Intl.NumberFormat.prototype)
    try {
      expect(formatNumberRange(100, 250, { locale: 'en' })).toBe(`${FSI}100${PDI}–${FSI}250${PDI}`)
      expect(formatNumberRange(100, 250, { locale: 'ar-EG' })).toBe(`${FSI}١٠٠${PDI}–${FSI}٢٥٠${PDI}`)
      const currency = { locale: 'ar-EG', numberingSystem: 'latn', style: 'currency', currency: 'EGP' } as const
      expect(formatNumberRange(100, 250, currency))
        .toBe(`${FSI}${formatNumber(100, currency)}${PDI}–${FSI}${formatNumber(250, currency)}${PDI}`)
      expect(formatNumberRange(10n, 25n, { locale: 'en' })).toBe(`${FSI}10${PDI}–${FSI}25${PDI}`)
      expect(formatNumberRange(100, 250, { locale: 'en', isolate: true }))
        .toBe(`${FSI}${FSI}100${PDI}–${FSI}250${PDI}${PDI}`)
    }
    finally {
      restore()
    }
    expect(formatNumberRange(100, 250, { locale: 'en' })).toBe('100–250')
  })

  it('detects the missing formatRange per call, even for an already-cached formatter', () => {
    expect(formatNumberRange(100, 250, { locale: 'en' })).toBe('100–250')
    const descriptor = Object.getOwnPropertyDescriptor(Intl.NumberFormat.prototype, 'formatRange')!
    delete (Intl.NumberFormat.prototype as { formatRange?: unknown }).formatRange
    try {
      expect(formatterCacheStats().number).toBe(1)
      expect(formatNumberRange(100, 250, { locale: 'en' })).toBe(`${FSI}100${PDI}–${FSI}250${PDI}`)
    }
    finally {
      Object.defineProperty(Intl.NumberFormat.prototype, 'formatRange', descriptor)
    }
    expect(formatNumberRange(100, 250, { locale: 'en' })).toBe('100–250')
  })
})

describe('range formatter caches', () => {
  // `formatRange` is a prototype method that checks its receiver's internal
  // slots, so a bare constructor spy is not enough: forward to the original
  // constructor so the cached instance is a real Intl formatter.
  const spyOnConstructor = <K extends 'NumberFormat' | 'DateTimeFormat'>(name: K) => {
    const Original = Intl[name] as unknown as new (...args: unknown[]) => object
    return vi.spyOn(Intl, name).mockImplementation(function (...args: unknown[]) {
      return new Original(...args)
    } as never)
  }

  it('reuses the date cache and adds no new formatterCacheStats key', () => {
    resetFormatterCaches()
    const ctor = spyOnConstructor('DateTimeFormat')
    const options = { ...DATE_OPTIONS, locale: 'ar-EG' }
    formatDate('2024-03-03', options)
    formatDateRange('2024-03-03', '2024-03-05', options)
    formatDateRange('2024-03-03', '2024-03-05', options)
    expect(ctor).toHaveBeenCalledTimes(1)
    expect(formatterCacheStats().date).toBe(1)
    expect(Object.keys(formatterCacheStats()).sort())
      .toEqual(['collator', 'date', 'displayName', 'limit', 'list', 'number', 'relativeTime'])

    ctor.mockClear()
    formatDateRange('2024-03-03', '2024-03-05', { ...options, month: 'short' })
    expect(ctor).toHaveBeenCalledTimes(1)
    expect(formatterCacheStats().date).toBe(2)
    ctor.mockRestore()
  })

  it('reuses the number cache and adds no new formatterCacheStats key', () => {
    resetFormatterCaches()
    const ctor = spyOnConstructor('NumberFormat')
    const options = { locale: 'ar-EG', numberingSystem: 'latn' } as const
    formatNumber(100, options)
    formatNumberRange(100, 250, options)
    formatNumberRange(10n, 25n, options)
    expect(ctor).toHaveBeenCalledTimes(1)
    expect(formatterCacheStats().number).toBe(1)
    expect(formatterCacheStats().date).toBe(0)

    ctor.mockClear()
    formatNumberRange(100, 250, { ...options, style: 'currency', currency: 'EGP' })
    expect(ctor).toHaveBeenCalledTimes(1)
    expect(formatterCacheStats().number).toBe(2)
    ctor.mockRestore()
  })

  it('bounds range traffic to the same LRU limit per kind', () => {
    resetFormatterCaches()
    const dateKeys = Array.from({ length: FORMATTER_CACHE_LIMIT * 3 }, (_, i) => `en-u-ca-gregory-x-r${i}`)
    for (const locale of dateKeys) formatDateRange('2024-03-03', '2024-03-05', { ...DATE_OPTIONS, locale })
    expect(formatterCacheStats().date).toBe(FORMATTER_CACHE_LIMIT)
    const numberKeys = Array.from({ length: FORMATTER_CACHE_LIMIT * 3 }, (_, i) => `en-x-r${i}`)
    for (const locale of numberKeys) formatNumberRange(100, 250, { locale })
    expect(formatterCacheStats().number).toBe(FORMATTER_CACHE_LIMIT)
  })
})

describe('useFormat range bindings', () => {
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

  it('binds both range formatters to the current locale and configured numbering system', async () => {
    const { rtl, formatters } = setup({
      locales: ['en', 'ar-EG'],
      defaultLocale: 'en',
      numberingSystem: { ar: 'latn' },
    })
    expect(formatters.value.formatDateRange('2024-03-03', '2024-03-05', DATE_OPTIONS)).toBe('March 3\u2009–\u20095, 2024')
    expect(formatters.value.formatNumberRange(100, 250)).toBe('100–250')

    rtl.setLocale('ar-EG')
    await nextTick()
    expect(formatters.value.formatDateRange('2024-03-03', '2024-03-05', DATE_OPTIONS)).toBe('3–5 مارس 2024')
    expect(formatters.value.formatNumberRange(100, 250)).toBe('100–250')
    expect(formatters.value.formatNumberRange(100, 250, { numberingSystem: 'arab' })).toBe('١٠٠–٢٥٠')
    expect(formatters.value.formatNumberRange(100, 250, { style: 'currency', currency: 'EGP' }))
      .toBe('\u200F100.00–250.00\u00A0ج.م.\u200F')
    expect(formatters.value.formatNumberRange(10n, 25n)).toBe('10–25')

    // Per-call options override the bound locale.
    expect(formatters.value.formatDateRange('2024-03-03', '2024-03-05', { ...DATE_OPTIONS, locale: 'en' }))
      .toBe('March 3\u2009–\u20095, 2024')
    expect(formatters.value.formatNumberRange(100, 250, { locale: 'en' })).toBe('100–250')

    rtl.setLocale('en')
    await nextTick()
    expect(formatters.value.formatNumberRange(100, 250)).toBe('100–250')
    expect(formatters.value.formatDateRange('2024-03-03', '2024-03-05', DATE_OPTIONS)).toBe('March 3\u2009–\u20095, 2024')
    rtl.dispose()
  })

  it('keeps the development/production split through the bound formatters', () => {
    const { rtl, formatters } = setup({ locales: ['ar-EG'], defaultLocale: 'ar-EG' })
    vi.stubEnv('NODE_ENV', 'development')
    expect(() => formatters.value.formatDateRange('not a date', '2024-03-05')).toThrow(TypeError)
    expect(() => formatters.value.formatNumberRange(NaN, 250)).toThrow(TypeError)
    vi.stubEnv('NODE_ENV', 'production')
    expect(formatters.value.formatDateRange('not a date', '2024-03-05')).toBe('')
    expect(formatters.value.formatNumberRange(NaN, 250)).toBe('')
    rtl.dispose()
  })
})