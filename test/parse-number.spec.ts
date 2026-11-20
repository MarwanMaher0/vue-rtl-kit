import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import {
  FORMATTER_CACHE_LIMIT,
  formatCurrency,
  formatNumber,
  formatterCacheStats,
  parseNumber,
  resetFormatterCaches,
} from '../src/format'
import * as entry from '../src/index'
import { useFormat } from '../src/composables/useFormat'
import { createRtl } from '../src/core'
import { RtlProvider } from '../src/components/RtlProvider'
import { FSI, LRI, LRM, PDI, RLI, RLM } from '../src/bidi'

const ALM = '\u061C'
const NBSP = '\u00A0'
const NNBSP = '\u202F'
const MINUS = '\u2212'
const ARABIC_PERCENT = '\u066A'

const LOCALES = ['en', 'ar-EG', 'ar-SA', 'ar-u-nu-latn', 'fa-IR', 'he', 'de', 'fr', 'en-IN'] as const
const VALUES = [0, -0.5, 42, -1234567.89, 0.125] as const

/** Every locale x value pair, so a failure names the pair that broke. */
const ROUND_TRIPS = LOCALES.flatMap(locale => VALUES.map(value => ({ locale, value })))

afterEach(() => {
  vi.restoreAllMocks()
  resetFormatterCaches()
})

