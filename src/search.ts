/**
 * Client-side search folding, matching and highlight-range lookup for Arabic,
 * Persian, Hebrew and mixed-script text.
 *
 * Stored names and titles routinely carry hamza variants (`أحمد`, `إبراهيم`,
 * `آدم`, `ٱلرحمن`, `مؤمن`, `بئر`), Arabic harakat (`مُحَمَّدٌ`), tatweel
 * (`عـبـدالله`), Hebrew points (`שָׁלוֹם`), presentation forms (`ﻻ`, `ﻷ`), or
 * Arabic-Indic and Persian digits (`١٢٣`, `۱۲۳`), while users type bare letters
 * and ASCII digits (`احمد`, `محمد`, `عبدالله`, `فاطمه`, `مصطفي`, `שלום`, `123`).
 * Plain `text.includes(query)` returns `false` on every one of those pairs.
 *
 * Scope: deterministic character folding and exact folded substring matching
 * only. These helpers perform **no stemming, root extraction, morphological
 * analysis, or fuzzy / typo-tolerant matching**.
 */

/** Options for {@link foldSearchText}, {@link matchesSearch} and {@link findSearchMatches}. */
export interface SearchOptions {
  /**
   * Fold Arabic ta marbuta (`ة`, U+0629) to heh (`ه`, U+0647).
   * @default true
   */
  taMarbuta?: boolean
  /**
   * Fold Arabic alef maqsura (`ى`, U+0649) to yeh (`ي`, U+064A).
   * `ئ` (U+0626) and Persian `ی` (U+06CC) always fold to `ي` (U+064A).
   * @default true
   */
  alefMaqsura?: boolean
  /**
   * Fold Arabic-Indic (`٠`–`٩`, U+0660–U+0669) and Persian (`۰`–`۹`,
   * U+06F0–U+06F9) digits to ASCII `0`–`9`.
   * @default true
   */
  digits?: boolean
}

/**
 * Half-open `[start, end)` UTF-16 code-unit range inside the original `text`
 * returned by {@link findSearchMatches}.
 */
export interface SearchMatch {
  /** Inclusive start offset in UTF-16 code units of the original `text`. */
  start: number
  /**
   * Exclusive end offset in UTF-16 code units of the original `text`, extended
   * over trailing marks so a highlight never splits a letter from its harakat.
   */
  end: number
}

interface ResolvedSearchOptions {
  taMarbuta: boolean
  alefMaqsura: boolean
  digits: boolean
}

interface FoldSpans {
  starts: number[]
  ends: number[]
}

/**
 * Starter code point plus all immediately following combining marks, or a
 * leading run of orphan combining marks. Walking these clusters in one shared
 * folding pass keeps `foldSearchText`, `matchesSearch`, and `findSearchMatches`
 * on the exact same search key while preserving UTF-16 spans (including
 * trailing marks) in the original string.
 */
const CLUSTER_UNITS = /\P{M}\p{M}*|\p{M}+/gu

const WHITESPACE_CHAR = /^\s$/u

/**
 * True for code points removed during search folding:
 * - Hebrew cantillation and points: U+0591–U+05C7
 * - Arabic tatweel: U+0640
 * - Arabic harakat and Quranic annotation marks: U+064B–U+065F, U+0670, U+06D6–U+06ED
 * - Unicode bidi controls: U+061C, U+200E, U+200F, U+202A–U+202E, U+2066–U+2069
 */
function isStripped(cp: number): boolean {
  return (
    (cp >= 0x0591 && cp <= 0x05C7)
    || cp === 0x061C
    || cp === 0x0640
    || (cp >= 0x064B && cp <= 0x065F)
    || cp === 0x0670
    || (cp >= 0x06D6 && cp <= 0x06ED)
    || cp === 0x200E
    || cp === 0x200F
    || (cp >= 0x202A && cp <= 0x202E)
    || (cp >= 0x2066 && cp <= 0x2069)
  )
}

function resolveOptions(options: SearchOptions | undefined): ResolvedSearchOptions {
  if (options === null || typeof options !== 'object') {
    return { taMarbuta: true, alefMaqsura: true, digits: true }
  }
  return {
    taMarbuta: Boolean(options.taMarbuta ?? true),
    alefMaqsura: Boolean(options.alefMaqsura ?? true),
    digits: Boolean(options.digits ?? true),
  }
}

function mapChar(
  ch: string,
  cp: number,
  taMarbuta: boolean,
  alefMaqsura: boolean,
  digits: boolean,
): string {
  if (cp === 0x0622 || cp === 0x0623 || cp === 0x0625 || cp === 0x0671) return '\u0627'
  if (cp === 0x0624) return '\u0648'
  if (cp === 0x0626 || cp === 0x06CC) return '\u064A'
  if (cp === 0x0649) return alefMaqsura ? '\u064A' : '\u0649'
  if (cp === 0x06A9) return '\u0643'
  if (cp === 0x0629) return taMarbuta ? '\u0647' : '\u0629'
  if (digits) {
    if (cp >= 0x0660 && cp <= 0x0669) return String.fromCharCode(0x30 + (cp - 0x0660))
    if (cp >= 0x06F0 && cp <= 0x06F9) return String.fromCharCode(0x30 + (cp - 0x06F0))
  }
  return ch.toLowerCase()
}

