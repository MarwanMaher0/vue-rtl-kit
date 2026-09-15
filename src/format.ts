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

/**
 * Apply a numbering system to a locale tag through the `-u-nu-` extension.
 *
 * Every engine with `Intl` understands the extension, whereas the
 * `numberingSystem` *option* is newer; going through the tag is the portable
 * route and is what `Intl.NumberFormat` does internally anyway.
 */
export function withNumberingSystem(locale: string, numberingSystem?: NumberingSystem): string {
  if (!numberingSystem) return locale
  if (/-u-.*nu-/.test(locale)) return locale
  return locale.includes('-u-')
    ? `${locale}-nu-${numberingSystem}`
    : `${locale}-u-nu-${numberingSystem}`
}

const numberFormatters = new Map<string, Intl.NumberFormat>()
const dateFormatters = new Map<string, Intl.DateTimeFormat>()

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
    formatter = new Intl.NumberFormat(tag, intl)
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
  const { locale = 'en', numberingSystem, wrap, intl } = split(options)
  const tag = withNumberingSystem(locale, numberingSystem)
  const key = cacheKey(tag, intl)
  let formatter = dateFormatters.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(tag, intl)
    dateFormatters.set(key, formatter)
  }
  const date = value instanceof Date ? value : new Date(value)
  return maybeIsolate(formatter.format(date), wrap)
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
}
