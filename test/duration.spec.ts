/**
 * formatDuration: locale-aware durations.
 *
 * Covers the plural forms of every unit (one, dual, 3-10, 11+, 100) in
 * Arabic, Persian, Hebrew and English with both digit shapes, combined
 * durations, digital style, balancing and maxUnits rounding, negative,
 * fractional and zero durations, the Intl.DurationFormat path, the fallback
 * with Intl.DurationFormat stubbed away, and the development/production
 * contract for invalid input.
 *
 * The expected strings are CLDR 48 data, as shipped with the current Node 20
 * and 22 releases and with the Chromium the browser tests run in.
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatDuration, transliterateDigits } from '../src'
import type { DurationInput, DurationStyle, DurationUnit, FormatDurationOptions } from '../src'
import { DURATION_CACHE_LIMIT, durationCacheStats, resetDurationCache } from '../src/duration'

const UNITS: DurationUnit[] = ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds', 'milliseconds']
const COUNTS = [1, 2, 3, 10, 11, 100] as const

type UnitTable = Record<DurationUnit, readonly string[]>

/**
 * Arabic, long style, Western digits: no number for one and two, the plural
 * for 3-10, the accusative singular for 11-99, the singular again for 100.
 */
const ARABIC: UnitTable = {
  years: ['سنة', 'سنتان', '3 سنوات', '10 سنوات', '11 سنة', '100 سنة'],
  months: ['شهر', 'شهران', '3 أشهر', '10 أشهر', '11 شهرًا', '100 شهر'],
  weeks: ['أسبوع', 'أسبوعان', '3 أسابيع', '10 أسابيع', '11 أسبوعًا', '100 أسبوع'],
  days: ['يوم', 'يومان', '3 أيام', '10 أيام', '11 يومًا', '100 يوم'],
  hours: ['ساعة', 'ساعتان', '3 ساعات', '10 ساعات', '11 ساعة', '100 ساعة'],
  minutes: ['دقيقة', 'دقيقتان', '3 دقائق', '10 دقائق', '11 دقيقة', '100 دقيقة'],
  seconds: ['ثانية', 'ثانيتان', '3 ثوان', '10 ثوان', '11 ثانية', '100 ثانية'],
  milliseconds: ['1 ملي ثانية', '2 ملي ثانية', '3 ملي ثانية', '10 ملي ثانية', '11 ملي ثانية', '100 ملي ثانية'],
}

/** Saudi Arabic writes the tanwin on the 3-10 form of "seconds". */
const ARABIC_SAUDI: UnitTable = {
  ...ARABIC,
  seconds: ['ثانية', 'ثانيتان', '3 ثوانٍ', '10 ثوانٍ', '11 ثانية', '100 ثانية'],
}

const ARABIC_LOCALES: Record<string, UnitTable> = { 'ar': ARABIC, 'ar-EG': ARABIC, 'ar-SA': ARABIC_SAUDI }

/** Persian has one form for every count and its own digits. */
const PERSIAN: UnitTable = {
  years: ['۱ سال', '۲ سال', '۳ سال', '۱۰ سال', '۱۱ سال', '۱۰۰ سال'],
  months: ['۱ ماه', '۲ ماه', '۳ ماه', '۱۰ ماه', '۱۱ ماه', '۱۰۰ ماه'],
  weeks: ['۱ هفته', '۲ هفته', '۳ هفته', '۱۰ هفته', '۱۱ هفته', '۱۰۰ هفته'],
  days: ['۱ روز', '۲ روز', '۳ روز', '۱۰ روز', '۱۱ روز', '۱۰۰ روز'],
  hours: ['۱ ساعت', '۲ ساعت', '۳ ساعت', '۱۰ ساعت', '۱۱ ساعت', '۱۰۰ ساعت'],
  minutes: ['۱ دقیقه', '۲ دقیقه', '۳ دقیقه', '۱۰ دقیقه', '۱۱ دقیقه', '۱۰۰ دقیقه'],
  seconds: ['۱ ثانیه', '۲ ثانیه', '۳ ثانیه', '۱۰ ثانیه', '۱۱ ثانیه', '۱۰۰ ثانیه'],
  milliseconds: [1, 2, 3, 10, 11, 100].map(count => `${transliterateDigits(String(count), 'arabext')} میلی\u200Cثانیه`),
}

/** Hebrew has a dual for most units and spells out "two" for minutes and seconds. */
const HEBREW: UnitTable = {
  years: ['1 שנה', '2 שנים', '3 שנים', '10 שנים', '11 שנים', '100 שנים'],
  months: ['1 חודש', 'חודשיים', '3 חודשים', '10 חודשים', '11 חודשים', '100 חודשים'],
  weeks: ['1 שבוע', 'שבועיים', '3 שבועות', '10 שבועות', '11 שבועות', '100 שבועות'],
  days: ['1 יום', 'יומיים', '3 ימים', '10 ימים', '11 ימים', '100 ימים'],
  hours: ['1 שעה', 'שעתיים', '3 שעות', '10 שעות', '11 שעות', '100 שעות'],
  minutes: ['1 דקה', 'שתי דקות', '3 דקות', '10 דקות', '11 דקות', '100 דקות'],
  seconds: ['1 שניה', 'שתי שניות', '3 שניות', '10 שניות', '11 שניות', '100 שניות'],
  milliseconds: ['1 אלפית שנייה', '2 אלפיות שנייה', '3 אלפיות שנייה', '10 אלפיות שנייה', '11 אלפיות שנייה', '100 אלפיות שנייה'],
}

const ENGLISH: UnitTable = {
  years: ['1 year', '2 years', '3 years', '10 years', '11 years', '100 years'],
  months: ['1 month', '2 months', '3 months', '10 months', '11 months', '100 months'],
  weeks: ['1 week', '2 weeks', '3 weeks', '10 weeks', '11 weeks', '100 weeks'],
  days: ['1 day', '2 days', '3 days', '10 days', '11 days', '100 days'],
  hours: ['1 hour', '2 hours', '3 hours', '10 hours', '11 hours', '100 hours'],
  minutes: ['1 minute', '2 minutes', '3 minutes', '10 minutes', '11 minutes', '100 minutes'],
  seconds: ['1 second', '2 seconds', '3 seconds', '10 seconds', '11 seconds', '100 seconds'],
  milliseconds: ['1 millisecond', '2 milliseconds', '3 milliseconds', '10 milliseconds', '11 milliseconds', '100 milliseconds'],
}

const ARABIC_INDIC_DIGIT = /[\u0660-\u0669]/
const WESTERN_DIGIT = /\d/

/** Hide Intl.DurationFormat while leaving every other Intl constructor in place. */
function stubDurationFormat(value: unknown): void {
  vi.stubGlobal('Intl', Object.create(Intl, { DurationFormat: { value } }))
}

interface NativeCall {
  locale: string
  options: Record<string, string>
  duration: DurationInput
}

/**
 * A stand-in for Intl.DurationFormat that records how it is called. Like the
 * real one it rejects a malformed locale tag, and it marks its output so a
 * test can tell which path produced a string.
 */
