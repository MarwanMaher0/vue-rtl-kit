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

/** Options for {@link formatPlural}. */
export type FormatPluralOptions = FormatOptionsBase & {
  /** `'cardinal'` (default) counts things; `'ordinal'` ranks them (1st, 2nd, …). */
  type?: 'cardinal' | 'ordinal'
}

/**
 * The message forms {@link formatPlural} chooses from, keyed by CLDR plural
 * category. Arabic uses all six (`zero`, `one`, `two`, `few`, `many`, `other`);
 * most languages use fewer. Missing categories fall back to `other`, which is
 * the only required form. Every `{count}` in the chosen form is replaced with
 * the formatted number.
 */
export interface PluralForms extends Partial<Record<Intl.LDMLPluralRule, string>> {
  /** Fallback form, used whenever the selected category has no form of its own. */
  other: string
}

/** Options for {@link formatDisplayName}. */
export interface FormatDisplayNameOptions {
  /** What the code identifies. Required. */
  type: 'language' | 'region' | 'currency' | 'script' | 'calendar' | 'dateTimeField'
  /** BCP-47 locale tag to name the code in. Defaults to the current context locale. */
  locale?: string
  /** Name length: `'long'` (default), `'short'` or `'narrow'`. */
  style?: 'long' | 'short' | 'narrow'
  /**
   * For `type: 'language'`: `'dialect'` (default) prefers dialect names -
   * `en-US` as "American English"; `'standard'` composes "English (United
   * States)".
   */
  languageDisplay?: 'dialect' | 'standard'
  /**
   * What an unknown or invalid code returns: the code itself (`'code'`, the
   * default) or an empty string (`'none'`).
   */
  fallback?: 'code' | 'none'
}

/** Options for {@link parseNumber}. */
export interface ParseNumberOptions {
  /** BCP-47 locale tag the text is written in. Defaults to `'en'`. */
  locale?: string
  /** Numbering system the text was formatted with, as passed to `formatNumber()`. */
  numberingSystem?: NumberingSystem
}

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
const pluralRules = /*#__PURE__*/ new LruCache<Intl.PluralRules>(FORMATTER_CACHE_LIMIT)
const displayNames = /*#__PURE__*/ new LruCache<Intl.DisplayNames>(FORMATTER_CACHE_LIMIT)

/** What `parseNumber()` needs to know about a locale and numbering system. */
interface NumberSymbols {
  /**
   * The numbering system's digits from 9 down to 0. Empty for Western,
   * Arabic-Indic and Persian digits, which `transliterateDigits()` reads.
   */
  digits: string[]
  group: string
  decimal: string
  minusSign: string
}

const numberSymbols = /*#__PURE__*/ new LruCache<NumberSymbols>(FORMATTER_CACHE_LIMIT)

/** Inspect the formatter caches. Test helper; not part of the public contract. */
export function formatterCacheStats(): {
  number: number
  date: number
  list: number
  relativeTime: number
  displayName: number
  limit: number
} {
  return {
    number: numberFormatters.size,
    date: dateFormatters.size,
    list: listFormatters.size,
    relativeTime: relativeTimeFormatters.size,
    displayName: displayNames.size,
    limit: FORMATTER_CACHE_LIMIT,
  }
}

/**
 * Empty the formatter caches, the separators cached for `parseNumber()`, and
 * the cached `Intl.supportedValuesOf` result. Test helper; not part of the
 * public contract.
 */
