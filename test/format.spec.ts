import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import {
  formatCurrency,
  formatDate,
  formatNumber,
  transliterateDigits,
  withNumberingSystem,
} from '../src/format'
import { useFormat } from '../src/composables/useFormat'
import { createRtl } from '../src/core'
import { PDI } from '../src/bidi'

const ARABIC_INDIC = /[٠-٩]/

describe('withNumberingSystem', () => {
  it('appends the -u-nu- extension', () => {
    expect(withNumberingSystem('ar-EG', 'latn')).toBe('ar-EG-u-nu-latn')
  })

  it('extends an existing -u- section rather than duplicating it', () => {
    expect(withNumberingSystem('ar-EG-u-ca-gregory', 'latn')).toBe('ar-EG-u-ca-gregory-nu-latn')
  })

  it('leaves a tag that already names a numbering system alone', () => {
    expect(withNumberingSystem('ar-EG-u-nu-arab', 'latn')).toBe('ar-EG-u-nu-arab')
  })

  it('is a no-op without a numbering system', () => {
    expect(withNumberingSystem('ar-EG')).toBe('ar-EG')
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
    expect(out.startsWith('⁦')).toBe(true)
    expect(out.endsWith(PDI)).toBe(true)
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
})