function fakeDurationFormat(format?: (duration: DurationInput) => string) {
  const calls: NativeCall[] = []
  const created: string[] = []
  class FakeDurationFormat {
    constructor(private readonly locale: string, private readonly options: Record<string, string>) {
      Intl.getCanonicalLocales(locale)
      created.push(locale)
    }

    format(duration: DurationInput): string {
      calls.push({ locale: this.locale, options: this.options, duration })
      if (format) return format(duration)
      return `<${Object.entries(duration).map(([unit, value]) => `${value} ${unit}`).join(' + ')}>`
    }
  }
  stubDurationFormat(FakeDurationFormat)
  return { calls, created }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  resetDurationCache()
})

describe.each([
  ['with the Intl of the runtime', false],
  ['with Intl.DurationFormat stubbed away', true],
] as const)('formatDuration %s', (_label, stubbed) => {
  beforeEach(() => {
    if (stubbed) stubDurationFormat(undefined)
  })

  it('takes the fallback path when Intl.DurationFormat is missing', () => {
    if (stubbed) expect((Intl as { DurationFormat?: unknown }).DurationFormat).toBeUndefined()
    expect(formatDuration({ hours: 2, minutes: 3 }, { locale: 'ar', numberingSystem: 'latn' })).toBe('ساعتان و3 دقائق')
  })

  describe('plural forms for 1, 2, 3, 10, 11 and 100 of each unit', () => {
    describe.each(Object.keys(ARABIC_LOCALES))('%s', (locale) => {
      it.each(UNITS)('writes %s with Western digits', (unit) => {
        const options: FormatDurationOptions = { locale, numberingSystem: 'latn' }
        const actual = COUNTS.map(count => formatDuration({ [unit]: count }, options))
        expect(actual).toEqual(ARABIC_LOCALES[locale]![unit])
        for (const text of actual) expect(text).not.toMatch(ARABIC_INDIC_DIGIT)
      })

      it.each(UNITS)('writes %s with Arabic-Indic digits', (unit) => {
        const options: FormatDurationOptions = { locale, numberingSystem: 'arab' }
        const actual = COUNTS.map(count => formatDuration({ [unit]: count }, options))
        expect(actual).toEqual(ARABIC_LOCALES[locale]![unit].map(text => transliterateDigits(text, 'arab')))
        for (const text of actual) expect(text).not.toMatch(WESTERN_DIGIT)
      })
    })

    it('never writes the number for one and two in Arabic, and changes the noun for 3-10 and 11+', () => {
      const hours = (count: number) => formatDuration({ hours: count }, { locale: 'ar-EG', numberingSystem: 'arab' })
      expect(hours(1)).toBe('ساعة')
      expect(hours(2)).toBe('ساعتان')
      expect(hours(3)).toBe('٣ ساعات')
      expect(hours(10)).toBe('١٠ ساعات')
      expect(hours(11)).toBe('١١ ساعة')
      expect(hours(100)).toBe('١٠٠ ساعة')
    })

    it.each(UNITS)('writes %s in Persian with Persian digits', (unit) => {
      expect(COUNTS.map(count => formatDuration({ [unit]: count }, { locale: 'fa' }))).toEqual(PERSIAN[unit])
    })

    it.each(UNITS)('writes %s in Persian with Western digits on request', (unit) => {
      expect(COUNTS.map(count => formatDuration({ [unit]: count }, { locale: 'fa', numberingSystem: 'latn' })))
        .toEqual(PERSIAN[unit].map(text => transliterateDigits(text, 'latn')))
    })

    it.each(UNITS)('writes %s in Hebrew, with the dual where Hebrew has one', (unit) => {
      expect(COUNTS.map(count => formatDuration({ [unit]: count }, { locale: 'he' }))).toEqual(HEBREW[unit])
    })

    it.each(UNITS)('writes %s in English', (unit) => {
      expect(COUNTS.map(count => formatDuration({ [unit]: count }, { locale: 'en' }))).toEqual(ENGLISH[unit])
      expect(COUNTS.map(count => formatDuration({ [unit]: count }))).toEqual(ENGLISH[unit])
    })

    it.each(['short', 'narrow'] as const)('formats every unit like Intl.NumberFormat in %s style', (style) => {
      for (const [locale, numberingSystem] of [['ar', 'latn'], ['ar-EG', 'arab'], ['ar-SA', 'arab'], ['fa', 'arabext'], ['he', 'latn'], ['en', 'latn']] as const) {
        for (const unit of UNITS) {
          const reference = new Intl.NumberFormat(`${locale}-u-nu-${numberingSystem}`, {
            style: 'unit',
            unit: unit.slice(0, -1),
            unitDisplay: style,
          })
          for (const count of COUNTS) {
            expect(formatDuration({ [unit]: count }, { locale, numberingSystem, style })).toBe(reference.format(count))
          }
        }
      }
    })
  })

  describe('combined durations', () => {
    it('joins Arabic units with the conjunction and keeps each plural form', () => {
      const ar: FormatDurationOptions = { locale: 'ar', numberingSystem: 'latn' }
      expect(formatDuration({ hours: 1, minutes: 30 }, ar)).toBe('ساعة و30 دقيقة')
      expect(formatDuration({ days: 1, hours: 2 }, ar)).toBe('يوم وساعتان')
      expect(formatDuration({ hours: 2, minutes: 3, seconds: 11 }, ar)).toBe('ساعتان، و3 دقائق، و11 ثانية')
      expect(formatDuration(
        { years: 1, months: 2, weeks: 3, days: 10, hours: 11, minutes: 100, seconds: 2, milliseconds: 3 },
        ar,
      )).toBe('سنة، وشهران، و3 أسابيع، و10 أيام، و11 ساعة، و100 دقيقة، وثانيتان، و3 ملي ثانية')
    })

    it('uses Arabic-Indic digits in ar-EG and ar-SA and Western digits on request', () => {
      const duration = { hours: 2, minutes: 3, seconds: 11 }
      expect(formatDuration(duration, { locale: 'ar-EG', numberingSystem: 'arab' })).toBe('ساعتان، و٣ دقائق، و١١ ثانية')
      expect(formatDuration(duration, { locale: 'ar-SA', numberingSystem: 'arab' })).toBe('ساعتان، و٣ دقائق، و١١ ثانية')
      expect(formatDuration(duration, { locale: 'ar-EG', numberingSystem: 'latn' })).toBe('ساعتان، و3 دقائق، و11 ثانية')
      expect(formatDuration(duration, { locale: 'ar-SA', numberingSystem: 'latn' })).toBe('ساعتان، و3 دقائق، و11 ثانية')
      expect(formatDuration(duration, { locale: 'ar', numberingSystem: 'arab' })).toBe('ساعتان، و٣ دقائق، و١١ ثانية')
    })

    it('follows the digits of the locale when no numbering system is given', () => {
      for (const locale of ['ar', 'ar-EG', 'ar-SA', 'fa', 'he', 'en']) {
        const eleven = new Intl.NumberFormat(locale).format(11)
        expect(formatDuration({ minutes: 11 }, { locale })).toContain(eleven)
      }
    })

    it('formats short and narrow Arabic', () => {
      const duration = { hours: 2, minutes: 3, seconds: 11 }
      expect(formatDuration(duration, { locale: 'ar', numberingSystem: 'latn', style: 'short' })).toBe('2 س، و3 د، و11 ث')
      expect(formatDuration(duration, { locale: 'ar', numberingSystem: 'latn', style: 'narrow' })).toBe('2 س و3 د و11 ث')
      expect(formatDuration(duration, { locale: 'ar-EG', numberingSystem: 'arab', style: 'short' })).toBe('٢ س، و٣ د، و١١ ث')
      expect(formatDuration({ days: 2 }, { locale: 'ar', numberingSystem: 'latn', style: 'short' })).toBe('يومان')
    })

    it('formats Persian, Hebrew and English combinations', () => {
      const duration = { hours: 2, minutes: 3, seconds: 11 }
      expect(formatDuration(duration, { locale: 'fa' })).toBe('۲ ساعت،\u200F ۳ دقیقه، و ۱۱ ثانیه')
      expect(formatDuration({ hours: 1, minutes: 30 }, { locale: 'fa' })).toBe('۱ ساعت و ۳۰ دقیقه')
      expect(formatDuration(duration, { locale: 'fa', style: 'narrow' })).toBe('۲h ۳m ۱۱s')
      expect(formatDuration(duration, { locale: 'he' })).toBe('שעתיים, 3 דקות ו-11 שניות')
      expect(formatDuration(duration, { locale: 'he', style: 'short' })).toBe('שעתיים, 3 דק׳, 11 שנ׳')
      expect(formatDuration(duration, { locale: 'en' })).toBe('2 hours, 3 minutes, 11 seconds')
      expect(formatDuration(duration, { locale: 'en', style: 'short' })).toBe('2 hr, 3 min, 11 sec')
      expect(formatDuration(duration, { locale: 'en', style: 'narrow' })).toBe('2h 3m 11s')
    })

    it('joins the units with the unit list of the locale', () => {
      for (const locale of ['ar', 'ar-EG', 'ar-SA', 'fa', 'he', 'en']) {
        for (const style of ['long', 'short', 'narrow'] as const) {
          const unit = (name: string, count: number) =>
            new Intl.NumberFormat(locale, { style: 'unit', unit: name, unitDisplay: style }).format(count)
          expect(formatDuration({ days: 3, hours: 11, minutes: 2 }, { locale, style })).toBe(
            new Intl.ListFormat(locale, { type: 'unit', style }).format([unit('day', 3), unit('hour', 11), unit('minute', 2)]),
          )
        }
      }
    })

    it('writes an object of whole numbers as given, without balancing it', () => {
      expect(formatDuration({ minutes: 90 })).toBe('90 minutes')
      expect(formatDuration({ hours: 1, minutes: 90 })).toBe('1 hour, 90 minutes')
      expect(formatDuration({ months: 1, days: 31 })).toBe('1 month, 31 days')
      expect(formatDuration({ hours: 1, minutes: undefined })).toBe('1 hour')
      expect(formatDuration({ hours: 12_345 })).toBe('12,345 hours')
    })

    it('leaves zero units out', () => {
      expect(formatDuration({ hours: 2, minutes: 0, seconds: 5 })).toBe('2 hours, 5 seconds')
      expect(formatDuration({ days: 0, hours: 3 }, { locale: 'ar', numberingSystem: 'latn' })).toBe('3 ساعات')
    })
  })

  describe('a number of milliseconds', () => {
    it('is balanced from days down to milliseconds', () => {
      expect(formatDuration(3_723_000)).toBe('1 hour, 2 minutes, 3 seconds')
      expect(formatDuration(90_061_001)).toBe('1 day, 1 hour, 1 minute, 1 second, 1 millisecond')
      expect(formatDuration(1500)).toBe('1 second, 500 milliseconds')
      expect(formatDuration(40 * 86_400_000)).toBe('40 days')
    })

    it('reads a video length in Arabic', () => {
      expect(formatDuration(3_723_000, { locale: 'ar', numberingSystem: 'latn' })).toBe('ساعة، ودقيقتان، و3 ثوان')
      expect(formatDuration(3_723_000, { locale: 'ar-EG', numberingSystem: 'arab' })).toBe('ساعة، ودقيقتان، و٣ ثوان')
      expect(formatDuration(3_723_000, { locale: 'ar-SA', numberingSystem: 'arab' })).toBe('ساعة، ودقيقتان، و٣ ثوانٍ')
      expect(formatDuration(3_723_000, { locale: 'fa' })).toBe('۱ ساعت،\u200F ۲ دقیقه، و ۳ ثانیه')
      expect(formatDuration(3_723_000, { locale: 'he' })).toBe('1 שעה, שתי דקות ו-3 שניות')
    })
  })

  describe('digital style', () => {
    it('writes h:mm:ss with the digits of the locale', () => {
      expect(formatDuration(3_723_000, { style: 'digital' })).toBe('1:02:03')
      expect(formatDuration(3_723_000, { locale: 'ar', numberingSystem: 'latn', style: 'digital' })).toBe('1:02:03')
      expect(formatDuration(3_723_000, { locale: 'ar', numberingSystem: 'arab', style: 'digital' })).toBe('١:٠٢:٠٣')
      expect(formatDuration(3_723_000, { locale: 'ar-EG', numberingSystem: 'arab', style: 'digital' })).toBe('١:٠٢:٠٣')
      expect(formatDuration(3_723_000, { locale: 'ar-EG', numberingSystem: 'latn', style: 'digital' })).toBe('1:02:03')
      expect(formatDuration(3_723_000, { locale: 'ar-SA', numberingSystem: 'arab', style: 'digital' })).toBe('١:٠٢:٠٣')
      expect(formatDuration(3_723_000, { locale: 'ar-SA', numberingSystem: 'latn', style: 'digital' })).toBe('1:02:03')
      expect(formatDuration(3_723_000, { locale: 'fa', style: 'digital' })).toBe('۱:۰۲:۰۳')
      expect(formatDuration(3_723_000, { locale: 'he', style: 'digital' })).toBe('1:02:03')
    })

    it('always shows hours, and pads minutes and seconds to two digits', () => {
      expect(formatDuration(0, { style: 'digital' })).toBe('0:00:00')
      expect(formatDuration(5000, { style: 'digital' })).toBe('0:00:05')
      expect(formatDuration(125_000, { style: 'digital' })).toBe('0:02:05')
      expect(formatDuration(36_059_000, { style: 'digital' })).toBe('10:00:59')
      expect(formatDuration(0, { locale: 'ar-EG', numberingSystem: 'arab', style: 'digital' })).toBe('٠:٠٠:٠٠')
    })

    it('folds days and larger units into the hours, without grouping separators', () => {
      expect(formatDuration(90_061_000, { style: 'digital' })).toBe('25:01:01')
      expect(formatDuration({ days: 2, hours: 3, minutes: 4, seconds: 5 }, { style: 'digital' })).toBe('51:04:05')
      expect(formatDuration({ hours: 12_345 }, { style: 'digital' })).toBe('12345:00:00')
      expect(formatDuration({ hours: 12_345 }, { locale: 'ar-EG', numberingSystem: 'arab', style: 'digital' })).toBe('١٢٣٤٥:٠٠:٠٠')
    })

    it('balances the fields of an object', () => {
      expect(formatDuration({ minutes: 90 }, { style: 'digital' })).toBe('1:30:00')
      expect(formatDuration({ seconds: 3725 }, { style: 'digital' })).toBe('1:02:05')
      expect(formatDuration({ hours: 1.5 }, { style: 'digital' })).toBe('1:30:00')
    })

    it('rounds milliseconds to the second and carries the rounding', () => {
      expect(formatDuration(1499, { style: 'digital' })).toBe('0:00:01')
      expect(formatDuration(1500, { style: 'digital' })).toBe('0:00:02')
      expect(formatDuration(59_500, { style: 'digital' })).toBe('0:01:00')
      expect(formatDuration(3_599_500, { style: 'digital' })).toBe('1:00:00')
    })

    it('does not use largestUnit, smallestUnit or maxUnits', () => {
      const options: FormatDurationOptions = { style: 'digital', largestUnit: 'minutes', smallestUnit: 'minutes', maxUnits: 1 }
      expect(formatDuration(3_723_000, options)).toBe('1:02:03')
    })

    it('writes the sign of a negative duration once, in front', () => {
      expect(formatDuration(-5000, { style: 'digital' })).toBe('-0:00:05')
      expect(formatDuration(-3_723_000, { style: 'digital' })).toBe('-1:02:03')
      expect(formatDuration(-3_723_000, { locale: 'ar', numberingSystem: 'latn', style: 'digital' })).toBe('\u200E-1:02:03')
      expect(formatDuration(-3_723_000, { locale: 'ar-EG', numberingSystem: 'arab', style: 'digital' })).toBe('\u061C-١:٠٢:٠٣')
      expect(formatDuration(-3_723_000, { locale: 'fa', style: 'digital' })).toBe('\u200E\u2212۱:۰۲:۰۳')
      // Rounds to zero: no sign on nothing.
      expect(formatDuration(-400, { style: 'digital' })).toBe('0:00:00')
    })
  })

  describe('largestUnit and smallestUnit', () => {
    it('folds larger units into largestUnit', () => {
      expect(formatDuration({ minutes: 90 }, { largestUnit: 'hours' })).toBe('1 hour, 30 minutes')
      expect(formatDuration({ seconds: 3725 }, { largestUnit: 'hours' })).toBe('1 hour, 2 minutes, 5 seconds')
      expect(formatDuration({ seconds: 3725 }, { largestUnit: 'minutes' })).toBe('62 minutes, 5 seconds')
      expect(formatDuration({ days: 2, hours: 3 }, { largestUnit: 'hours' })).toBe('51 hours')
      expect(formatDuration(90_000_000, { largestUnit: 'hours' })).toBe('25 hours')
      expect(formatDuration({ minutes: 150 }, { locale: 'ar', numberingSystem: 'latn', largestUnit: 'hours' })).toBe('ساعتان و30 دقيقة')
    })

    it('rounds what is left into smallestUnit, half away from zero', () => {
      expect(formatDuration(1499, { smallestUnit: 'seconds' })).toBe('1 second')
      expect(formatDuration(1500, { smallestUnit: 'seconds' })).toBe('2 seconds')
      expect(formatDuration(2500, { smallestUnit: 'seconds' })).toBe('3 seconds')
      expect(formatDuration(-1500, { smallestUnit: 'seconds' })).toBe('-2 seconds')
      expect(formatDuration({ minutes: 89 }, { smallestUnit: 'hours' })).toBe('1 hour')
      expect(formatDuration({ minutes: 90 }, { smallestUnit: 'hours' })).toBe('2 hours')
      expect(formatDuration(7_384_000, { locale: 'ar', numberingSystem: 'latn', smallestUnit: 'minutes' })).toBe('ساعتان و3 دقائق')
    })

    it('carries a rounded unit into the one above instead of writing 60 minutes', () => {
      expect(formatDuration(3_599_999, { smallestUnit: 'seconds' })).toBe('1 hour')
      expect(formatDuration(86_399_999, { smallestUnit: 'minutes' })).toBe('1 day')
      expect(formatDuration({ hours: 1, minutes: 59, seconds: 59.6 }, { smallestUnit: 'seconds' })).toBe('2 hours')
    })

    it('accepts the same unit for both', () => {
      expect(formatDuration(5_400_000, { largestUnit: 'minutes', smallestUnit: 'minutes' })).toBe('90 minutes')
      expect(formatDuration(5_400_000, { largestUnit: 'hours', smallestUnit: 'hours' })).toBe('2 hours')
    })

    it('uses weeks only when the duration or an option names them', () => {
      expect(formatDuration(10 * 86_400_000)).toBe('10 days')
      expect(formatDuration(10 * 86_400_000, { largestUnit: 'weeks' })).toBe('1 week, 3 days')
      expect(formatDuration(10 * 86_400_000, { smallestUnit: 'weeks' })).toBe('1 week')
      expect(formatDuration({ days: 10 }, { largestUnit: 'weeks' })).toBe('1 week, 3 days')
      expect(formatDuration(45 * 86_400_000, { largestUnit: 'months', smallestUnit: 'days' })).toBe('1 month, 15 days')
      expect(formatDuration({ months: 1, weeks: 2 }, { maxUnits: 2 })).toBe('1 month, 2 weeks')
      expect(formatDuration({ weeks: 2, days: 10 }, { maxUnits: 2 })).toBe('3 weeks, 3 days')
    })

    it('converts years and months exactly and months to days nominally', () => {
      expect(formatDuration({ years: 2 }, { largestUnit: 'months' })).toBe('24 months')
      expect(formatDuration({ months: 14 }, { largestUnit: 'years' })).toBe('1 year, 2 months')
      expect(formatDuration(40 * 86_400_000, { largestUnit: 'months', smallestUnit: 'days' })).toBe('1 month, 10 days')
      expect(formatDuration(40 * 86_400_000, { largestUnit: 'months' })).toBe('1 month, 9 days, 13 hours, 30 minutes')
      expect(formatDuration(800 * 86_400_000, { largestUnit: 'years', smallestUnit: 'months' })).toBe('2 years, 2 months')
      expect(formatDuration(400 * 86_400_000, { largestUnit: 'years', smallestUnit: 'days' })).toBe('1 year, 1 month, 4 days')
    })
  })

  describe('maxUnits', () => {
    it('keeps that many units and rounds the last one', () => {
      expect(formatDuration(5_400_000, { maxUnits: 1 })).toBe('2 hours')
      expect(formatDuration(7_384_000, { maxUnits: 2 })).toBe('2 hours, 3 minutes')
      expect(formatDuration({ hours: 1, minutes: 29 }, { maxUnits: 1 })).toBe('1 hour')
      expect(formatDuration({ hours: 1, minutes: 30 }, { maxUnits: 1 })).toBe('2 hours')
      expect(formatDuration({ hours: 1, minutes: 45 }, { maxUnits: 5 })).toBe('1 hour, 45 minutes')
      expect(formatDuration(90_061_001, { maxUnits: 3 })).toBe('1 day, 1 hour, 1 minute')
    })

    it('picks the Arabic plural form of the rounded value', () => {
      const ar: FormatDurationOptions = { locale: 'ar', numberingSystem: 'latn' }
      expect(formatDuration(5_400_000, { ...ar, maxUnits: 1 })).toBe('ساعتان')
      expect(formatDuration(7_384_000, { ...ar, maxUnits: 2 })).toBe('ساعتان و3 دقائق')
      expect(formatDuration(10.6 * 3_600_000, { ...ar, maxUnits: 1 })).toBe('11 ساعة')
      expect(formatDuration(2.6 * 86_400_000, { locale: 'ar-EG', numberingSystem: 'arab', maxUnits: 1 })).toBe('٣ أيام')
    })

    it('carries the rounding into a larger unit', () => {
      expect(formatDuration(3_599_999, { maxUnits: 1 })).toBe('1 hour')
      expect(formatDuration(3_599_999, { maxUnits: 2 })).toBe('1 hour')
      expect(formatDuration(86_399_999, { maxUnits: 1 })).toBe('1 day')
      expect(formatDuration({ hours: 1, minutes: 59, seconds: 40 }, { maxUnits: 2 })).toBe('2 hours')
    })

    it('counts units from the first non-zero one, zero units included', () => {
      expect(formatDuration({ days: 1, minutes: 5 }, { maxUnits: 2 })).toBe('1 day')
      expect(formatDuration({ days: 1, minutes: 5 }, { maxUnits: 3 })).toBe('1 day, 5 minutes')
    })

    it('does not promote an object above its largest field unless largestUnit says so', () => {
      expect(formatDuration({ minutes: 90 }, { maxUnits: 1 })).toBe('90 minutes')
      expect(formatDuration({ minutes: 59, seconds: 59 }, { maxUnits: 1 })).toBe('60 minutes')
      expect(formatDuration({ minutes: 59, seconds: 59 }, { maxUnits: 1, largestUnit: 'hours' })).toBe('1 hour')
    })

    it('works together with largestUnit and smallestUnit', () => {
      expect(formatDuration(90_061_001, { maxUnits: 2, largestUnit: 'hours' })).toBe('25 hours, 1 minute')
      expect(formatDuration(90_061_001, { maxUnits: 4, smallestUnit: 'hours' })).toBe('1 day, 1 hour')
      expect(formatDuration({ months: 1, days: 31 }, { maxUnits: 1 })).toBe('2 months')
    })
  })

  describe('negative values', () => {
    it('writes the sign once, in front of the first unit', () => {
      expect(formatDuration({ hours: -1, minutes: -30 })).toBe('-1 hour, 30 minutes')
      expect(formatDuration({ days: -1, hours: -2 })).toBe('-1 day, 2 hours')
      expect(formatDuration(-3_723_000)).toBe('-1 hour, 2 minutes, 3 seconds')
    })

    it('keeps the sign in Arabic and Hebrew, whose forms for one and two have no number', () => {
      expect(formatDuration({ hours: -1, minutes: -30 }, { locale: 'ar', numberingSystem: 'latn' })).toBe('\u200E-ساعة و30 دقيقة')
      expect(formatDuration({ hours: -2 }, { locale: 'ar', numberingSystem: 'latn' })).toBe('\u200E-ساعتان')
      expect(formatDuration({ hours: -2 }, { locale: 'he' })).toBe('\u200E-שעתיים')
    })

    it('uses the minus sign and bidi mark of the locale and its digits', () => {
      expect(formatDuration({ hours: -3 }, { locale: 'ar-EG', numberingSystem: 'arab' })).toBe('\u061C-٣ ساعات')
      expect(formatDuration({ hours: -3 }, { locale: 'ar-SA', numberingSystem: 'arab' })).toBe('\u061C-٣ ساعات')
      expect(formatDuration({ hours: -3 }, { locale: 'ar', numberingSystem: 'latn' })).toBe('\u200E-3 ساعات')
      expect(formatDuration({ hours: -3 }, { locale: 'fa' })).toBe('\u200E\u2212۳ ساعت')
      expect(formatDuration({ hours: -1 }, { locale: 'he' })).toBe('\u200E-1 שעה')
      for (const locale of ['ar', 'ar-EG', 'ar-SA', 'fa', 'he', 'en']) {
        expect(formatDuration({ hours: -3 }, { locale })).toBe(
          new Intl.NumberFormat(locale, { style: 'unit', unit: 'hour', unitDisplay: 'long' }).format(-3),
        )
      }
    })

    it('adds up mixed signs', () => {
      expect(formatDuration({ hours: 1, minutes: -30 })).toBe('30 minutes')
      expect(formatDuration({ hours: -2, minutes: 30 })).toBe('-1 hour, 30 minutes')
      expect(formatDuration({ hours: 2, minutes: -30 }, { locale: 'ar', numberingSystem: 'latn' })).toBe('ساعة و30 دقيقة')
      expect(formatDuration({ hours: 1, minutes: -60 })).toBe('0 minutes')
    })
  })

  describe('fractional values', () => {
    it('carries a fraction into the smaller units', () => {
      expect(formatDuration({ hours: 1.5 })).toBe('1 hour, 30 minutes')
      expect(formatDuration({ days: 1.5 })).toBe('1 day, 12 hours')
      expect(formatDuration({ seconds: 1.5 })).toBe('1 second, 500 milliseconds')
      expect(formatDuration({ hours: -1.5 }, { locale: 'ar', numberingSystem: 'latn' })).toBe('\u200E-ساعة و30 دقيقة')
      expect(formatDuration({ hours: 2.5 }, { locale: 'ar-EG', numberingSystem: 'arab' })).toBe('ساعتان و٣٠ دقيقة')
    })

    it('keeps the largest unit of the object when it balances the fraction', () => {
      expect(formatDuration({ seconds: 90.5 })).toBe('90 seconds, 500 milliseconds')
      expect(formatDuration({ minutes: 90.5 })).toBe('90 minutes, 30 seconds')
    })

    it('rounds below a millisecond half away from zero', () => {
      expect(formatDuration({ milliseconds: 0.4 })).toBe('0 milliseconds')
      expect(formatDuration({ milliseconds: 0.5 })).toBe('1 millisecond')
      expect(formatDuration({ milliseconds: -0.5 })).toBe('-1 millisecond')
      expect(formatDuration(1.4)).toBe('1 millisecond')
    })

    it('is not thrown off by floating-point noise', () => {
      expect(formatDuration({ hours: 0.1 + 0.2 })).toBe('18 minutes')
      expect(formatDuration({ hours: 0.7 })).toBe('42 minutes')
      expect(formatDuration({ hours: 1.1 })).toBe('1 hour, 6 minutes')
      expect(formatDuration({ hours: 0.7 }, { style: 'digital' })).toBe('0:42:00')
    })

    it('converts a fractional month nominally, at 30.4375 days', () => {
      expect(formatDuration({ months: 1.5 }, { smallestUnit: 'days' })).toBe('1 month, 15 days')
    })
  })

  describe('zero', () => {
    it('writes zero seconds for 0 and for an empty object', () => {
      expect(formatDuration(0)).toBe('0 seconds')
      expect(formatDuration({})).toBe('0 seconds')
      expect(formatDuration(0, { locale: 'ar', numberingSystem: 'latn' })).toBe('0 ثانية')
      expect(formatDuration(0, { locale: 'ar-EG', numberingSystem: 'arab' })).toBe('٠ ثانية')
      expect(formatDuration(0, { locale: 'fa' })).toBe('۰ ثانیه')
      expect(formatDuration(0, { locale: 'he' })).toBe('0 שניות')
      expect(formatDuration(0, { style: 'short' })).toBe('0 sec')
      expect(formatDuration(0, { style: 'narrow' })).toBe('0s')
    })

    it('writes zero of the smallest field an object has', () => {
      expect(formatDuration({ minutes: 0 })).toBe('0 minutes')
      expect(formatDuration({ hours: 0, minutes: 0 })).toBe('0 minutes')
      expect(formatDuration({ hours: 0, seconds: 0 })).toBe('0 seconds')
      expect(formatDuration({ days: 0 }, { locale: 'ar', numberingSystem: 'latn' })).toBe('0 يوم')
      expect(formatDuration({ minutes: 0 }, { locale: 'ar-EG', numberingSystem: 'arab' })).toBe('٠ دقيقة')
    })

    it('writes zero of smallestUnit when one is given', () => {
      expect(formatDuration(0, { smallestUnit: 'minutes' })).toBe('0 minutes')
      expect(formatDuration({ days: 0 }, { smallestUnit: 'hours' })).toBe('0 hours')
      expect(formatDuration(0, { largestUnit: 'milliseconds' })).toBe('0 milliseconds')
      expect(formatDuration({ hours: 0 }, { largestUnit: 'minutes' })).toBe('0 minutes')
      expect(formatDuration(0, { maxUnits: 1 })).toBe('0 seconds')
      expect(formatDuration({ hours: 0 }, { maxUnits: 2 })).toBe('0 hours')
    })

    it('writes zero, without a sign, for a duration that rounds to zero', () => {
      expect(formatDuration(400, { smallestUnit: 'seconds' })).toBe('0 seconds')
      expect(formatDuration(-400, { smallestUnit: 'seconds' })).toBe('0 seconds')
      expect(formatDuration({ minutes: 20 }, { smallestUnit: 'hours' })).toBe('0 hours')
      expect(formatDuration({ minutes: -20 }, { locale: 'ar', numberingSystem: 'latn', smallestUnit: 'hours' })).toBe('0 ساعة')
    })
  })

  describe('locales and numbering systems', () => {
    it('accepts an underscore tag and falls back from a malformed tag to its language, then to English', () => {
      expect(formatDuration({ hours: 3 }, { locale: 'ar_EG', numberingSystem: 'arab' })).toBe('٣ ساعات')
      expect(formatDuration({ hours: 3 }, { locale: 'ar-!!', numberingSystem: 'latn' })).toBe('3 ساعات')
      expect(formatDuration({ hours: 3 }, { locale: '!!' })).toBe('3 hours')
      expect(formatDuration(3_723_000, { locale: '!!', style: 'digital' })).toBe('1:02:03')
    })

    it('falls back to Western digits for an unknown numbering system', () => {
      expect(formatDuration({ hours: 3 }, { locale: 'ar-EG', numberingSystem: 'bogus' })).toBe('3 ساعات')
      expect(formatDuration({ hours: 3 }, { locale: 'ar', numberingSystem: 'arabext' })).toBe('۳ ساعات')
    })

    it('groups large numbers the way the locale does', () => {
      expect(formatDuration(12_345 * 3_600_000, { locale: 'ar-EG', numberingSystem: 'arab', largestUnit: 'hours' })).toBe('١٢٬٣٤٥ ساعة')
      expect(formatDuration(12_345 * 3_600_000, { locale: 'de', largestUnit: 'hours' })).toBe('12.345 Stunden')
    })

    it('formats values beyond the range of Intl.DurationFormat', () => {
      expect(formatDuration({ years: 5e9 })).toBe('5,000,000,000 years')
      expect(formatDuration(2 ** 53)).toBe('104,249,991 days, 8 hours, 59 minutes, 992 milliseconds')
    })
  })
})