export function resetFormatterCaches(): void {
  numberFormatters.clear()
  dateFormatters.clear()
  listFormatters.clear()
  relativeTimeFormatters.clear()
  pluralRules.clear()
  displayNames.clear()
  numberSymbols.clear()
  supportedNumberingSystems = undefined
  displayNamesHonorsNone = undefined
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
 * Pick the plural form for `count` with `Intl.PluralRules` and fill in its
 * `{count}` placeholders.
 *
 * `n === 1 ? singular : plural` is wrong for Arabic, which has six plural
 * categories: `0` is `zero`, `1` `one`, `2` `two`, `3`–`10` `few`, `11`–`99`
 * `many`, and `100` `other`. The category comes from the locale's CLDR rules,
 * not from a hand-written range check, so Hebrew `two`, Persian `one` for `0`,
 * and English ordinals (`1st`, `2nd`, `3rd`) work too.
 *
 * The form for the selected category is used, falling back to `forms.other`
 * when that category has no form. Every `{count}` in the chosen form is
 * replaced with `formatNumber(count, options)`, so `numberingSystem` and
 * `isolate` apply to the number inside the sentence. Text without `{count}`
 * is returned as is.
 *
 * Non-finite (`NaN`, `Infinity`), negative and fractional counts select the
 * category `Intl.PluralRules` reports (usually `other`) without throwing.
 * Returns an empty string when `forms.other` is empty or the runtime has no
 * `Intl.PluralRules`.
 *
 * @example
 * const files = { zero: 'لا ملفات', one: 'ملف واحد', two: 'ملفان', few: '{count} ملفات', many: '{count} ملفًا', other: '{count} ملف' }
 * formatPlural(11, files, { locale: 'ar' }) // '11 ملفًا' — not '11 ملفات'
 * formatPlural(3, files, { locale: 'ar-EG' }) // '٣ ملفات'
 * formatPlural(2, { one: '{count} day', other: '{count} days' }) // '2 days'
 * formatPlural(3, { few: '{count}rd', other: '{count}th' }, { type: 'ordinal' }) // '3rd'
 */
export function formatPlural(
  count: number,
  forms: PluralForms,
  options: FormatPluralOptions = {},
): string {
  const fallback = forms?.other
  if (!fallback || typeof Intl.PluralRules !== 'function') return ''
  const { locale = 'en', numberingSystem, intl } = split(options)
  const tag = withNumberingSystem(locale, numberingSystem)
  const key = cacheKey(tag, intl)
  let rules = pluralRules.get(key)
  if (!rules) {
    rules = makeFormatter(locale, numberingSystem, intl, Intl.PluralRules)
    pluralRules.set(key, rules)
  }
  const form = forms[rules.select(count)] ?? fallback
  // `type` selects plural rules, not number formatting; keep it out of the
  // NumberFormat options. A replacer function keeps `$` in a formatted number
  // (a currency symbol) from being read as a replacement pattern.
  const { type: _type, ...numberOptions } = options
  return form.replace(/\{count\}/g, () => formatNumber(count, numberOptions))
}

/**
 * Whether `Intl.DisplayNames` honours `fallback: 'none'` by returning
 * `undefined` for a code it cannot name. Some engines ignore the option and
 * echo the code back; only there does an echoed code mean "unknown". Probed
 * once with `qaa`, a language subtag reserved for private use that no locale
 * names, and remembered like the `Intl.supportedValuesOf` result.
 */
let displayNamesHonorsNone: boolean | undefined

function honorsNoneFallback(): boolean {
  if (displayNamesHonorsNone === undefined) {
    try {
      displayNamesHonorsNone
        = new Intl.DisplayNames('en', { type: 'language', fallback: 'none' }).of('qaa') === undefined
    }
    catch {
      displayNamesHonorsNone = true
    }
  }
  return displayNamesHonorsNone
}

/**
 * The display name of a language, region, currency, script, calendar or
 * date-time field code, in the locale's own words - so a language picker on
 * an Arabic page offers "العربية" instead of "Arabic", and a country picker
 * shows "مصر" instead of "Egypt".
 *
 * Wraps `Intl.DisplayNames` with the same locale fallbacks and bounded
 * formatter cache as the other helpers. An unknown code returns the code
 * itself (`fallback: 'code'`, the default) or an empty string
 * (`fallback: 'none'`); a structurally invalid code, or a runtime without
 * `Intl.DisplayNames`, returns the same fallback instead of throwing. The
 * code is read through `String(code)`, so `null`, `undefined` and numbers
 * fall back to their string form.
 *
 * @example
 * formatDisplayName('ar', { type: 'language', locale: 'ar' }) // 'العربية'
 * formatDisplayName('EG', { type: 'region', locale: 'ar' }) // 'مصر'
 * formatDisplayName('EGP', { type: 'currency', locale: 'en' }) // 'Egyptian Pound'
 * formatDisplayName('ar-EG', { type: 'language', languageDisplay: 'standard' }) // 'Arabic (Egypt)'
 * formatDisplayName('zz', { type: 'language', fallback: 'none' }) // ''
 */
export function formatDisplayName(code: string, options: FormatDisplayNameOptions): string {
  const { locale = 'en', fallback = 'code', ...intl } = options ?? ({} as FormatDisplayNameOptions)
  const tag = String(code)
  const fallbackValue = fallback === 'none' ? '' : tag
  if (typeof Intl.DisplayNames !== 'function') return fallbackValue
  const key = cacheKey(locale.replace(/_/g, '-'), intl)
  try {
    let names = displayNames.get(key)
    if (!names) {
      // Ask Intl for `undefined` on unknown codes so `fallback` is ours alone.
      names = makeFormatter(locale, undefined, { ...intl, fallback: 'none' }, Intl.DisplayNames)
      displayNames.set(key, names)
    }
    const name = names.of(tag)
    if (name === undefined) return fallbackValue
    // On engines that ignore fallback:'none', an echoed code is an unknown
    // code. Where the option works, a real name equal to its code ('second'
    // in en, narrow 'US') stays a name.
    if (fallback === 'none' && name === tag && !honorsNoneFallback()) return ''
    return name
  }
  catch {
    return fallbackValue
  }
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

/**
 * Invisible characters `parseNumber()` drops before reading a number: the
 * bidi marks and isolates that `Intl` and `isolate` add (ALM, LRM, RLM,
 * LRI/RLI/FSI/PDI). Embeddings and overrides are deliberately not in the
 * list - an override can show `12` for a string that reads `21`.
 */
const MARKS_IN_NUMBERS = /[\u061C\u200E\u200F\u2066-\u2069]/g

/**
 * The spaces `Intl` puts in a number: space, NBSP and narrow NBSP. French and
 * Swedish group with one, and many locales put one before the percent sign.
 */
const SPACES_IN_NUMBERS = /[\u00A0\u202F ]/g

/** Sign, grouped integer digits, fraction, percent - after separators are mapped to ASCII. */
const CANONICAL_NUMBER = /^[+-]?(?=\.?\d)(?:\d+(?:,\d+)*)?(?:\.\d*)?%?$/

/**
 * Read the group separator, decimal separator, minus sign and digits a
 * locale formats with out of `formatToParts`, once per locale tag.
 */
function numberSymbolsFor(locale: string, numberingSystem: NumberingSystem | undefined): NumberSymbols {
  const key = withNumberingSystem(locale, numberingSystem)
  let symbols = numberSymbols.get(key)
  if (!symbols) {
    symbols = { digits: [], group: '', decimal: '', minusSign: '' }
    let integer = ''
    // One sample carries every digit, group separators, a decimal separator and a minus sign.
    const parts = makeFormatter(locale, numberingSystem, {}, Intl.NumberFormat).formatToParts(-9876543210.5)
    for (const { type, value } of parts) {
      // Some engines keep the bidi mark inside the sign. Whichever space a locale groups with reads as ' '.
      const symbol = value.replace(MARKS_IN_NUMBERS, '').replace(SPACES_IN_NUMBERS, ' ')
      if (type === 'integer') integer += transliterateDigits(symbol, 'latn')
      else if (type === 'group' || type === 'decimal' || type === 'minusSign') symbols[type] = symbol
    }
    // Bengali, Devanagari and the like: ten digits of their own, none of them 0-9.
    const digits = Array.from(integer)
    if (digits.length === 10 && !/\d/.test(integer)) symbols.digits = digits
    numberSymbols.set(key, symbols)
  }
  return symbols
}

/**
 * Parse a number written the way `formatNumber()` writes it for a locale -
 * the inverse that `Number()` cannot be, since it returns `NaN` for
 * `'١٬٢٣٤٫٥'`, `'1.234,5'` or `'1 234,5'`.
 *
 * The group separator, decimal separator and minus sign come from
 * `Intl.NumberFormat` for the locale and numbering system, so pass the same
 * `locale` and `numberingSystem` you format with. Western, Arabic-Indic and
 * Persian digits are read in every locale, next to the locale's own digits.
 * Bidi marks, isolates and spaces are ignored; `-` and U+2212 are both a
 * minus sign, a leading `+` is allowed, and a trailing `%` or `٪` divides the
 * result by 100. Group separators are only accepted between digits of the
 * integer part, and group sizes are not checked, so `12,34,567` parses. Where
 * the locale groups with a space, as French does, a space between two digits
 * is that group separator, so `1,2 3` is not a number there.
 *
 * Returns `NaN` - and never throws - for empty text and for anything that is
 * not a plain number: letters, currency symbols, exponents, a separator from
 * another locale, a second decimal separator, a separator on its own.
 *
 * @example
 * parseNumber('١٬٢٣٤٫٥', { locale: 'ar-EG' }) // 1234.5
 * parseNumber('1.234,5', { locale: 'de' }) // 1234.5
 * parseNumber('١٢٫٥٪', { locale: 'ar-EG' }) // 0.125
 * parseNumber('12abc') // NaN
 */
export function parseNumber(text: string, options: ParseNumberOptions = {}): number {
  try {
    const { locale = 'en', numberingSystem } = options
    const { digits, group, decimal, minusSign } = numberSymbolsFor(locale, numberingSystem)
    // A locale that groups with a space keeps its spaces until their position is known.
    const spaced = group === ' '
    const source = text.replace(MARKS_IN_NUMBERS, '').replace(SPACES_IN_NUMBERS, spaced ? ' ' : '')
    let canonical = ''
    for (const char of transliterateDigits(source, 'latn')) {
      const digit = digits.indexOf(char)
      if (digit >= 0) canonical += 9 - digit
      else if (char === decimal) canonical += '.'
      else if (char === group && !spaced) canonical += ','
      else if (char === minusSign || char === '\u2212') canonical += '-'
      else if (char === '\u066A') canonical += '%'
      // A dot or comma that is not this locale's separator must not reach `Number()`.
      else canonical += char === '.' || char === ',' ? '?' : char
    }
    // Spaces between two digits are a group separator, and are checked as one; the rest are dropped.
    if (spaced) canonical = canonical.replace(/(\d) +(?=\d)/g, '$1,').replace(/ /g, '')
    if (!CANONICAL_NUMBER.test(canonical)) return Number.NaN
    // `e-2` moves the decimal point exactly; dividing by 100 would turn 5.6% into 0.055999999999999994.
    return Number(canonical.replace(/,/g, '').replace('%', 'e-2'))
  }
  catch {
    return Number.NaN
  }
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
  /** `formatPlural()` for this locale and numbering system: picks the CLDR plural form and fills in `{count}`. */
  formatPlural: (count: number, forms: PluralForms, options?: FormatPluralOptions) => string
  /** `formatDisplayName()` for this locale: names language, region, currency, script, calendar and date-time field codes in the locale's own words. */
  formatDisplayName: (code: string, options: FormatDisplayNameOptions) => string
  /** `parseNumber()` for this locale and numbering system: reads back what `formatNumber` writes. */
  parseNumber: (text: string, options?: ParseNumberOptions) => number
}
