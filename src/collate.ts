import { collators, transliterateDigits } from './format'

/** Options for {@link compareText} and {@link sortByLocale}. */
export interface CompareOptions {
  /** A BCP-47 tag or an ordered list of preferred tags. Defaults to `'en'` outside `useFormat()`. */
  locale?: string | string[]
  /** Compare digit runs by value, regardless of digit script. Defaults to `true`. */
  numeric?: boolean
  /** Strip only Arabic tashkeel and tatweel before comparing. Defaults to `true`. */
  ignoreDiacritics?: boolean
  /** Give uppercase or lowercase priority when letters otherwise compare equal. */
  caseFirst?: 'upper' | 'lower' | 'false'
  /** Defaults to `'asc'`. Empty strings stay first and missing keys stay last in either direction. */
  direction?: 'asc' | 'desc'
}

// Remove vowel marks, shadda, sukun, superscript alef and tatweel. Leave
// hamza and madda to the locale (including their decomposed forms).
const ARABIC_DECORATION = /[\u064B-\u0652]|\u0640|\u0670/g

function makeCollator(locales: string[], options: Intl.CollatorOptions): Intl.Collator {
  try {
    return new Intl.Collator([...locales, 'en'], options)
  }
  catch (error) {
    if (!(error instanceof RangeError)) throw error
    // A malformed preference must not mask the next valid locale. Like the
    // formatters, retry a malformed tag with just its language subtag.
    const valid = locales.flatMap((locale) => {
      for (const tag of [locale, locale.split('-')[0]!]) {
        try {
          return Intl.getCanonicalLocales(tag)
        }
        catch {
          continue
        }
      }
      return []
    })
    return new Intl.Collator([...valid, 'en'], options)
  }
}

function missingKey(): undefined {
  try {
    // Keep NODE_ENV available to Node and to the consuming bundler.
    if (process.env.NODE_ENV === 'production') return undefined
  }
  catch {
    // A standalone browser build has no process global.
    return undefined
  }
  throw new TypeError('[vue-rtl-kit] A collation key cannot be null or undefined')
}

// Distinguish a truly empty string from one that became empty during folding.
// `null` represents an empty string; `undefined` represents a missing key.
type SortKey = string | null | undefined

function createComparison(options: CompareOptions) {
  const { locale = 'en', numeric = true, ignoreDiacritics = true, caseFirst = 'false', direction = 'asc' } = options
  const requested = typeof locale === 'string' ? [locale] : locale
  const locales = requested.length ? requested.map(tag => tag.replace(/_/g, '-').toLowerCase()) : ['en']
  // The stripping and sort direction do not change the Intl configuration.
  const cacheKey = JSON.stringify([locales, numeric, caseFirst])
  let collator = collators.get(cacheKey)
  if (!collator) {
    collator = makeCollator(locales, { numeric, sensitivity: 'variant', caseFirst })
    collators.set(cacheKey, collator)
  }
  const compare = collator.compare

  return {
    prepare(text: unknown): SortKey {
      if (text == null) return missingKey()
      let key = String(text)
      if (key === '') return null
      if (ignoreDiacritics) key = key.replace(ARABIC_DECORATION, '')
      return numeric ? transliterateDigits(key, 'latn') : key
    },
    compare(a: SortKey, b: SortKey): number {
      if (a === b) return 0
      if (a === undefined || b === undefined) return a === undefined ? 1 : -1
      if (a === null || b === null) return a === null ? -1 : 1
      return direction === 'desc' ? compare(b, a) : compare(a, b)
    },
  }
}

/** Compare two strings. The sign of the result indicates their order; zero means they tie. */
export function compareText(a: string, b: string, options: CompareOptions = {}): number {
  const { prepare, compare } = createComparison(options)
  return compare(prepare(a), prepare(b))
}

/** Return a stably sorted copy; the key is read once per item and the input is never mutated. */
export function sortByLocale<T>(
  items: readonly T[],
  options: CompareOptions & { key?: (item: T) => string } = {},
): T[] {
  const { key } = options
  const { prepare, compare } = createComparison(options)
  // Decorate before sorting so even a one-item array checks its key. Sort has
  // been stable since ES2019 (our build target), including in descending order.
  return Array.from(items, item => ({ item, key: prepare(key ? key(item) : item) }))
    .sort((a, b) => compare(a.key, b.key))
    .map(({ item }) => item)
}
