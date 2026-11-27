/**
 * Locale-aware durations: "ساعتان و٣ دقائق", "1:02:03", "3 hr, 20 min".
 *
 * The bug this file exists for: `hours + ' ساعة و ' + minutes + ' دقيقة'`.
 * Arabic has a dual (`ساعتان`), one plural for 3-10 (`٣ ساعات`) and another
 * for 11 and up (`١١ ساعة`), drops the number for one and two, joins the
 * units with `و`, and may write its digits as `٠١٢٣`. A hand-joined string
 * gets all of that wrong; CLDR already knows every form.
 *
 * `formatDuration` uses `Intl.DurationFormat` when the runtime has it. When
 * it is missing (Node.js before 23, Chrome before 129, Firefox before 136,
 * Safari before 16.4) it takes the same route the specification describes:
 * every unit is formatted with `Intl.NumberFormat` in `style: 'unit'`, which
 * picks the plural form and the digits, and the units are joined with
 * `Intl.ListFormat` in `type: 'unit'`. For `long`, `short` and `narrow` the
 * two paths return the same string. `digital` is written as `h:mm:ss` in the
 * locale's digits; the fallback always separates with `:`, whereas
 * `Intl.DurationFormat` uses the locale's own separator (`1.02.03` in Finnish
 * and Danish). The fallback needs `Intl.NumberFormat` unit style and
 * `Intl.ListFormat`, which every browser has shipped since 2021.
 *
 * No Vue import, no DOM access: safe in SSR and tree-shakeable on its own.
 */
import { FORMATTER_CACHE_LIMIT, withNumberingSystem } from './format'

/** A unit `formatDuration()` reads and writes, largest first. */
export type DurationUnit =
  | 'years'
  | 'months'
  | 'weeks'
  | 'days'
  | 'hours'
  | 'minutes'
  | 'seconds'
  | 'milliseconds'

/**
 * A duration as a record of units, the shape `Intl.DurationFormat` and
 * `Temporal.Duration` use. Every field is optional; a missing field is zero.
 */
export type DurationInput = Partial<Record<DurationUnit, number>>

/** `'long'` (default), `'short'`, `'narrow'`, or `'digital'` for `h:mm:ss`. */
export type DurationStyle = 'long' | 'short' | 'narrow' | 'digital'

/** Options for {@link formatDuration}. */
export interface FormatDurationOptions {
  /** BCP-47 locale tag. Defaults to `'en'`; an invalid tag falls back to its language, then to `'en'`. */
  locale?: string
  /**
   * `'long'` (default) writes `ساعتان و٣ دقائق`, `'short'` `٢ س و٣ د`, and
   * `'narrow'` the tightest form the locale has. `'digital'` writes `h:mm:ss`.
   */
  style?: DurationStyle
  /** Digits to use: `'latn'` for `0123`, `'arab'` for `٠١٢٣`. Defaults to the locale's own. */
  numberingSystem?: string
  /**
   * Largest unit to show; anything larger is folded into it. Defaults to
   * `'days'` for a number of milliseconds and to the largest non-zero field
   * for an object. Ignored by `style: 'digital'`.
   */
  largestUnit?: DurationUnit
  /**
   * Smallest unit to show; the rest is rounded into it. Defaults to
   * `'milliseconds'`. It is also the unit a zero duration is written in.
   * Ignored by `style: 'digital'`, which rounds to seconds.
   */
  smallestUnit?: DurationUnit
  /**
   * Show at most this many units, counted from the first non-zero one, and
   * round the last. An integer of at least 1. Ignored by `style: 'digital'`.
   */
  maxUnits?: number
}

const UNITS: readonly DurationUnit[] = [
  'years',
  'months',
  'weeks',
  'days',
  'hours',
  'minutes',
  'seconds',
  'milliseconds',
]

/**
 * Length of each unit in milliseconds, in `UNITS` order. Seconds to weeks are
 * exact. A month is 30.4375 days and a year 365.25 days - twelve such months -
 * so years and months convert into each other exactly, and only a conversion
 * between months and days is nominal.
 */
const UNIT_MS = [31_557_600_000, 2_629_800_000, 604_800_000, 86_400_000, 3_600_000, 60_000, 1000, 1] as const