describe('formatDuration with Intl.DurationFormat', () => {
  it('formats through Intl.DurationFormat when the runtime has one', () => {
    const { calls } = fakeDurationFormat()
    expect(formatDuration({ hours: 2, minutes: 3 }, { locale: 'ar-EG', numberingSystem: 'latn', style: 'short' }))
      .toBe('<2 hours + 3 minutes>')
    expect(calls).toEqual([
      { locale: 'ar-EG-u-nu-latn', options: { style: 'short' }, duration: { hours: 2, minutes: 3 } },
    ])
  })

  it('passes the balanced duration, with zero units left out', () => {
    const { calls } = fakeDurationFormat()
    formatDuration(5_400_000, { locale: 'ar' })
    formatDuration({ hours: 1, minutes: 59, seconds: 40 }, { maxUnits: 2 })
    formatDuration({ hours: 1.5, minutes: 0 }, { style: 'narrow' })
    expect(calls.map(call => call.duration)).toEqual([{ hours: 1, minutes: 30 }, { hours: 2 }, { hours: 1, minutes: 30 }])
    expect(calls.map(call => call.options)).toEqual([{ style: 'long' }, { style: 'long' }, { style: 'narrow' }])
    expect(calls.map(call => call.locale)).toEqual(['ar', 'en', 'en'])
  })

  it('asks Intl.DurationFormat to keep the unit a zero duration is written in', () => {
    const { calls } = fakeDurationFormat()
    formatDuration(0)
    formatDuration({ minutes: 0 }, { style: 'short' })
    formatDuration(400, { smallestUnit: 'hours' })
    expect(calls).toEqual([
      { locale: 'en', options: { style: 'long', secondsDisplay: 'always' }, duration: { seconds: 0 } },
      { locale: 'en', options: { style: 'short', minutesDisplay: 'always' }, duration: { minutes: 0 } },
      { locale: 'en', options: { style: 'long', hoursDisplay: 'always' }, duration: { hours: 0 } },
    ])
  })

  it('passes hours, minutes and seconds for digital style', () => {
    const { calls } = fakeDurationFormat()
    formatDuration(125_000, { locale: 'ar-EG', numberingSystem: 'arab', style: 'digital' })
    formatDuration(0, { style: 'digital' })
    formatDuration({ days: 1, seconds: 5.4 }, { style: 'digital' })
    expect(calls).toEqual([
      { locale: 'ar-EG-u-nu-arab', options: { style: 'digital' }, duration: { hours: 0, minutes: 2, seconds: 5 } },
      { locale: 'en', options: { style: 'digital' }, duration: { hours: 0, minutes: 0, seconds: 0 } },
      { locale: 'en', options: { style: 'digital' }, duration: { hours: 24, minutes: 0, seconds: 5 } },
    ])
  })

  it('passes the size of a negative duration and writes the sign itself', () => {
    const { calls } = fakeDurationFormat()
    expect(formatDuration({ hours: -1, minutes: -30 })).toBe('-<1 hours + 30 minutes>')
    expect(formatDuration({ hours: -1 }, { locale: 'ar', numberingSystem: 'latn' })).toBe('\u200E-<1 hours>')
    expect(formatDuration(-5000, { locale: 'ar-EG', numberingSystem: 'arab', style: 'digital' }))
      .toBe('\u061C-<0 hours + 0 minutes + 5 seconds>')
    expect(formatDuration(-400, { smallestUnit: 'seconds' })).toBe('<0 seconds>')
    expect(calls.map(call => call.duration)).toEqual([
      { hours: 1, minutes: 30 },
      { hours: 1 },
      { hours: 0, minutes: 0, seconds: 5 },
      { seconds: 0 },
    ])
  })

  it('reuses the Intl.DurationFormat instance for the same locale and style', () => {
    const { created } = fakeDurationFormat()
    formatDuration({ hours: 2 }, { locale: 'ar' })
    formatDuration({ minutes: 5 }, { locale: 'ar' })
    formatDuration(90_000, { locale: 'ar' })
    expect(created).toEqual(['ar'])
    formatDuration({ hours: 2 }, { locale: 'ar', style: 'short' })
    formatDuration({ hours: 2 }, { locale: 'ar', numberingSystem: 'arab' })
    expect(created).toEqual(['ar', 'ar', 'ar-u-nu-arab'])
  })

  it('falls back from a malformed tag to its language, then to English', () => {
    const { created } = fakeDurationFormat()
    formatDuration({ hours: 2 }, { locale: 'ar-!!' })
    formatDuration({ hours: 2 }, { locale: '!!' })
    expect(created).toEqual(['ar', 'en'])
  })

  it('uses the fallback when Intl.DurationFormat rejects the duration', () => {
    const { calls } = fakeDurationFormat(() => {
      throw new RangeError('Duration was not valid.')
    })
    expect(formatDuration({ years: 5e9, months: 2 }, { locale: 'ar', numberingSystem: 'latn' })).toBe('5,000,000,000 سنة وشهران')
    expect(formatDuration(3_723_000, { locale: 'ar-EG', numberingSystem: 'arab', style: 'digital' })).toBe('١:٠٢:٠٣')
    expect(calls).toHaveLength(2)
  })

  it('uses the fallback when Intl.DurationFormat is not a constructor', () => {
    stubDurationFormat({})
    expect(formatDuration({ hours: 2, minutes: 3 }, { locale: 'ar', numberingSystem: 'latn' })).toBe('ساعتان و3 دقائق')
  })

  it('returns the same strings as the fallback when the runtime has its own Intl.DurationFormat', () => {
    const cases: [DurationInput | number, FormatDurationOptions][] = []
    for (const locale of ['ar', 'ar-EG', 'ar-SA', 'fa', 'he', 'en']) {
      for (const style of ['long', 'short', 'narrow', 'digital'] as DurationStyle[]) {
        cases.push(
          [{ hours: 2, minutes: 3, seconds: 11 }, { locale, style }],
          [{ days: 1, hours: 11, minutes: 100 }, { locale, style }],
          [-3_723_000, { locale, style }],
          [0, { locale, style }],
          [5_400_000, { locale, style, maxUnits: 1 }],
        )
      }
    }
    const withRuntime = cases.map(([duration, options]) => formatDuration(duration, options))
    resetDurationCache()
    stubDurationFormat(undefined)
    const withFallback = cases.map(([duration, options]) => formatDuration(duration, options))
    expect(withFallback).toHaveLength(120)
    // On a runtime without Intl.DurationFormat both runs take the fallback
    // path; test/browser/duration.browser.ts compares the two in Chromium.
    expect(withRuntime).toEqual(withFallback)
  })
})

