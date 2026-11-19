/**
 * `Intl` wrappers with the two things RTL apps always need: an explicit
 * numbering system, and the option to isolate the result before it is spliced
 * into a sentence.
 *
 * Arabic locales default to Arabic-Indic digits (`٠١٢٣`) in most `Intl`
 * implementations. Plenty of Arabic products want Western digits (`0123`) -
 * financial figures, IDs, version numbers - and `numberingSystem: 'latn'` is
 * the supported way to ask for that, rather than transliterating by hand.
 */
import { isolate } from './bidi'
import type { Direction, DirectionOrAuto, NumberingSystem } from './types'

export interface FormatOptionsBase {
  /** BCP-47 locale tag. Defaults to the current context locale. */
  locale?: string
  /** Digits to use: `'latn'` for `0123`, `'arab'` for `٠١٢٣`. */
  numberingSystem?: NumberingSystem
  /**
   * Wrap the result in a Unicode isolate so it cannot be reordered by the
   * surrounding paragraph. Pass `true` for FSI, or a direction for LRI/RLI.
   */
  isolate?: boolean | DirectionOrAuto
}

export type NumberFormatOptions = FormatOptionsBase & Intl.NumberFormatOptions
export type DateFormatOptions = FormatOptionsBase & Intl.DateTimeFormatOptions
export type ListFormatOptions = FormatOptionsBase & Intl.ListFormatOptions
export type RelativeTimeFormatOptions = FormatOptionsBase & Intl.RelativeTimeFormatOptions

let supportedNumberingSystems: Set<string> | null | undefined

function resolveNumberingSystem(numberingSystem: NumberingSystem | undefined): string | undefined {
  if (numberingSystem === undefined) return undefined
  const normalized = String(numberingSystem).toLowerCase()
  if (supportedNumberingSystems === undefined) {
    try {
      supportedNumberingSystems = new Set(Intl.supportedValuesOf('numberingSystem'))
    }
    catch {
      supportedNumberingSystems = null
    }
  }
  if (supportedNumberingSystems) {
    return supportedNumberingSystems.has(normalized) ? normalized : 'latn'
  }
  return /^[a-z0-9]{3,8}$/i.test(normalized) ? normalized : 'latn'
}

/**
 * Apply a numbering system to a locale tag through the `-u-nu-` extension.
 *
 * Every engine with `Intl` understands the extension, whereas the
 * `numberingSystem` *option* is newer; going through the tag is the portable
 * route and is what `Intl.NumberFormat` does internally anyway.
 */
export function withNumberingSystem(locale: string, numberingSystem?: NumberingSystem): string {
  const tag = locale.replace(/_/g, '-')
  const base = tag.split(/-x-/i)[0]!
  const resolved = resolveNumberingSystem(numberingSystem)
  if (!resolved || /-u-.*nu-/i.test(base)) return tag
  return tag.replace(/(?=-x-)|$/i, `${/-u-/i.test(base) ? '-nu-' : '-u-nu-'}${resolved}`)
}

function makeFormatter<F, O>(
  locale: string,
  numberingSystem: NumberingSystem | undefined,
  options: O,
  Formatter: new (locale: string, options: O) => F,
): F {
  const base = locale.replace(/_/g, '-')
  for (const candidate of [base, base.split('-')[0]!]) {
    try {
      return new Formatter(withNumberingSystem(candidate, numberingSystem), options)
    }
    catch {
      continue
    }
  }
  return new Formatter(withNumberingSystem('en', numberingSystem), options)
}

/**
 * Upper bound on cached `Intl` formatters per kind. Formatter construction is
 * the expensive part of `Intl`, so a small LRU keeps the hot paths fast without
 * letting a long-running server or a locale-switching SPA grow the caches
 * without limit.
 */
export const FORMATTER_CACHE_LIMIT = 32

class LruCache<V> {
  private readonly map = new Map<string, V>()

  constructor(private readonly limit: number) {}

  get size(): number {
    return this.map.size
  }

  get(key: string): V | undefined {
    const value = this.map.get(key)
    if (value === undefined) return undefined
    this.map.delete(key)
    this.map.set(key, value)
    return value
  }

  set(key: string, value: V): void {
    if (this.map.has(key)) this.map.delete(key)
    else if (this.map.size >= this.limit) {
      const oldest = this.map.keys().next()
      if (!oldest.done) this.map.delete(oldest.value)
    }
    this.map.set(key, value)
  }

  has(key: string): boolean {
    return this.map.has(key)
  }