const WEEKS = 2
const DAYS = 3
const HOURS = 4
const MINUTES = 5
const SECONDS = 6
const MILLISECONDS = 7

const STYLES: readonly string[] = ['long', 'short', 'narrow', 'digital']

/**
 * Upper bound on the `Intl` formatters this module keeps. One duration can
 * need a formatter per unit plus one for the list, so the bound is twice the
 * per-kind limit of the caches in `format.ts`.
 */
export const DURATION_CACHE_LIMIT = FORMATTER_CACHE_LIMIT * 2

/**
 * The LRU of `Intl.DurationFormat`, `Intl.NumberFormat` and `Intl.ListFormat`
 * instances. `format.ts` does not export its cache class, so this module
 * keeps its own: a `Map` iterates in insertion order, which makes the first
 * key the least recently used one.
 */
const formatters = /*#__PURE__*/ new Map<string, unknown>()

/** Inspect the formatter cache. Test helper; not part of the public contract. */
export function durationCacheStats(): { size: number, limit: number } {
  return { size: formatters.size, limit: DURATION_CACHE_LIMIT }
}

/** Empty the formatter cache. Test helper; not part of the public contract. */
export function resetDurationCache(): void {
  formatters.clear()
}

/**
 * A cached formatter for the locale, with the same fallbacks as the other
 * helpers: the tag as given, then its language subtag, then `'en'`.
 */
function formatter<O, F>(
  kind: string,
  Formatter: new (locale: string, options: O) => F,
  locale: string,
  numberingSystem: string | undefined,
  options: O,
): F {
  const base = locale.replace(/_/g, '-')
  const key = `${kind}|${withNumberingSystem(base, numberingSystem)}|${JSON.stringify(options)}`
  let cached = formatters.get(key) as F | undefined
  if (cached) {
    formatters.delete(key)
  }
  else {
    for (const candidate of [base, base.split('-')[0]!]) {
      try {
        cached = new Formatter(withNumberingSystem(candidate, numberingSystem), options)
        break
      }
      catch {
        continue
      }
    }
    cached ??= new Formatter(withNumberingSystem('en', numberingSystem), options)
    if (formatters.size >= DURATION_CACHE_LIMIT) formatters.delete(formatters.keys().next().value!)
  }
  formatters.set(key, cached)
  return cached
}

/**
 * Development throws a `TypeError` for invalid input; production (and browser
 * builds with no `process` global) returns an empty string instead, so a bad
 * value leaves a gap in the page rather than crashing a render.
 */
function invalid(name: string, value: unknown): string {
  try {
    // Keep NODE_ENV available to Node and to the consuming bundler.
    if (process.env.NODE_ENV === 'production') return ''
  }
  catch {
    // The standalone browser build has no process global.
    return ''
  }
  throw new TypeError(`[vue-rtl-kit] formatDuration: invalid ${name}: ${String(value)}`)
}

/**
 * Split `total` milliseconds over the units in `order` (largest first). Every
 * unit takes the whole part of what is left and the last one is rounded, half
 * away from zero. A last unit that rounds up to a full unit of the one above
 * is carried into it, so 59.6 minutes is 1 hour and never "60 minutes".
 */
function split(total: number, order: number[]): number[] {
  const parts = UNIT_MS.map(() => 0)
  let rest = total
  order.forEach((unit, at) => {
    const count = rest / UNIT_MS[unit]!
    parts[unit] = at < order.length - 1 ? Math.floor(count) : Math.round(count)
    // Floating-point noise must not leave a negative remainder.
    rest = Math.max(0, rest - parts[unit]! * UNIT_MS[unit]!)
  })
  for (let at = order.length - 1; at > 0; at--) {
    const unit = order[at]!
    const above = order[at - 1]!
    if (parts[unit]! * UNIT_MS[unit]! < UNIT_MS[above]!) break
    parts[unit] = 0
    parts[above]!++
  }
  return parts
}

/** The part of `Intl.DurationFormat` this module calls. */
type NativeDurationFormat = new (locale: string, options: Record<string, string>) => {
  format: (duration: DurationInput) => string
}