describe('formatDuration invalid input', () => {
  const invalidDurations: [string, unknown][] = [
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['-Infinity', Number.NEGATIVE_INFINITY],
    ['a numeric string', '90'],
    ['null', null],
    ['undefined', undefined],
    ['a boolean', true],
    ['an array', [1, 2]],
    ['an empty array', []],
    ['a singular unit name', { hour: 1 }],
    ['an unknown unit next to a known one', { hours: 1, mins: 30 }],
    ['a string field', { hours: '2' }],
    ['a NaN field', { hours: Number.NaN }],
    ['an infinite field', { minutes: Number.POSITIVE_INFINITY }],
    ['a null field', { seconds: null }],
  ]

  const invalidOptions: [string, object | null][] = [
    ['an unknown style', { style: 'medium' }],
    ['a null style', { style: null }],
    ['a singular largestUnit', { largestUnit: 'hour' }],
    ['an unknown smallestUnit', { smallestUnit: 'second' }],
    ['a largestUnit smaller than smallestUnit', { largestUnit: 'seconds', smallestUnit: 'hours' }],
    ['maxUnits 0', { maxUnits: 0 }],
    ['a negative maxUnits', { maxUnits: -1 }],
    ['a fractional maxUnits', { maxUnits: 1.5 }],
    ['maxUnits NaN', { maxUnits: Number.NaN }],
    ['a string maxUnits', { maxUnits: '2' }],
    ['a locale that is not a string', { locale: 42 }],
  ]

  describe('in development', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development')
    })

    it.each(invalidDurations)('throws TypeError for %s', (_label, duration) => {
      expect(() => formatDuration(duration as number)).toThrow(TypeError)
      expect(() => formatDuration(duration as number, { locale: 'ar', style: 'digital' })).toThrow(TypeError)
    })

    it.each(invalidOptions)('throws TypeError for %s', (_label, options) => {
      expect(() => formatDuration(1000, options as FormatDurationOptions)).toThrow(TypeError)
      expect(() => formatDuration({ hours: 1 }, options as FormatDurationOptions)).toThrow(TypeError)
    })

    it('names what is wrong', () => {
      expect(() => formatDuration({ hour: 1 } as DurationInput)).toThrow('[vue-rtl-kit] formatDuration: invalid unit: hour')
      expect(() => formatDuration({ hours: Number.NaN })).toThrow('invalid hours: NaN')
      expect(() => formatDuration(Number.NaN)).toThrow('invalid duration: NaN')
      expect(() => formatDuration('90' as unknown as number)).toThrow('invalid duration: 90')
      expect(() => formatDuration(1, { style: 'medium' as DurationStyle })).toThrow('invalid style: medium')
      expect(() => formatDuration(1, { largestUnit: 'hour' as DurationUnit })).toThrow('invalid largestUnit: hour')
      expect(() => formatDuration(1, { smallestUnit: 'second' as DurationUnit })).toThrow('invalid smallestUnit: second')
      expect(() => formatDuration(1, { largestUnit: 'seconds', smallestUnit: 'hours' }))
        .toThrow('invalid largestUnit, smaller than smallestUnit: seconds')
      expect(() => formatDuration(1, { maxUnits: 0 })).toThrow('invalid maxUnits: 0')
    })

    it('throws on the Intl.DurationFormat path too', () => {
      const { calls } = fakeDurationFormat()
      expect(() => formatDuration(Number.NaN)).toThrow(TypeError)
      expect(() => formatDuration({ hour: 1 } as DurationInput)).toThrow(TypeError)
      expect(calls).toEqual([])
    })
  })

  describe('in production', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production')
    })

    it.each(invalidDurations)('returns an empty string for %s', (_label, duration) => {
      expect(formatDuration(duration as number)).toBe('')
      expect(formatDuration(duration as number, { locale: 'ar', style: 'digital' })).toBe('')
    })

    it.each(invalidOptions)('returns an empty string for %s', (_label, options) => {
      expect(formatDuration(1000, options as FormatDurationOptions)).toBe('')
      expect(formatDuration({ hours: 1 }, options as FormatDurationOptions)).toBe('')
    })

    it('still formats valid input', () => {
      expect(formatDuration({ hours: 2, minutes: 3 }, { locale: 'ar', numberingSystem: 'latn' })).toBe('ساعتان و3 دقائق')
    })
  })

  it('returns an empty string where there is no process global, as in a browser build', () => {
    const run = (): string => {
      vi.stubGlobal('process', undefined)
      try {
        return formatDuration(Number.NaN)
      }
      finally {
        vi.unstubAllGlobals()
      }
    }
    expect(run()).toBe('')
  })

  it('treats null options like no options', () => {
    expect(formatDuration({ hours: 1 }, null as unknown as FormatDurationOptions)).toBe('1 hour')
    expect(formatDuration({ hours: 1 }, undefined)).toBe('1 hour')
  })
})