  clear(): void {
    this.map.clear()
  }
}

const numberFormatters = /*#__PURE__*/ new LruCache<Intl.NumberFormat>(FORMATTER_CACHE_LIMIT)
const dateFormatters = /*#__PURE__*/ new LruCache<Intl.DateTimeFormat>(FORMATTER_CACHE_LIMIT)
const listFormatters = /*#__PURE__*/ new LruCache<Intl.ListFormat>(FORMATTER_CACHE_LIMIT)
const relativeTimeFormatters = /*#__PURE__*/ new LruCache<Intl.RelativeTimeFormat>(FORMATTER_CACHE_LIMIT)

/** Inspect the formatter caches. Test helper; not part of the public contract. */
export function formatterCacheStats(): {
  number: number
  date: number
  list: number
  relativeTime: number
  limit: number
} {
  return {
    number: numberFormatters.size,
    date: dateFormatters.size,
    list: listFormatters.size,
    relativeTime: relativeTimeFormatters.size,
    limit: FORMATTER_CACHE_LIMIT,
  }
}

/**
 * Empty the formatter caches and clear the cached `Intl.supportedValuesOf`
 * result. Test helper; not part of the public contract.
 */
export function resetFormatterCaches(): void {
  numberFormatters.clear()
  dateFormatters.clear()
  listFormatters.clear()
  relativeTimeFormatters.clear()
  supportedNumberingSystems = undefined
}

function cacheKey(locale: string, options: object): string {
  return `${locale}|${JSON.stringify(options)}`
}

function split<T extends FormatOptionsBase>(options: T) {
  const { locale, numberingSystem, isolate: wrap, ...intl } = options
  return { locale, numberingSystem, wrap, intl }
}

function maybeIsolate(value: string, wrap: boolean | DirectionOrAuto | undefined): string {
  if (!wrap) return value
  return isolate(value, wrap === true ? 'auto' : wrap)
}

/**
 * Format a number with an explicit numbering system.
 *
 * @example
 * formatNumber(1234.5, { locale: 'ar-EG' }) // '١٬٢٣٤٫٥'
 * formatNumber(1234.5, { locale: 'ar-EG', numberingSystem: 'latn' }) // '1,234.5'
 */
export function formatNumber(value: number, options: NumberFormatOptions = {}): string {
  const { locale = 'en', numberingSystem, wrap, intl } = split(options)
  const tag = withNumberingSystem(locale, numberingSystem)
  const key = cacheKey(tag, intl)
  let formatter = numberFormatters.get(key)
  if (!formatter) {
    formatter = makeFormatter(locale, numberingSystem, intl, Intl.NumberFormat)
    numberFormatters.set(key, formatter)
  }
  return maybeIsolate(formatter.format(value), wrap)
}

/**
 * Format a currency amount.
 *
 * @param value - the amount
 * @param currency - ISO 4217 code, e.g. `'EGP'`, `'AED'`, `'USD'`
 *
 * @example
 * formatCurrency(2500, 'EGP', { locale: 'ar-EG', numberingSystem: 'latn' })
 * // '2,500.00 ج.م.'
 */
export function formatCurrency(
  value: number,
  currency: string,
  options: NumberFormatOptions = {},
): string {
  return formatNumber(value, { style: 'currency', currency, ...options })
}

/**
 * Format a date.
 *
 * Note the `calendar` option: `'islamic-umalqura'` and `'persian'` are the
 * calendars Arabic and Persian products usually need alongside `'gregory'`.
 *
 * @example
 * formatDate(new Date('2024-05-12'), { locale: 'ar-EG', dateStyle: 'long' })
 * // '١٢ مايو ٢٠٢٤'
 * formatDate(new Date('2024-05-12'), { locale: 'ar-EG', numberingSystem: 'latn', isolate: 'ltr' })
 */
export function formatDate(
  value: Date | number | string,
  options: DateFormatOptions = {},
): string {
  const date = new Date(value as string | number)
  if (Number.isNaN(date.getTime())) return ''
  const { locale = 'en', numberingSystem, wrap, intl } = split(options)
  const tag = withNumberingSystem(locale, numberingSystem)
  const key = cacheKey(tag, intl)
  let formatter = dateFormatters.get(key)
  if (!formatter) {
    formatter = makeFormatter(locale, numberingSystem, intl, Intl.DateTimeFormat)
    dateFormatters.set(key, formatter)
  }
  return maybeIsolate(formatter.format(date), wrap)
}