/**
 * Format a duration in the locale's own words, plural forms and digits.
 *
 * `duration` is a number of milliseconds or an object of units. `locale`
 * defaults to `'en'`, `style` to `'long'`.
 *
 * **Balancing.** An object of whole numbers with one sign is written as
 * given, like `Intl.DurationFormat` does: `{ minutes: 90 }` is "90 minutes".
 * A number of milliseconds, an object passed with `largestUnit`,
 * `smallestUnit` or `maxUnits`, an object with fractional or mixed-sign
 * fields, and every `digital` duration are balanced first: the duration is
 * added up and split again from `largestUnit` (default: `'days'` for a
 * number, the largest non-zero field for an object) down to `smallestUnit`
 * (default: `'milliseconds'`). Weeks only take part when the object has
 * `weeks` or one of the two options names them. 1000 ms, 60 s, 60 min, 24 h,
 * 7 days and 12 months are exact; a month counts as 30.4375 days whenever
 * months and days have to be converted into each other.
 *
 * **Fractional values** are carried into the smaller units -
 * `{ hours: 1.5 }` is "1 hour, 30 minutes" - and what is left below
 * `smallestUnit` is rounded half away from zero.
 *
 * **Negative values.** The sign of the whole duration is written once, in
 * front, with the locale's minus sign; the units are formatted without it.
 * `Intl.DurationFormat` alone loses the sign in Arabic and Hebrew, whose
 * forms for one and two have no number to carry it. Mixed signs are added
 * up: `{ hours: 1, minutes: -30 }` is "30 minutes".
 *
 * **Zero.** Units that are zero are left out. A duration that is zero, or
 * rounds to zero, is written as zero of `smallestUnit`; without that option,
 * as zero of the smallest field the object has, or `0 seconds` for a number
 * and for `{}`.
 *
 * **maxUnits** keeps that many units, counted from the first non-zero one,
 * and rounds the last: 1 h 59 min 40 s with `maxUnits: 2` is "2 hours".
 *
 * **Digital** is `h:mm:ss`: larger units are folded into the hours,
 * milliseconds are rounded to the second, and `largestUnit`, `smallestUnit`
 * and `maxUnits` are not used.
 *
 * **Invalid input** - a duration that is not a finite number or a plain
 * object of finite numbers, an unknown unit or style, a `largestUnit` smaller
 * than `smallestUnit`, a `maxUnits` that is not an integer of at least 1 -
 * throws `TypeError` in development and returns an empty string in
 * production.
 *
 * **Fallback.** Without `Intl.DurationFormat`, or when it rejects a value
 * that is out of its range, each unit goes through `Intl.NumberFormat` unit
 * style and the result through `Intl.ListFormat`; see the note at the top of
 * this file.
 *
 * @example
 * formatDuration({ hours: 2, minutes: 3 }, { locale: 'ar', numberingSystem: 'latn' }) // 'ساعتان و3 دقائق'
 * formatDuration({ hours: 11, minutes: 2 }, { locale: 'ar-EG', numberingSystem: 'arab' }) // '١١ ساعة ودقيقتان'
 * formatDuration(3_723_000, { locale: 'ar-EG', numberingSystem: 'arab', style: 'digital' }) // '١:٠٢:٠٣'
 * formatDuration(5_400_000, { locale: 'ar', maxUnits: 1 }) // 'ساعتان'
 * formatDuration({ days: 3 }, { locale: 'ar-SA', numberingSystem: 'latn' }) // '3 أيام'
 */