describe('formatDuration formatter cache', () => {
  /**
   * Count constructions of one Intl formatter while still building real ones.
   * Spy first, then stub Intl.DurationFormat away: the stub inherits the spy.
   */
  function spyOn(name: 'NumberFormat' | 'ListFormat') {
    const Real = Intl[name] as new (locale?: string, options?: object) => object
    return vi.spyOn(Intl, name).mockImplementation(function (locale?: unknown, options?: unknown) {
      return new Real(locale as string, options as object)
    } as never)
  }

  it('builds each formatter once and reuses it', () => {
    const numbers = spyOn('NumberFormat')
    const lists = spyOn('ListFormat')
    stubDurationFormat(undefined)
    const options: FormatDurationOptions = { locale: 'ar-EG', numberingSystem: 'arab' }
    formatDuration({ hours: 2, minutes: 3 }, options)
    expect(numbers).toHaveBeenCalledTimes(2)
    expect(lists).toHaveBeenCalledTimes(1)
    formatDuration({ hours: 11, minutes: 100 }, options)
    formatDuration({ minutes: 1, hours: 1 }, options)
    expect(numbers).toHaveBeenCalledTimes(2)
    expect(lists).toHaveBeenCalledTimes(1)
    expect(durationCacheStats()).toEqual({ size: 3, limit: DURATION_CACHE_LIMIT })
  })

  it('keeps a formatter per locale, numbering system and style', () => {
    const lists = spyOn('ListFormat')
    stubDurationFormat(undefined)
    formatDuration({ hours: 2 }, { locale: 'ar' })
    formatDuration({ hours: 2 }, { locale: 'ar', numberingSystem: 'arab' })
    formatDuration({ hours: 2 }, { locale: 'ar', style: 'short' })
    formatDuration({ hours: 2 }, { locale: 'fa' })
    expect(lists).toHaveBeenCalledTimes(4)
  })

  it('never grows past its limit and evicts the least recently used formatter', () => {
    const lists = spyOn('ListFormat')
    stubDurationFormat(undefined)
    const locales = Array.from({ length: DURATION_CACHE_LIMIT }, (_, index) => `en-u-fw-${String(index).padStart(3, 'a')}`)
    formatDuration({ hours: 1 }, { locale: 'ar' })
    expect(durationCacheStats().size).toBe(2)
    for (const locale of locales) {
      formatDuration({ hours: 1 }, { locale })
      // Keep the Arabic formatters recently used so they survive.
      formatDuration({ hours: 1 }, { locale: 'ar' })
      expect(durationCacheStats().size).toBeLessThanOrEqual(DURATION_CACHE_LIMIT)
    }
    expect(durationCacheStats().size).toBe(DURATION_CACHE_LIMIT)
    const built = lists.mock.calls.length
    formatDuration({ hours: 1 }, { locale: 'ar' })
    expect(lists).toHaveBeenCalledTimes(built)
    // The first of the other locales was evicted and is built again.
    formatDuration({ hours: 1 }, { locale: locales[0] })
    expect(lists).toHaveBeenCalledTimes(built + 1)
  })

  it('resets on request', () => {
    stubDurationFormat(undefined)
    formatDuration({ hours: 1 })
    expect(durationCacheStats().size).toBeGreaterThan(0)
    resetDurationCache()
    expect(durationCacheStats().size).toBe(0)
  })
})