/**
 * Join a list of strings with the locale's conjunction or disjunction.
 *
 * With `isolate` set, the list is formatted from the plain items (so
 * conjunctions that depend on the next item, such as Spanish `e`/`u` or
 * Hebrew `ו`, stay correct), then every item in the result is wrapped in its
 * own first-strong isolate - so a Latin name cannot swap places with its
 * neighbours in an Arabic list - and the whole result is isolated as requested.
 *
 * @example
 * formatList(['Ahmed', 'Sara', 'Omar'], { locale: 'ar' }) // 'Ahmed وSara وOmar'
 * formatList(['PDF', 'CSV'], { locale: 'en', type: 'disjunction' }) // 'PDF or CSV'
 */
export function formatList(items: Iterable<string>, options: ListFormatOptions = {}): string {
  const { locale = 'en', numberingSystem, wrap, intl } = split(options)
  const tag = withNumberingSystem(locale, numberingSystem)
  const key = cacheKey(tag, intl)
  let formatter = listFormatters.get(key)
  if (!formatter) {
    formatter = makeFormatter(locale, numberingSystem, intl, Intl.ListFormat)
    listFormatters.set(key, formatter)
  }
  const list = Array.from(items, String)
  if (!wrap) return formatter.format(list)
  // Format the plain items so locale rules that look at the next item (es y/e,
  // o/u; he ו) still apply, then isolate only the element parts.
  const joined = formatter
    .formatToParts(list)
    .map(part => (part.type === 'element' ? isolate(part.value) : part.value))
    .join('')
  return maybeIsolate(joined, wrap)
}

/**
 * Format a relative time such as "in 3 days" or "2 hours ago".
 *
 * Negative values are in the past, positive values in the future. A
 * non-finite value (`NaN`, `Infinity`) returns an empty string, like an
 * invalid date in `formatDate()`.
 *
 * @param value - the amount of `unit`s from now
 * @param unit - `'second'`, `'minute'`, `'hour'`, `'day'`, `'week'`, `'month'`, `'quarter'` or `'year'`
 *
 * @example
 * formatRelativeTime(-3, 'day', { locale: 'ar-EG' }) // 'قبل ٣ أيام'
 * formatRelativeTime(-3, 'day', { locale: 'ar-EG', numberingSystem: 'latn' }) // 'قبل 3 أيام'
 * formatRelativeTime(1, 'day', { locale: 'en', numeric: 'auto' }) // 'tomorrow'
 */
export function formatRelativeTime(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  options: RelativeTimeFormatOptions = {},
): string {
  if (!Number.isFinite(value)) return ''
  const { locale = 'en', numberingSystem, wrap, intl } = split(options)
  const tag = withNumberingSystem(locale, numberingSystem)
  const key = cacheKey(tag, intl)
  let formatter = relativeTimeFormatters.get(key)
  if (!formatter) {
    formatter = makeFormatter(locale, numberingSystem, intl, Intl.RelativeTimeFormat)
    relativeTimeFormatters.set(key, formatter)
  }
  return maybeIsolate(formatter.format(value, unit), wrap)
}

/**
 * Convert the digits in a string between numbering systems without touching
 * anything else.
 *
 * For text you did not format yourself - a server-rendered invoice number, a
 * pasted reference - where reformatting through `Intl` is not an option.
 *
 * @example
 * transliterateDigits('طلب رقم 4821', 'arab') // 'طلب رقم ٤٨٢١'
 */
export function transliterateDigits(text: string, to: 'latn' | 'arab' | 'arabext'): string {
  const targets = { latn: 0x30, arab: 0x0660, arabext: 0x06F0 } as const
  const base = targets[to]
  return text.replace(/[0-9٠-٩۰-۹]/g, (char) => {
    const code = char.codePointAt(0)!
    const digit = code >= 0x06F0 ? code - 0x06F0 : code >= 0x0660 ? code - 0x0660 : code - 0x30
    return String.fromCodePoint(base + digit)
  })
}

/** Direction-bound formatters returned by `useFormat()`. */
export interface BoundFormatters {
  /** The locale these formatters are bound to. */
  locale: string
  /** Direction of the surrounding scope. */
  dir: Direction
  formatNumber: (value: number, options?: NumberFormatOptions) => string
  formatCurrency: (value: number, currency: string, options?: NumberFormatOptions) => string
  formatDate: (value: Date | number | string, options?: DateFormatOptions) => string
  formatList: (items: Iterable<string>, options?: ListFormatOptions) => string
  formatRelativeTime: (
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
    options?: RelativeTimeFormatOptions,
  ) => string
}
