/**
 * Locale -> direction resolution.
 */
import type { Direction, LocaleMap } from './types'

/**
 * Language subtags written right-to-left, by ISO 639-1/639-3 code.
 *
 * Kept as data rather than an `Intl` call because `Intl.Locale#getTextInfo`
 * is still missing from Firefox and older Safari, and a 20-entry set is
 * cheaper than a polyfill.
 */
export const RTL_LANGUAGES: ReadonlySet<string> = new Set([
  'ar', // Arabic
  'arc', // Aramaic
  'ckb', // Central Kurdish (Sorani)
  'dv', // Divehi
  'fa', // Persian
  'ha', // Hausa (Ajami orthography)
  'he', // Hebrew
  'iw', // Hebrew (legacy code)
  'khw', // Khowar
  'ks', // Kashmiri
  'ku', // Kurdish
  'nqo', // N'Ko
  'ps', // Pashto
  'sd', // Sindhi
  'syr', // Syriac
  'ug', // Uyghur
  'ur', // Urdu
  'uz-af', // Uzbek (Afghanistan, Arabic script)
  'yi', // Yiddish
])

/** Script subtags that are written right-to-left. */
const RTL_SCRIPTS: ReadonlySet<string> = new Set([
  'adlm', 'arab', 'aran', 'hebr', 'nkoo', 'rohg', 'syrc', 'thaa', 'yezi',
])

/**
 * Resolve the writing direction of a BCP-47 locale tag.
 *
 * The script subtag wins when present, so `az-Arab` is RTL while `az` is not,
 * and `ku-Latn` is LTR even though `ku` is in the RTL list.
 *
 * @param locale - a BCP-47 tag such as `'ar-EG'` or `'uz-Arab-AF'`
 * @param fallback - returned when the tag is empty or unrecognised
 *
 * @example
 * directionOfLocale('ar-EG') // 'rtl'
 * directionOfLocale('en-US') // 'ltr'
 * directionOfLocale('ku-Latn') // 'ltr'
 */
export function directionOfLocale(locale: string | undefined | null, fallback: Direction = 'ltr'): Direction {
  if (!locale) return fallback
  const tag = locale.trim().toLowerCase().replace(/_/g, '-')
  if (!tag) return fallback

  const parts = tag.split('-')
  const script = parts.find(part => part.length === 4 && /^[a-z]{4}$/.test(part))
  if (script) return RTL_SCRIPTS.has(script) ? 'rtl' : 'ltr'

  if (RTL_LANGUAGES.has(tag)) return 'rtl'
  if (parts.length > 1 && RTL_LANGUAGES.has(`${parts[0]}-${parts[1]}`)) return 'rtl'
  return RTL_LANGUAGES.has(parts[0]!) ? 'rtl' : fallback
}

/** Normalise the `locales` option into an explicit tag -> direction map. */
export function normaliseLocales(locales: string[] | LocaleMap | undefined): LocaleMap {
  if (!locales) return {}
  if (Array.isArray(locales)) {
    return Object.fromEntries(locales.map(tag => [tag, directionOfLocale(tag)]))
  }
  return { ...locales }
}

/**
 * Look a locale up in a map, falling back to its language subtag and then to
 * script-based detection. `ar-EG` matches an `ar` entry.
 */
export function resolveDirection(locale: string, locales: LocaleMap, fallback: Direction = 'ltr'): Direction {
  if (locales[locale]) return locales[locale]!
  const lang = locale.split(/[-_]/)[0]!
  if (locales[lang]) return locales[lang]!
  return directionOfLocale(locale, fallback)
}

/** The opposite direction. */
export function oppositeDirection(dir: Direction): Direction {
  return dir === 'rtl' ? 'ltr' : 'rtl'
}