export function formatDuration(
  duration: DurationInput | number,
  options: FormatDurationOptions = {},
): string {
  const { locale = 'en', style = 'long', numberingSystem, largestUnit, smallestUnit, maxUnits } = options || {}
  const digital = style === 'digital'
  const largest = UNITS.indexOf(largestUnit!)
  const smallest = UNITS.indexOf(smallestUnit!)

  if (typeof locale !== 'string') return invalid('locale', locale)
  if (!STYLES.includes(style)) return invalid('style', style)
  if (largestUnit !== undefined && largest < 0) return invalid('largestUnit', largestUnit)
  if (smallestUnit !== undefined && smallest < 0) return invalid('smallestUnit', smallestUnit)
  if (smallest >= 0 && largest > smallest) return invalid('largestUnit, smaller than smallestUnit', largestUnit)
  if (maxUnits !== undefined && !(Number.isInteger(maxUnits) && maxUnits > 0)) return invalid('maxUnits', maxUnits)

  // The value of every unit as given, in UNITS order.
  const fields = UNIT_MS.map(() => 0)
  const milliseconds = typeof duration === 'number'
  let smallestGiven = SECONDS
  if (milliseconds) {
    fields[MILLISECONDS] = duration
  }
  else if (duration && typeof duration === 'object' && !Array.isArray(duration)) {
    let given = -1
    for (const key of Object.keys(duration)) {
      const unit = UNITS.indexOf(key as DurationUnit)
      // An unknown key - `hour` for `hours` - is a typo, not a zero.
      if (unit < 0) return invalid('unit', key)
      const value = duration[key as DurationUnit]
      if (value !== undefined) {
        fields[unit] = value
        given = Math.max(given, unit)
      }
    }
    if (given >= 0) smallestGiven = given
  }
  else {
    return invalid('duration', duration)
  }
  const bad = fields.findIndex(value => !Number.isFinite(value))
  if (bad >= 0) return invalid(milliseconds ? 'duration' : UNITS[bad]!, fields[bad])

  const total = fields.reduce((sum, value, unit) => sum + value * UNIT_MS[unit]!, 0)
  const size = Math.abs(total)
  let parts = fields.map(Math.abs)
  if (
    milliseconds || digital || largest >= 0 || smallest >= 0 || maxUnits
    // Fractions, and a field whose sign is not the sign of the whole.
    || fields.some(value => !Number.isInteger(value) || (value && value * total <= 0))
  ) {
    const first = fields.findIndex(Boolean)
    const low = digital ? SECONDS : smallest < 0 ? MILLISECONDS : smallest
    const high = Math.min(low, digital ? HOURS : largest >= 0 ? largest : milliseconds ? DAYS : first < 0 ? low : first)
    const order = UNIT_MS.map((_, unit) => unit).filter(unit =>
      unit >= high && unit <= low && (unit !== WEEKS || unit === high || unit === low || fields[WEEKS] !== 0),
    )
    parts = split(size, order)
    if (maxUnits && !digital) {
      // Rounding at a coarser unit can carry into a larger one, so split again.
      parts = split(size, order.slice(0, order.findIndex(unit => parts[unit]) + maxUnits))
    }
  }

  const zero = !parts.some(Boolean)
  const zeroUnit = smallest >= 0 ? smallest : Math.max(largest, smallestGiven)
  const shown = digital
    ? [HOURS, MINUTES, SECONDS]
    : zero ? [zeroUnit] : parts.flatMap((value, unit) => (value ? [unit] : []))

  let text: string | undefined
  const Native = (Intl as unknown as { DurationFormat?: NativeDurationFormat }).DurationFormat
  if (typeof Native === 'function') {
    try {
      const record: DurationInput = {}
      for (const unit of shown) record[UNITS[unit]!] = parts[unit]
      // Intl.DurationFormat leaves zero units out unless told to keep one.
      const display = zero && !digital ? { style, [`${UNITS[zeroUnit]}Display`]: 'always' } : { style }
      text = formatter('d', Native, locale, numberingSystem, display).format(record)
    }
    catch {
      // Out of Intl.DurationFormat's range, or an engine quirk: use the fallback.
    }
  }
  if (text === undefined) {
    const count = (unit: number, numberOptions: Intl.NumberFormatOptions): string =>
      formatter('n', Intl.NumberFormat, locale, numberingSystem, numberOptions).format(parts[unit]!)
    text = digital
      ? `${count(HOURS, { useGrouping: false })}:${count(MINUTES, { minimumIntegerDigits: 2 })}:${count(SECONDS, { minimumIntegerDigits: 2 })}`
      : formatter('l', Intl.ListFormat, locale, numberingSystem, { type: 'unit', style }).format(
          shown.map(unit => count(unit, { style: 'unit', unit: UNITS[unit]!.slice(0, -1), unitDisplay: style })),
        )
  }
  if (total < 0 && !zero) {
    // The locale's minus sign with its bidi mark: what `-1` has and `1` does not.
    const plain = formatter('n', Intl.NumberFormat, locale, numberingSystem, {})
    text = plain.format(-1).replace(plain.format(1), '') + text
  }
  return text
}