function foldPlain(
  text: string,
  opts: ResolvedSearchOptions,
  spans?: FoldSpans,
): string {
  if (!text) return ''
  let folded = ''
  let inWhitespace = false

  for (const match of text.matchAll(CLUSTER_UNITS)) {
    const cluster = match[0]
    const origStart = match.index!
    const origEnd = origStart + cluster.length
    const normalised = cluster.normalize('NFKC')

    for (const ch of normalised) {
      const cp = ch.codePointAt(0)!
      if (isStripped(cp)) continue
      const mapped = mapChar(ch, cp, opts.taMarbuta, opts.alefMaqsura, opts.digits)
      if (WHITESPACE_CHAR.test(mapped)) {
        if (inWhitespace) {
          if (spans) spans.ends[spans.ends.length - 1] = origEnd
        }
        else {
          folded += ' '
          if (spans) {
            spans.starts.push(origStart)
            spans.ends.push(origEnd)
          }
          inWhitespace = true
        }
      }
      else {
        inWhitespace = false
        for (let k = 0; k < mapped.length; k++) {
          folded += mapped[k]!
          if (spans) {
            spans.starts.push(origStart)
            spans.ends.push(origEnd)
          }
        }
      }
    }
  }

  return folded
}

/**
 * Fold text into a normalised search key for client-side filtering and indexing.
 *
 * Applies Unicode `NFKC` (unfolding Arabic and Hebrew presentation forms such
 * as lam-alef ligatures), strips Arabic harakat (`U+064B`–`U+065F`, `U+0670`,
 * `U+06D6`–`U+06ED`), tatweel (`U+0640`), Hebrew points (`U+0591`–`U+05C7`) and
 * Unicode bidi controls, maps orthography variants (`آ`/`أ`/`إ`/`ٱ` → `ا`,
 * `ؤ` → `و`, `ئ`/`ی` → `ي`, `ک` → `ك`, plus optional `ة` → `ه`, `ى` → `ي`, and
 * Arabic-Indic / Persian digits → ASCII), lowercases Latin characters, and
 * collapses runs of whitespace to a single space `' '`.
 *
 * Performs **no stemming or fuzzy matching**. Returns `''` for `null`,
 * `undefined`, empty, or non-string input, and never throws.
 *
 * @example
 * foldSearchText('أَحْمَد عـبـدالله ١٢٣') // 'احمد عبدالله 123'
 * foldSearchText('שָׁלוֹם') // 'שלום'
 */
export function foldSearchText(
  text: string | null | undefined,
  options?: SearchOptions,
): string {
  try {
    if (typeof text !== 'string' || !text) return ''
    return foldPlain(text, resolveOptions(options))
  }
  catch {
    return ''
  }
}

/**
 * Test whether `text` contains `query` after folding both with {@link foldSearchText}.
 *
 * An empty or marks-only `query` matches any string `text` (`true`). Passing
 * `null`, `undefined`, or a non-string `text` (or `query`) returns `false`.
 * Performs **no stemming or fuzzy matching**, and never throws.
 *
 * @example
 * matchesSearch('مُحَمَّد أحمد', 'محمد احمد') // true
 * matchesSearch('فاطمة', 'فاطمه', { taMarbuta: false }) // false
 */
export function matchesSearch(
  text: string | null | undefined,
  query: string | null | undefined,
  options?: SearchOptions,
): boolean {
  try {
    if (typeof text !== 'string' || typeof query !== 'string') return false
    const opts = resolveOptions(options)
    const foldedQuery = foldPlain(query, opts)
    if (!foldedQuery) return true
    return foldPlain(text, opts).includes(foldedQuery)
  }
  catch {
    return false
  }
}

/**
 * Find every non-overlapping occurrence of `query` inside `text` under
 * {@link foldSearchText} rules, returning sorted `{ start, end }` offsets in
 * UTF-16 code units of the **original** `text`.
 *
 * Each `end` offset is extended over any trailing combining marks on the final
 * matched letter so wrapping `text.slice(start, end)` in `<mark>` never splits
 * a base character from its harakat or niqqud. Surrogate pairs (such as emoji)
 * and presentation-form ligatures (such as `ﻻ` and `ﻷ`) preserve exact UTF-16
 * offsets.
 *
 * Returns `[]` for an empty or marks-only `query`, when `text` is `null` or
 * `undefined`, or when nothing matches. Performs **no stemming or fuzzy
 * matching**, and never throws.
 *
 * @example
 * findSearchMatches('مرحبا مُحَمَّدٌ!', 'محمد')
 * // => [{ start: 6, end: 15 }]  ('مُحَمَّدٌ')
 */
export function findSearchMatches(
  text: string | null | undefined,
  query: string | null | undefined,
  options?: SearchOptions,
): SearchMatch[] {
  try {
    if (typeof text !== 'string' || typeof query !== 'string' || !text) return []
    const opts = resolveOptions(options)
    const foldedQuery = foldPlain(query, opts)
    if (!foldedQuery) return []

    const starts: number[] = []
    const ends: number[] = []
    const folded = foldPlain(text, opts, { starts, ends })

    if (folded.length < foldedQuery.length) return []

    const results: SearchMatch[] = []
    const qLen = foldedQuery.length
    let pos = 0
    while (pos <= folded.length - qLen) {
      const idx = folded.indexOf(foldedQuery, pos)
      if (idx === -1) break
      const start = starts[idx]!
      const end = ends[idx + qLen - 1]!
      results.push({ start, end })
      pos = idx + qLen
      while (pos < folded.length && starts[pos]! < end) {
        pos++
      }
    }
    return results
  }
  catch {
    return []
  }
}