/**
 * The documentation is executable: every `formatDuration(...) // 'result'`
 * line in the guides, the API reference, the README and llms-full.txt is
 * run against the real function, on the runtime path and on the fallback.
 */
describe('formatDuration documented examples', () => {
  const DOCUMENTS = [
    'README.md',
    'site/guide/format-duration.md',
    'site/ar/guide/format-duration.md',
    'site/api.md',
    'site/ar/api.md',
    'site/public/llms-full.txt',
  ]
  const EXAMPLE = /^(formatDuration\(.*\))\s*\/\/\s*('(?:[^'\\]|\\.)*')/
  const THROWS = /^(formatDuration\(.*\))\s*\/\/\s*TypeError/

  // Vitest runs from the repository root.
  const readRepositoryFile = (path: string): Promise<string> => readFile(resolve(process.cwd(), path), 'utf8')

  interface Documented {
    results: [source: string, actual: string, expected: string][]
    throwing: [source: string, run: () => string][]
  }

  async function documented(path: string): Promise<Documented> {
    const markdown = await readRepositoryFile(path)
    const output: Documented = { results: [], throwing: [] }
    for (const [, block] of markdown.matchAll(/```ts\n([\s\S]*?)```/g)) {
      if (!block!.includes('formatDuration(') || block!.includes('interface ')) continue
      const body = block!.split('\n').map((line) => {
        const example = EXAMPLE.exec(line)
        if (example) return `results.push([${JSON.stringify(example[1])}, ${example[1]}, ${example[2]}])`
        const throws = THROWS.exec(line)
        if (throws) return `throwing.push([${JSON.stringify(throws[1])}, () => ${throws[1]}])`
        return /^import /.test(line) ? '' : line
      }).join('\n')
      new Function('formatDuration', 'results', 'throwing', body)(formatDuration, output.results, output.throwing)
    }
    return output
  }

  it.each(DOCUMENTS)('%s matches the implementation', async (path) => {
    const { results } = await documented(path)
    expect(results.length).toBeGreaterThanOrEqual(path.includes('guide/') ? 48 : 6)
    for (const [source, actual, expected] of results) expect({ source, value: actual }).toEqual({ source, value: expected })
  })

  it.each(DOCUMENTS)('%s matches the fallback with Intl.DurationFormat stubbed away', async (path) => {
    stubDurationFormat(undefined)
    const { results } = await documented(path)
    for (const [source, actual, expected] of results) expect({ source, value: actual }).toEqual({ source, value: expected })
  })

  it.each(['site/guide/format-duration.md', 'site/ar/guide/format-duration.md'])('%s documents invalid input that throws in development and is empty in production', async (path) => {
    const { throwing } = await documented(path)
    expect(throwing).toHaveLength(6)
    for (const [source, run] of throwing) expect(run, source).toThrow(TypeError)
    vi.stubEnv('NODE_ENV', 'production')
    for (const [source, run] of throwing) expect(run(), source).toBe('')
  })

  it('keeps the Arabic guide in the same heading order with the same calls and results', async () => {
    const [english, arabic] = await Promise.all([
      readRepositoryFile('site/guide/format-duration.md'),
      readRepositoryFile('site/ar/guide/format-duration.md'),
    ])
    const headings = (markdown: string) => [...markdown.matchAll(/^(#{1,6})\s+/gm)].map(match => match[1]!.length)
    // Comments are translated; the code in front of them is not.
    const code = (markdown: string) => [...markdown.matchAll(/```[^\n]*\n([\s\S]*?)```/g)]
      .map(match => match[1]!.split('\n').map(line => line.replace(/(?:'(?:[^'\\]|\\.)*')?\s*(?:—|\/\/(?! ')).*$/, '').trimEnd()).join('\n'))
    expect(headings(arabic)).toEqual(headings(english))
    expect(code(arabic)).toEqual(code(english))
    // Real Arabic prose, not a placeholder or an untranslated copy.
    const prose = arabic.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '')
    expect(prose.match(/[\u0621-\u064A]/g)!.length).toBeGreaterThan(3000)
    expect(prose).not.toMatch(/TODO|lorem|placeholder/i)
  })
})