describe('parseNumber', () => {
  describe('why it exists', () => {
    it.each(['ar-EG', 'fa-IR', 'he', 'de', 'fr'] as const)(
      'reads %s output that Number() turns into NaN',
      (locale) => {
        const formatted = formatNumber(-1234567.89, { locale })
        expect(Number(formatted)).toBeNaN()
        expect(parseNumber(formatted, { locale })).toBe(-1234567.89)
      },
    )
  })

  describe('round trip with formatNumber', () => {
    it.each(ROUND_TRIPS)('$locale: $value', ({ locale, value }) => {
      expect(parseNumber(formatNumber(value, { locale }), { locale })).toBe(value)
    })

    it.each(ROUND_TRIPS)('$locale: $value with isolate: true', ({ locale, value }) => {
      const formatted = formatNumber(value, { locale, isolate: true })
      expect(formatted.startsWith(FSI)).toBe(true)
      expect(formatted.endsWith(PDI)).toBe(true)
      expect(parseNumber(formatted, { locale })).toBe(value)
    })

    // Percent formatting rounds to whole percents by default, which would turn
    // 0.125 into 13%; ask for the fraction digits so the text carries the value.
    it.each(ROUND_TRIPS)('$locale: $value with style: percent', ({ locale, value }) => {
      const formatted = formatNumber(value, { locale, style: 'percent', maximumFractionDigits: 2 })
      expect(formatted).toMatch(/[%\u066A]/)
      expect(parseNumber(formatted, { locale })).toBe(value)
    })

    it.each(ROUND_TRIPS)('$locale: $value with style: percent and isolate: true', ({ locale, value }) => {
      const formatted = formatNumber(value, { locale, style: 'percent', maximumFractionDigits: 2, isolate: true })
      expect(parseNumber(formatted, { locale })).toBe(value)
    })

    it.each(['ltr', 'rtl', 'auto'] as const)('reads a result isolated as %s', (dir) => {
      expect(parseNumber(formatNumber(-1234567.89, { locale: 'ar-EG', isolate: dir }), { locale: 'ar-EG' }))
        .toBe(-1234567.89)
    })

    it('round-trips an explicit numbering system', () => {
      for (const value of VALUES) {
        for (const options of [
          { locale: 'ar-EG', numberingSystem: 'latn' },
          { locale: 'en', numberingSystem: 'arab' },
          { locale: 'fa-IR', numberingSystem: 'latn' },
          { locale: 'he', numberingSystem: 'arabext' },
          { locale: 'ar_EG', numberingSystem: 'arab' },
        ]) {
          expect(parseNumber(formatNumber(value, options), options)).toBe(value)
        }
      }
    })

    // Not on the supported list, but they prove nothing is hardcoded: U+2212
    // minus with NBSP groups (sv), apostrophe groups (de-CH), a bidi mark
    // after the sign (ps), Bengali and Devanagari digits.
    it.each([
      { locale: 'sv' },
      { locale: 'de-CH' },
      { locale: 'es' },
      { locale: 'ps' },
      { locale: 'ur' },
      { locale: 'bn' },
      { locale: 'hi', numberingSystem: 'deva' },
    ])('round-trips $locale from the separators and digits Intl reports', (options) => {
      for (const value of VALUES) {
        expect(parseNumber(formatNumber(value, options), options)).toBe(value)
        expect(parseNumber(formatNumber(value, { ...options, style: 'percent', maximumFractionDigits: 2 }), options))
          .toBe(value)
      }
    })

    it('keeps the fraction digits it is given', () => {
      const formatted = formatNumber(Math.PI, { locale: 'ar-EG', maximumFractionDigits: 15 })
      expect(parseNumber(formatted, { locale: 'ar-EG' })).toBe(Math.PI)
    })
  })

  describe('documented examples', () => {
    it('reads Arabic-Indic digits and separators', () => {
      expect(parseNumber('١٬٢٣٤٫٥', { locale: 'ar-EG' })).toBe(1234.5)
      expect(parseNumber('١٢٫٥٪', { locale: 'ar-EG' })).toBe(0.125)
    })

    it('reads Persian digits and separators', () => {
      expect(parseNumber('۱٬۲۳۴٫۵', { locale: 'fa-IR' })).toBe(1234.5)
      expect(parseNumber(`${MINUS}۱٬۲۳۴٫۵`, { locale: 'fa-IR' })).toBe(-1234.5)
    })

    it('reads comma decimals', () => {
      expect(parseNumber('1.234,5', { locale: 'de' })).toBe(1234.5)
      expect(parseNumber(`1${NNBSP}234,5`, { locale: 'fr' })).toBe(1234.5)
      expect(parseNumber('1 234,5', { locale: 'fr' })).toBe(1234.5)
    })

    it('defaults to English', () => {
      expect(parseNumber('1,234.5')).toBe(1234.5)
      expect(parseNumber('1,234.5', {})).toBe(1234.5)
      expect(parseNumber('1,234.5', { locale: undefined })).toBe(1234.5)
    })
  })

  describe('digits', () => {
    it.each(LOCALES)('reads Western, Arabic-Indic and Persian digits in %s', (locale) => {
      expect(parseNumber('1234567890', { locale })).toBe(1234567890)
      expect(parseNumber('١٢٣٤٥٦٧٨٩٠', { locale })).toBe(1234567890)
      expect(parseNumber('۱۲۳۴۵۶۷۸۹۰', { locale })).toBe(1234567890)
    })

    it('reads digits from more than one system in the same text', () => {
      expect(parseNumber('1٢۳', { locale: 'en' })).toBe(123)
      expect(parseNumber('١2۳٫4', { locale: 'ar-EG' })).toBe(123.4)
    })

    it('reads the digits of the requested numbering system', () => {
      expect(parseNumber('१२३', { locale: 'hi', numberingSystem: 'deva' })).toBe(123)
      expect(parseNumber('১২৩', { locale: 'en', numberingSystem: 'beng' })).toBe(123)
      expect(parseNumber('123', { locale: 'en', numberingSystem: 'beng' })).toBe(123)
      expect(parseNumber('১2٣', { locale: 'en', numberingSystem: 'beng' })).toBe(123)
    })

    it('rejects the digits of a numbering system that was not asked for', () => {
      expect(parseNumber('१२३', { locale: 'en' })).toBeNaN()
      expect(parseNumber('１２３', { locale: 'en' })).toBeNaN()
    })

    it('keeps leading zeros decimal', () => {
      expect(parseNumber('007')).toBe(7)
      expect(parseNumber('٠٠٧', { locale: 'ar-EG' })).toBe(7)
    })
  })

  describe('ignored characters', () => {
    it.each([
      ['U+061C ARABIC LETTER MARK', ALM],
      ['U+200E LEFT-TO-RIGHT MARK', LRM],
      ['U+200F RIGHT-TO-LEFT MARK', RLM],
      ['U+2066 LEFT-TO-RIGHT ISOLATE', LRI],
      ['U+2067 RIGHT-TO-LEFT ISOLATE', RLI],
      ['U+2068 FIRST STRONG ISOLATE', FSI],
      ['U+2069 POP DIRECTIONAL ISOLATE', PDI],
      ['U+00A0 NO-BREAK SPACE', NBSP],
      ['U+202F NARROW NO-BREAK SPACE', NNBSP],
      ['U+0020 SPACE', ' '],
    ])('strips %s wherever it appears', (_name, char) => {
      expect(parseNumber(`${char}-1,234.5${char}`)).toBe(-1234.5)
      expect(parseNumber(`-${char}1${char},${char}234${char}.${char}5`)).toBe(-1234.5)
      expect(parseNumber(`${char}${char}12${char}%${char}`)).toBe(0.12)
      expect(parseNumber(`${char}١٬٢٣٤${char}٫٥${char}`, { locale: 'ar-EG' })).toBe(1234.5)
    })

    it('returns NaN when nothing but ignored characters is left', () => {
      for (const text of [' ', `${NBSP}${NNBSP}`, `${FSI}${PDI}`, `${ALM}${LRM}${RLM}`, `${LRI} ${PDI}`]) {
        expect(parseNumber(text)).toBeNaN()
      }
    })

    it('does not strip embeddings or overrides, which can reverse what is displayed', () => {
      for (const control of ['\u202A', '\u202B', '\u202C', '\u202D', '\u202E']) {
        expect(parseNumber(`${control}21`)).toBeNaN()
      }
    })

    it('does not strip other whitespace or invisible characters', () => {
      for (const char of ['\t', '\n', '\u2009', '\u200B', '\u200D', '\uFEFF']) {
        expect(parseNumber(`12${char}`)).toBeNaN()
      }
    })
  })

  describe('signs', () => {
    it.each(LOCALES)('accepts an ASCII hyphen and U+2212 as minus in %s', (locale) => {
      expect(parseNumber('-42', { locale })).toBe(-42)
      expect(parseNumber(`${MINUS}42`, { locale })).toBe(-42)
      expect(parseNumber(`${MINUS}٤٢`, { locale })).toBe(-42)
      expect(parseNumber(`${LRM}-${LRM}42`, { locale })).toBe(-42)
    })

    it.each(LOCALES)('accepts a leading plus in %s', (locale) => {
      expect(parseNumber('+42', { locale })).toBe(42)
      expect(parseNumber('+ ٤٢', { locale })).toBe(42)
      expect(parseNumber(formatNumber(42, { locale, signDisplay: 'always' }), { locale })).toBe(42)
    })

    it('keeps the sign of zero', () => {
      expect(parseNumber('0')).toBe(0)
      expect(parseNumber('-0')).toBe(-0)
      expect(parseNumber('-0.0%')).toBe(-0)
    })

    it.each(['--5', '+-5', '-+5', '++5', '5-', '5+', '1-2', '1+2', '-', '+', MINUS, `${MINUS}${MINUS}5`, '- -5'])(
      'rejects %j',
      (text) => {
        expect(parseNumber(text)).toBeNaN()
      },
    )
  })

  describe('percent', () => {
    it('divides by 100 for a trailing percent sign or U+066A', () => {
      expect(parseNumber('50%')).toBe(0.5)
      expect(parseNumber(`50${ARABIC_PERCENT}`)).toBe(0.5)
      expect(parseNumber('-12.5%')).toBe(-0.125)
      expect(parseNumber(`${ALM}-١٢٫٥${ARABIC_PERCENT}${ALM}`, { locale: 'ar-EG' })).toBe(-0.125)
      expect(parseNumber('٥٠%', { locale: 'ar-EG' })).toBe(0.5)
      expect(parseNumber(`12,5${NBSP}%`, { locale: 'de' })).toBe(0.125)
      expect(parseNumber('1,234%')).toBe(12.34)
      expect(parseNumber('0%')).toBe(0)
      expect(parseNumber('.5%')).toBe(0.005)
      expect(parseNumber('5.%')).toBe(0.05)
    })

    it('moves the decimal point exactly instead of dividing in floating point', () => {
      expect(5.6 / 100).not.toBe(0.056)
      expect(parseNumber('5.6%')).toBe(0.056)
      expect(parseNumber('0.07%')).toBe(0.0007)
      expect(parseNumber(formatNumber(0.056, { locale: 'ar-EG', style: 'percent', maximumFractionDigits: 1 }), { locale: 'ar-EG' }))
        .toBe(0.056)
    })

    it.each(['%', ARABIC_PERCENT, '%50', `${ARABIC_PERCENT}50`, '50%%', `50%${ARABIC_PERCENT}`, '5%0', '-%50', '50 % %', '.%', '-%'])(
      'rejects %j',
      (text) => {
        expect(parseNumber(text)).toBeNaN()
      },
    )
  })

  describe('group separators', () => {
    it('reads en-IN lakh grouping', () => {
      expect(formatNumber(1234567.891, { locale: 'en-IN' })).toBe('12,34,567.891')
      expect(parseNumber('12,34,567.891', { locale: 'en-IN' })).toBe(1234567.891)
      expect(parseNumber('-12,34,567.89', { locale: 'en-IN' })).toBe(-1234567.89)
      expect(parseNumber('1,23,45,67,890', { locale: 'en-IN' })).toBe(1234567890)
    })

    it('accepts a group separator between any two digits of the integer part', () => {
      expect(parseNumber('1,234,567')).toBe(1234567)
      expect(parseNumber('12,34,567')).toBe(1234567)
      expect(parseNumber('1,2')).toBe(12)
      expect(parseNumber('1.234.567', { locale: 'de' })).toBe(1234567)
      expect(parseNumber('١٬٢٣٤٬٥٦٧', { locale: 'ar-EG' })).toBe(1234567)
    })

    it.each([
      { text: ',123', locale: 'en', why: 'leads' },
      { text: '123,', locale: 'en', why: 'trails' },
      { text: '-,123', locale: 'en', why: 'follows the sign' },
      { text: '1,,234', locale: 'en', why: 'is doubled' },
      { text: '1,.5', locale: 'en', why: 'touches the decimal separator' },
      { text: '1,234,.5', locale: 'en', why: 'touches the decimal separator' },
      { text: '.1,5', locale: 'en', why: 'follows the decimal separator' },
      { text: '1.5,2', locale: 'en', why: 'follows the decimal separator' },
      { text: '1.234,567', locale: 'en', why: 'follows the decimal separator' },
      { text: '1,234%,', locale: 'en', why: 'follows the percent sign' },
      { text: '.123', locale: 'de', why: 'leads' },
      { text: '123.', locale: 'de', why: 'trails' },
      { text: '1,5.2', locale: 'de', why: 'follows the decimal separator' },
      { text: '٬١٢٣', locale: 'ar-EG', why: 'leads' },
      { text: '١٢٣٬', locale: 'ar-EG', why: 'trails' },
      { text: '١٫٥٬٢', locale: 'ar-EG', why: 'follows the decimal separator' },
    ])('rejects $text in $locale: the group separator $why', ({ text, locale }) => {
      expect(parseNumber(text, { locale })).toBeNaN()
    })

    describe('in a locale that groups with a space', () => {
      const SPACES = [
        ['U+0020 SPACE', ' '],
        ['U+00A0 NO-BREAK SPACE', NBSP],
        ['U+202F NARROW NO-BREAK SPACE', NNBSP],
      ] as const
      // fr groups with U+202F and sv with U+00A0; whichever space is typed counts.
      const SPACED = ['fr', 'sv'] as const
      const CASES = SPACED.flatMap(locale => SPACES.map(([name, space]) => ({ locale, name, space })))

      it('groups with a space in fr and sv', () => {
        for (const locale of SPACED) {
          expect(formatNumber(1234567, { locale })).toMatch(/^1[\u00A0\u202F ]234[\u00A0\u202F ]567$/)
        }
      })

      it.each(CASES)('$locale: reads $name between digits of the integer part', ({ locale, space }) => {
        expect(parseNumber(`1${space}234,5`, { locale })).toBe(1234.5)
        expect(parseNumber(`1${space}234${space}567,89`, { locale })).toBe(1234567.89)
        expect(parseNumber(`-1${space}234${space}567`, { locale })).toBe(-1234567)
        expect(parseNumber(`1${space}2`, { locale })).toBe(12)
        expect(parseNumber(`١${space}٢٣٤,٥`, { locale })).toBe(1234.5)
        expect(parseNumber(`1${space}${space}234,5`, { locale })).toBe(1234.5)
      })

      it.each(CASES)('$locale: rejects $name between digits after the decimal separator', ({ locale, space }) => {
        expect(parseNumber(`1,2${space}3`, { locale })).toBeNaN()
        expect(parseNumber(`1,2${space}${space}3`, { locale })).toBeNaN()
        expect(parseNumber(`1${space}234,5${space}6`, { locale })).toBeNaN()
        expect(parseNumber(`1${space}234,567${space}89`, { locale })).toBeNaN()
        expect(parseNumber(`,2${space}3`, { locale })).toBeNaN()
        expect(parseNumber(`-1,2${space}3${space}%`, { locale })).toBeNaN()
        expect(parseNumber(`١,٢${space}٣`, { locale })).toBeNaN()
        expect(parseNumber(`1,2${LRM}${space}${LRM}3`, { locale })).toBeNaN()
        expect(parseNumber(`${FSI}1,2${space}3${PDI}`, { locale })).toBeNaN()
      })

      it('rejects a mix of spaces after the decimal separator', () => {
        expect(parseNumber(`1,2 ${NBSP}${NNBSP}3`, { locale: 'fr' })).toBeNaN()
        expect(parseNumber(`1${NNBSP}234,5 6`, { locale: 'fr' })).toBeNaN()
        expect(parseNumber(`1 234,5${NNBSP}6`, { locale: 'fr' })).toBeNaN()
      })

      it.each(CASES)('$locale: still drops $name that is not between two digits', ({ locale, space }) => {
        expect(parseNumber(`${space}42${space}`, { locale })).toBe(42)
        expect(parseNumber(`-${space}42`, { locale })).toBe(-42)
        expect(parseNumber(`+${space}42`, { locale })).toBe(42)
        expect(parseNumber(`12,5${space}%`, { locale })).toBe(0.125)
        expect(parseNumber(`-1${space}234,5${space}%${space}`, { locale })).toBe(-12.345)
        expect(parseNumber(`1${space},${space}5`, { locale })).toBe(1.5)
        expect(parseNumber(`${space}`, { locale })).toBeNaN()
        expect(parseNumber(`${space},${space}`, { locale })).toBeNaN()
      })

      it.each(SPACED)('round-trips %s output, where the space before the percent sign is not a group separator', (locale) => {
        for (const value of [...VALUES, 1234567.891, -0.00125]) {
          expect(parseNumber(formatNumber(value, { locale, maximumFractionDigits: 5 }), { locale })).toBe(value)
          expect(parseNumber(formatNumber(value, { locale, style: 'percent', maximumFractionDigits: 3, isolate: true }), { locale }))
            .toBe(value)
        }
      })

      it('leaves spaces alone where the locale groups with something else', () => {
        for (const space of [' ', NBSP, NNBSP]) {
          expect(parseNumber(`1.2${space}3`, { locale: 'en' })).toBe(1.23)
          expect(parseNumber(`1,2${space}3`, { locale: 'de' })).toBe(1.23)
          expect(parseNumber(`١٫٢${space}٣`, { locale: 'ar-EG' })).toBe(1.23)
          expect(parseNumber(`1${space}234.5`, { locale: 'en' })).toBe(1234.5)
        }
      })
    })
  })

  describe('decimal separator', () => {
    it('accepts a missing integer or fraction part, as Number() does', () => {
      expect(parseNumber('.5')).toBe(0.5)
      expect(parseNumber('-.5')).toBe(-0.5)
      expect(parseNumber('5.')).toBe(5)
      expect(parseNumber('1,234.')).toBe(1234)
      expect(parseNumber(',5', { locale: 'de' })).toBe(0.5)
      expect(parseNumber('٫٥', { locale: 'ar-EG' })).toBe(0.5)
    })

    it.each([
      { text: '1.2.3', locale: 'en' },
      { text: '1..2', locale: 'en' },
      { text: '..5', locale: 'en' },
      { text: '1.2.', locale: 'en' },
      { text: '1,2,3', locale: 'de' },
      { text: '1,,2', locale: 'de' },
      { text: '١٫٢٫٣', locale: 'ar-EG' },
      { text: '۱٫۲٫۳', locale: 'fa-IR' },
    ])('rejects a second decimal separator: $text in $locale', ({ text, locale }) => {
      expect(parseNumber(text, { locale })).toBeNaN()
    })

    it.each([
      { text: '.', locale: 'en' },
      { text: ',', locale: 'en' },
      { text: '-.', locale: 'en' },
      { text: '+,', locale: 'en' },
      { text: ' . ', locale: 'en' },
      { text: ',', locale: 'de' },
      { text: '.', locale: 'de' },
      { text: '٫', locale: 'ar-EG' },
      { text: '٬', locale: 'ar-EG' },
      { text: `${ALM}-٫`, locale: 'ar-EG' },
      { text: ',', locale: 'fr' },
      { text: NNBSP, locale: 'fr' },
    ])('rejects a lone separator: $text in $locale', ({ text, locale }) => {
      expect(parseNumber(text, { locale })).toBeNaN()
    })
  })

  describe('separators belong to the locale and numbering system', () => {
    it('reads the same text differently per locale', () => {
      expect(parseNumber('1.234', { locale: 'en' })).toBe(1.234)
      expect(parseNumber('1.234', { locale: 'de' })).toBe(1234)
      expect(parseNumber('1,234', { locale: 'en' })).toBe(1234)
      expect(parseNumber('1,234', { locale: 'de' })).toBe(1.234)
    })

    it('rejects a separator the locale does not use', () => {
      expect(parseNumber('1.234,5', { locale: 'en' })).toBeNaN()
      expect(parseNumber('1,234.5', { locale: 'de' })).toBeNaN()
      expect(parseNumber('1.5', { locale: 'fr' })).toBeNaN()
      expect(parseNumber('١٫٥', { locale: 'en' })).toBeNaN()
      expect(parseNumber("1'234", { locale: 'en' })).toBeNaN()
      expect(parseNumber('1_234', { locale: 'en' })).toBeNaN()
      expect(parseNumber('1·5', { locale: 'en' })).toBeNaN()
    })

    it('follows the numbering system for an Arabic locale', () => {
      // ar-EG formats with Arabic-Indic digits and ٬ ٫ - unless Western digits are asked for.
      expect(parseNumber('١٬٢٣٤٫٥', { locale: 'ar-EG' })).toBe(1234.5)
      expect(parseNumber('1,234.5', { locale: 'ar-EG' })).toBeNaN()
      expect(parseNumber('1,234.5', { locale: 'ar-EG', numberingSystem: 'latn' })).toBe(1234.5)
      expect(parseNumber('١٬٢٣٤٫٥', { locale: 'ar-EG', numberingSystem: 'latn' })).toBeNaN()
      expect(parseNumber('1234', { locale: 'ar-EG' })).toBe(1234)
      expect(parseNumber('١٬٢٣٤٫٥', { locale: 'en', numberingSystem: 'arab' })).toBe(1234.5)
    })

    it('honours a numbering system written into the locale tag', () => {
      expect(parseNumber('1,234.5', { locale: 'ar-u-nu-latn' })).toBe(1234.5)
      expect(parseNumber('١٬٢٣٤٫٥', { locale: 'en-u-nu-arab' })).toBe(1234.5)
      // The tag wins over the option, as it does in formatNumber().
      expect(parseNumber('1,234.5', { locale: 'ar-EG-u-nu-latn', numberingSystem: 'arab' })).toBe(1234.5)
    })

    it('falls back like formatNumber() for bad locales and numbering systems', () => {
      expect(parseNumber('١٬٢٣٤٫٥', { locale: 'ar_EG' })).toBe(1234.5)
      expect(parseNumber('1.234,5', { locale: 'de-!!' })).toBe(1234.5)
      expect(parseNumber('1,234.5', { locale: 'not a locale' })).toBe(1234.5)
      expect(parseNumber('1,234.5', { locale: '' })).toBe(1234.5)
      expect(parseNumber('1,234.5', { locale: 'ar-EG', numberingSystem: 'invalid' })).toBe(1234.5)
      expect(parseNumber('1,234.5', { locale: 'ar-EG', numberingSystem: '' })).toBe(1234.5)
    })
  })

  describe('garbage', () => {
    it.each([
      '',
      'abc',
      '12abc',
      'abc12',
      '1a2',
      '١٢س',
      'NaN',
      'Infinity',
      '-Infinity',
      '1e5',
      '1E5',
      '1e-2',
      '0x1F',
      '0b11',
      '1_000',
      '$5',
      '5$',
      '€ 5',
      '5 EGP',
      '(5)',
      '5!',
      '1/2',
      '1:30',
      '½',
      'Ⅻ',
      '?',
      '12?',
      '1?2',
      'null',
      'undefined',
      'true',
      '[object Object]',
      '12-05-2024',
      '1,234.5.6',
      '😀',
      '٪',
      '٫٬',
      'e-2',
      '%e-2',
    ])('returns NaN for %j', (text) => {
      for (const locale of LOCALES) expect(parseNumber(text, { locale })).toBeNaN()
    })

    it('returns NaN for currency output: it parses plain numbers only', () => {
      expect(parseNumber(formatCurrency(2500, 'EGP', { locale: 'ar-EG' }), { locale: 'ar-EG' })).toBeNaN()
      expect(parseNumber(formatCurrency(2500, 'USD', { locale: 'en' }), { locale: 'en' })).toBeNaN()
      expect(parseNumber(formatNumber(1500, { locale: 'en', notation: 'compact' }), { locale: 'en' })).toBeNaN()
    })

    it('never throws, whatever it is handed', () => {
      const inputs: unknown[] = [
        undefined,
        null,
        42,
        Number.NaN,
        true,
        {},
        [],
        ['1'],
        Symbol('1'),
        10n,
        () => '1',
        new Date(0),
        { toString: () => { throw new Error('boom') } },
      ]
      for (const input of inputs) {
        expect(() => parseNumber(input as string)).not.toThrow()
        expect(parseNumber(input as string)).toBeNaN()
        expect(parseNumber(input as string, { locale: 'ar-EG' })).toBeNaN()
      }
    })

    it('never throws for options that are not what the types say', () => {
      expect(parseNumber('5', null as never)).toBeNaN()
      expect(parseNumber('5', { locale: null as never })).toBeNaN()
      expect(parseNumber('5', { locale: 5 as never })).toBeNaN()
      expect(parseNumber('5', { numberingSystem: null as never })).toBe(5)
    })

    it('returns NaN when Intl itself fails', () => {
      resetFormatterCaches()
      vi.spyOn(Intl.NumberFormat.prototype, 'formatToParts').mockImplementation(() => {
        throw new RangeError('no Intl today')
      })
      expect(parseNumber('5')).toBeNaN()
    })

    it('survives very long input', () => {
      expect(parseNumber('1'.repeat(400))).toBe(Number.POSITIVE_INFINITY)
      expect(parseNumber(`0.${'0'.repeat(400)}1`)).toBe(0)
      expect(parseNumber(`${'1,'.repeat(50_000)}1`)).toBe(Number.POSITIVE_INFINITY)
      expect(parseNumber(`${'1'.repeat(50_000)}x`)).toBeNaN()
      expect(parseNumber(`${'1,'.repeat(50_000)}`)).toBeNaN()
    })
  })

  describe('separators come from Intl', () => {
    const part = (type: Intl.NumberFormatPartTypes, value: string): Intl.NumberFormatPart => ({ type, value })

    it('uses whatever formatToParts reports, not a table', () => {
      resetFormatterCaches()
      vi.spyOn(Intl.NumberFormat.prototype, 'formatToParts').mockReturnValue([
        part('literal', '<'),
        part('minusSign', '~'),
        part('integer', '9'),
        part('group', '_'),
        part('integer', '876'),
        part('group', '_'),
        part('integer', '543'),
        part('group', '_'),
        part('integer', '210'),
        part('decimal', '!'),
        part('fraction', '5'),
        part('literal', '>'),
      ])
      expect(parseNumber('~1_234!5', { locale: 'en' })).toBe(-1234.5)
      expect(parseNumber('-1_234!5', { locale: 'en' })).toBe(-1234.5)
      expect(parseNumber(`${MINUS}1_234!5%`, { locale: 'en' })).toBe(-12.345)
      expect(parseNumber('1,234.5', { locale: 'en' })).toBeNaN()
      expect(parseNumber('<1>', { locale: 'en' })).toBeNaN()
    })

    it('keeps reading Western digits when the reported parts are not the ten digits', () => {
      resetFormatterCaches()
      vi.spyOn(Intl.NumberFormat.prototype, 'formatToParts').mockReturnValue([
        part('minusSign', '~'),
        part('integer', '1'),
        part('group', '_'),
        part('integer', '234'),
        part('decimal', '!'),
        part('fraction', '5'),
      ])
      expect(parseNumber('~1_234!5', { locale: 'en' })).toBe(-1234.5)
      expect(parseNumber('٩_٨٧٦!٥', { locale: 'en' })).toBe(9876.5)

      resetFormatterCaches()
      vi.mocked(Intl.NumberFormat.prototype.formatToParts).mockReturnValue([
        part('integer', 'abc'),
        part('decimal', '!'),
      ])
      expect(parseNumber('12!5', { locale: 'en' })).toBe(12.5)
      expect(parseNumber('ab!c', { locale: 'en' })).toBeNaN()
    })

    it('reads digits from the integer parts, 9 down to 0', () => {
      resetFormatterCaches()
      vi.spyOn(Intl.NumberFormat.prototype, 'formatToParts').mockReturnValue([
        part('integer', 'j'),
        part('group', ','),
        part('integer', 'ihg'),
        part('group', ','),
        part('integer', 'fed'),
        part('group', ','),
        part('integer', 'cba'),
        part('decimal', '.'),
        part('fraction', 'f'),
      ])
      expect(parseNumber('b,cde.fghija', { locale: 'en' })).toBe(1234.567890)
      expect(parseNumber('b2٣۴', { locale: 'en' })).toBe(1234)
    })

    it('counts a digit outside the BMP as one digit, not two code units', () => {
      resetFormatterCaches()
      // MATHEMATICAL BOLD DIGIT NINE down to ZERO, U+1D7D7..U+1D7CE.
      const bold = Array.from({ length: 10 }, (_, i) => String.fromCodePoint(0x1D7D7 - i))
      vi.spyOn(Intl.NumberFormat.prototype, 'formatToParts').mockReturnValue([
        part('integer', bold[0]!),
        part('group', ','),
        part('integer', bold.slice(1, 4).join('')),
        part('group', ','),
        part('integer', bold.slice(4, 7).join('')),
        part('group', ','),
        part('integer', bold.slice(7).join('')),
        part('decimal', '.'),
        part('fraction', bold[4]!),
      ])
      const digit = (value: number) => bold[9 - value]!
      expect(parseNumber(`${digit(1)},${digit(2)}${digit(3)}${digit(4)}.${digit(5)}`, { locale: 'en' })).toBe(1234.5)
      expect(parseNumber(`${digit(9)}${digit(0)}7`, { locale: 'en' })).toBe(907)
      // Half a surrogate pair is not a digit.
      expect(parseNumber(digit(1).slice(0, 1), { locale: 'en' })).toBeNaN()
    })

    it('drops a bidi mark an engine keeps inside the sign, and a space used for grouping', () => {
      resetFormatterCaches()
      vi.spyOn(Intl.NumberFormat.prototype, 'formatToParts').mockReturnValue([
        part('minusSign', `${LRM}${MINUS}`),
        part('integer', '9'),
        part('group', NBSP),
        part('integer', '876'),
        part('group', NBSP),
        part('integer', '543'),
        part('group', NBSP),
        part('integer', '210'),
        part('decimal', ','),
        part('fraction', '5'),
      ])
      expect(parseNumber(`${LRM}${MINUS}1${NBSP}234,5`, { locale: 'he' })).toBe(-1234.5)
      expect(parseNumber('-1 234,5', { locale: 'he' })).toBe(-1234.5)
      expect(parseNumber(`1,2${NBSP}3`, { locale: 'he' })).toBeNaN()
      expect(parseNumber('1,2 3', { locale: 'he' })).toBeNaN()
    })

    it('accepts no group separator and only ASCII or U+2212 minus when Intl reports none', () => {
      resetFormatterCaches()
      vi.spyOn(Intl.NumberFormat.prototype, 'formatToParts').mockReturnValue([
        part('integer', '9876543210'),
        part('decimal', '.'),
        part('fraction', '5'),
      ])
      expect(parseNumber('1234.5')).toBe(1234.5)
      expect(parseNumber('-1234.5')).toBe(-1234.5)
      expect(parseNumber(`${MINUS}1234.5`)).toBe(-1234.5)
      expect(parseNumber('1,234.5')).toBeNaN()
    })

    it('asks Intl once per locale and numbering system', () => {
      resetFormatterCaches()
      const toParts = vi.spyOn(Intl.NumberFormat.prototype, 'formatToParts')
      // A bare spy would hand back an object formatToParts refuses as its
      // receiver; forward to the real constructor instead.
      const Original = Intl.NumberFormat as unknown as new (...args: unknown[]) => Intl.NumberFormat
      const ctor = vi.spyOn(Intl, 'NumberFormat').mockImplementation(function (...args: unknown[]) {
        return new Original(...args)
      } as never)

      for (let i = 0; i < 50; i++) {
        expect(parseNumber(`${i}`, { locale: 'ar-EG' })).toBe(i)
        expect(parseNumber('x', { locale: 'ar-EG' })).toBeNaN()
      }
      expect(toParts).toHaveBeenCalledTimes(1)
      expect(ctor).toHaveBeenCalledTimes(1)

      parseNumber('1', { locale: 'ar-EG', numberingSystem: 'latn' })
      parseNumber('1', { locale: 'ar-EG-u-nu-latn' })
      parseNumber('1', { locale: 'ar_EG', numberingSystem: 'latn' })
      expect(toParts).toHaveBeenCalledTimes(2)

      parseNumber('1', { locale: 'de' })
      parseNumber('1', { locale: 'de' })
      expect(toParts).toHaveBeenCalledTimes(3)
    })

    it('is cleared by resetFormatterCaches()', () => {
      resetFormatterCaches()
      const toParts = vi.spyOn(Intl.NumberFormat.prototype, 'formatToParts')

      parseNumber('1', { locale: 'de' })
      parseNumber('1', { locale: 'de' })
      expect(toParts).toHaveBeenCalledTimes(1)

      resetFormatterCaches()
      parseNumber('1', { locale: 'de' })
      expect(toParts).toHaveBeenCalledTimes(2)

      // A reset really drops what was cached: new separators are picked up.
      resetFormatterCaches()
      toParts.mockReturnValue([part('integer', '9876543210'), part('decimal', '!')])
      expect(parseNumber('1!5', { locale: 'de' })).toBe(1.5)
      toParts.mockRestore()
      expect(parseNumber('1!5', { locale: 'de' })).toBe(1.5)
      resetFormatterCaches()
      expect(parseNumber('1!5', { locale: 'de' })).toBeNaN()
      expect(parseNumber('1,5', { locale: 'de' })).toBe(1.5)
    })

    it('bounds the cache to FORMATTER_CACHE_LIMIT and evicts the least recently used locale', () => {
      resetFormatterCaches()
      const toParts = vi.spyOn(Intl.NumberFormat.prototype, 'formatToParts')
      const locales = Array.from({ length: FORMATTER_CACHE_LIMIT + 1 }, (_, i) => `en-u-nu-latn-x-k${i}`)

      for (const locale of locales) parseNumber('1', { locale })
      expect(toParts).toHaveBeenCalledTimes(locales.length)

      toParts.mockClear()
      parseNumber('1', { locale: locales.at(-1)! })
      parseNumber('1', { locale: locales[1]! })
      expect(toParts).not.toHaveBeenCalled()

      parseNumber('1', { locale: locales[0]! })
      expect(toParts).toHaveBeenCalledTimes(1)
    })

    it('keeps its cache apart from the formatter caches', () => {
      resetFormatterCaches()
      parseNumber('1', { locale: 'ar-EG' })
      parseNumber('1', { locale: 'de' })
      expect(formatterCacheStats()).toEqual({ number: 0, date: 0, list: 0, relativeTime: 0, limit: FORMATTER_CACHE_LIMIT })
    })
  })

  describe('exports', () => {
    it('is exported from the package entry', () => {
      expect(entry.parseNumber).toBe(parseNumber)
      const options: entry.ParseNumberOptions = { locale: 'ar-EG', numberingSystem: 'arab' }
      expect(entry.parseNumber(entry.formatNumber(1234.5, options), options)).toBe(1234.5)
    })
  })
})

