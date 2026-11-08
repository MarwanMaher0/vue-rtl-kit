/**
 * Locale -> direction resolution.
 */
import type { Direction, LocaleMap } from './types'

/**
 * Language subtags whose default writing system is right-to-left, by ISO 639-1/639-3 code.
 *
 * Kept as data rather than an `Intl` call because `Intl.Locale#getTextInfo`
 * is still missing from Firefox and older Safari, and a small set is
 * cheaper than a polyfill.
 */
export const RTL_LANGUAGES: ReadonlySet<string> = new Set([
  'ar', // Arabic
  'arc', // Aramaic
  'bal',
  'ckb', // Central Kurdish (Sorani)
  'dv', // Divehi
  'fa', // Persian
  'glk',
  'he', // Hebrew
  'iw', // Hebrew (legacy code)
  'khw', // Khowar
  'ks', // Kashmiri
  'lrc',
  'mzn',
  'nqo', // N'Ko
  'pnb',
  'ps', // Pashto
  'sd', // Sindhi
  'sdh',
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
 * The script subtag wins when present, so `az-Arab` is RTL while `az` is not.
 * Extension and private-use subtags never override the script or language.
 *
 * @param locale - a BCP-47 tag such as `'ar-EG'` or `'uz-Arab-AF'`
 * @param fallback - returned only when the tag is empty or invalid
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

  if (/^(?:x(?:-[a-z\d]{1,8})+|en-gb-oed|i-(?:ami|bnn|default|enochian|hak|klingon|lux|mingo|navajo|pwn|tao|tay|tsu)|sgn-(?:be-(?:fr|nl)|ch-de))$/.test(tag)) return 'ltr'

  const match = /^(?:([a-z]{2,3})(?:-[a-z]{3}){0,3}|([a-z]{4,8}))(?:-([a-z]{4}))?(?:-([a-z]{2}|\d{3}))?(?:-(?:[a-z\d]{5,8}|\d[a-z\d]{3}))*(?:-[\da-wy-z](?:-[a-z\d]{2,8})+)*(?:-x(?:-[a-z\d]{1,8})+)?$/.exec(tag)
  if (!match) return fallback

  const parts = tag.split('-')
  const singletons = new Set<string>()
  const variants = new Set<string>()
  for (const part of parts.slice(1)) {
    if (part === 'x') break
    if (part.length === 1) {
      if (singletons.has(part)) return fallback
      singletons.add(part)
    }
    else if (singletons.size === 0 && /^(?:[a-z\d]{5,8}|\d[a-z\d]{3})$/.test(part)) {
      if (variants.has(part)) return fallback
      variants.add(part)
    }
  }

  const language = match[1] ?? match[2]!
  const script = match[3]
  const region = match[4]
  if (script) return RTL_SCRIPTS.has(script) ? 'rtl' : 'ltr'
  if (region && RTL_LANGUAGES.has(`${language}-${region}`)) return 'rtl'
  return RTL_LANGUAGES.has(language) ? 'rtl' : 'ltr'
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