describe('useFormat().parseNumber', () => {
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

  it('reads back what the bound formatNumber writes, and follows setLocale()', async () => {
    const { rtl, formatters } = setup({ locales: ['en', 'ar-EG', 'de'], defaultLocale: 'en' })
    expect(formatters.value.parseNumber('1,234.5')).toBe(1234.5)
    expect(formatters.value.parseNumber(formatters.value.formatNumber(-1234567.89))).toBe(-1234567.89)

    rtl.setLocale('ar-EG')
    await nextTick()
    expect(formatters.value.parseNumber('١٬٢٣٤٫٥')).toBe(1234.5)
    expect(formatters.value.parseNumber('1,234.5')).toBeNaN()
    expect(formatters.value.parseNumber(formatters.value.formatNumber(-1234567.89))).toBe(-1234567.89)
    expect(formatters.value.parseNumber(formatters.value.formatNumber(0.125, { style: 'percent', maximumFractionDigits: 1, isolate: true })))
      .toBe(0.125)

    rtl.setLocale('de')
    await nextTick()
    expect(formatters.value.parseNumber('1.234,5')).toBe(1234.5)
    expect(formatters.value.parseNumber('abc')).toBeNaN()
    expect(formatters.value.parseNumber('')).toBeNaN()
    rtl.dispose()
  })

  it('applies the configured numbering system', () => {
    const { rtl, formatters } = setup({
      locales: ['ar-EG'],
      defaultLocale: 'ar-EG',
      numberingSystem: { ar: 'latn' },
    })
    expect(formatters.value.formatNumber(1234.5)).toBe('1,234.5')
    expect(formatters.value.parseNumber('1,234.5')).toBe(1234.5)
    expect(formatters.value.parseNumber('١٬٢٣٤٫٥')).toBeNaN()
    expect(formatters.value.parseNumber(formatters.value.formatNumber(-1234567.89))).toBe(-1234567.89)
    rtl.dispose()
  })

  it('lets per-call options override the bound locale and numbering system', () => {
    const { rtl, formatters } = setup({
      locales: ['ar-EG'],
      defaultLocale: 'ar-EG',
      numberingSystem: 'latn',
    })
    expect(formatters.value.parseNumber('1.234,5', { locale: 'de' })).toBe(1234.5)
    expect(formatters.value.parseNumber('١٬٢٣٤٫٥', { numberingSystem: 'arab' })).toBe(1234.5)
    rtl.dispose()
  })

  it('binds to the nearest RtlProvider scope', () => {
    const rtl = createRtl({ syncDocument: false, locales: ['en', 'ar-EG'], defaultLocale: 'en' })
    let scoped: ReturnType<typeof useFormat> | undefined
    const Probe = defineComponent({
      setup() {
        scoped = useFormat()
        return () => h('i')
      },
    })
    mount(
      defineComponent({ render: () => h(RtlProvider, { dir: 'rtl', locale: 'ar-EG' }, () => h(Probe)) }),
      { global: { plugins: [rtl] } },
    )
    expect(scoped!.value.locale).toBe('ar-EG')
    expect(scoped!.value.parseNumber('١٬٢٣٤٫٥')).toBe(1234.5)
    rtl.dispose()
  })

  it('never throws from the bound function either', () => {
    const { rtl, formatters } = setup({ locales: ['en-!!'], defaultLocale: 'en-!!' })
    expect(formatters.value.parseNumber('1,234.5')).toBe(1234.5)
    expect(formatters.value.parseNumber(undefined as never)).toBeNaN()
    rtl.dispose()
  })
})
