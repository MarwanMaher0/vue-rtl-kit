/**
 * Grapheme-aware text truncation.
 *
 * The bug this file exists for: `name.slice(0, max) + '…'` counts UTF-16 code
 * units, so it cuts a base letter away from its tashkeel (`مُحَمَّدٌ`), splits
 * an emoji ZWJ sequence or a regional-indicator flag into garbage, and drops
 * the ellipsis at the *visual* right end of an RTL string embedded in an LTR
 * card - far away from the logical end where the text was actually cut.
 *
 * The fix: count and cut by extended grapheme clusters with `Intl.Segmenter`,
 * trim trailing whitespace and tatweel before appending the ellipsis, and
 * optionally wrap the result in `FSI ... PDI` (see {@link isolate}) so the
 * ellipsis stays at the logical end of the run in either paragraph direction.
 *
 * Fallback: when `Intl.Segmenter` is unavailable (older browsers, some
 * minimal SSR runtimes) the helper counts and cuts by Unicode code points
 * via `Array.from`, which never splits a surrogate pair but *can* separate
 * a base letter from its combining marks or break a ZWJ sequence; word mode
 * cuts at the last whitespace boundary that fits and falls back to the same
 * code-point cut for over-long words. This is the documented trade-off.
 */
import { isolate as isolateText } from './bidi'

/** Options for {@link truncateText}. */
export interface TruncateOptions {
  /**
   * String appended when the text is cut. Counts inside `maxLength`
   * (measured in grapheme clusters). Defaults to `'\u2026'` (`…`).
   */
  ellipsis?: string
  /**
   * `'grapheme'` (default) cuts at the last grapheme cluster that fits.
   * `'word'` cuts at the last word boundary that fits and falls back to a
   * grapheme cut when even the first word is longer than the limit.
   */
  unit?: 'grapheme' | 'word'
  /**
   * BCP 47 locale passed to `Intl.Segmenter` (word boundaries are
   * locale-sensitive). An invalid tag falls back to the runtime default
   * locale instead of throwing.
   */
  locale?: string
  /**
   * Wrap the result in `FSI ... PDI` (`U+2068` / `U+2069`) so the ellipsis
   * renders at the logical end of RTL text inside an LTR paragraph and the
   * reverse. Applied on every return path for valid input - text that fits,
   * truncated text, and the ellipsis-only result - and to the ellipsis
   * returned for an invalid `maxLength` in production. The two isolate
   * controls are formatting characters and do not count towards `maxLength`.
   * Defaults to `false`.
   */
  isolate?: boolean
}

/** U+2026 HORIZONTAL ELLIPSIS, the default marker. */
const DEFAULT_ELLIPSIS = '\u2026'

/** Trailing whitespace and tatweel (U+0640) trimmed before the ellipsis. */
const TRAILING_TRIM = /[\s\u0640]+$/u

type GraphemeSplit = (text: string) => string[]

/**
 * Construct an `Intl.Segmenter`, or return `null` when the runtime has none.
 * An invalid locale tag (e.g. `'!!'`) makes the constructor throw `RangeError`;
 * retry with the runtime default locale so a bad tag never throws.
 */
function createSegmenter(locale: string | undefined, granularity: 'grapheme' | 'word'): Intl.Segmenter | null {
  if (typeof Intl === 'undefined' || typeof Intl.Segmenter !== 'function') return null
  try {
    return new Intl.Segmenter(locale, { granularity })
  }
  catch {
    return new Intl.Segmenter(undefined, { granularity })
  }
}

/**
 * Build a grapheme-cluster splitter. With `Intl.Segmenter` this yields
 * extended grapheme clusters (base + marks, ZWJ sequences, flags); without
 * it, code points via `Array.from`, which keeps surrogate pairs intact.
 */
function graphemeSplitter(locale?: string): GraphemeSplit {
  const segmenter = createSegmenter(locale, 'grapheme')
  if (segmenter) {
    return text => Array.from(segmenter.segment(text), part => part.segment)
  }
  return text => Array.from(text)
}

/**
 * Cut at the last word boundary whose cumulative grapheme count fits inside
 * `budget`, or return `null` when even the first word is too long (the caller
 * then falls back to a grapheme cut).
 */
function cutAtWord(text: string, budget: number, segmenter: Intl.Segmenter, split: GraphemeSplit): string | null {
  let count = 0
  let end = 0
  for (const part of segmenter.segment(text)) {
    const length = split(part.segment).length
    if (count + length > budget) break
    count += length
    if (part.isWordLike) end = part.index + part.segment.length
  }
  return end > 0 ? text.slice(0, end) : null
}

/**
 * Word-mode fallback without `Intl.Segmenter`: cut at the last whitespace
 * boundary whose cumulative code-point count fits inside `budget` (the
 * longest whole-word prefix), or return `null` when even the first word is
 * too long. Boundaries sit at whitespace edges, so surrogate pairs stay intact.
 */
function cutAtWhitespaceWord(text: string, budget: number): string | null {
  let count = 0
  let end = 0
  for (const match of text.matchAll(/\S+|\s+/g)) {
    const segment = match[0]!
    const length = Array.from(segment).length
    if (count + length > budget) break
    count += length
    if (/\S/.test(segment)) end = match.index! + segment.length
  }
  return end > 0 ? text.slice(0, end) : null
}

/**
 * Development throws a `TypeError` for an invalid `maxLength`; production
 * (and browser builds with no `process` global) returns the ellipsis instead,
 * so a bad limit degrades to a marker rather than crashing a render.
 */
function invalidMaxLength(maxLength: number, ellipsis: string): string {
  try {
    // Keep NODE_ENV available to Node and to the consuming bundler.
    if (process.env.NODE_ENV === 'production') return ellipsis
  }
  catch {
    // The standalone browser build has no process global.
    return ellipsis
  }
  throw new TypeError(`[vue-rtl-kit] truncateText maxLength must be an integer >= 1, got: ${JSON.stringify(maxLength)}`)
}

/**
 * Shorten `text` to at most `maxLength` grapheme clusters, ellipsis included,
 * without ever splitting a base letter from its marks, an emoji ZWJ sequence
 * or a flag.
 *
 * - Text that fits (`<= maxLength` clusters) is returned unchanged.
 * - Trailing whitespace and tatweel (`U+0640`) are trimmed before the ellipsis.
 * - The ellipsis counts inside `maxLength`; when the ellipsis alone fills the
 *   limit, the ellipsis is returned by itself.
 * - `unit: 'word'` cuts at the last word boundary that fits, falling back to
 *   a grapheme cut when one word is longer than the limit.
 * - `isolate: true` wraps the result in `FSI ... PDI` on every return path for
 *   valid input - fitting text, truncated text, and the ellipsis-only result -
 *   and the ellipsis returned for an invalid `maxLength` in production, so the
 *   ellipsis stays at the logical end of RTL text inside LTR text and the reverse.
 * - An invalid `locale` tag falls back to the runtime default locale.
 * - Without `Intl.Segmenter` the count and cut fall back to code points
 *   (surrogate pairs stay intact; marks and ZWJ sequences may split); word
 *   mode cuts at the last whitespace boundary that fits, with a code-point
 *   fallback for over-long words.
 * - `maxLength` below 1 or not an integer throws `TypeError` in development
 *   and returns the ellipsis string in production.
 *
 * @example
 * truncateText('مُحَمَّدٌ عَبْدُ اللَّهِ', 8) // never orphans a shadda
 * truncateText('الإصدار v1.2.3 متاح الآن', 12, { unit: 'word', isolate: true })
 */
export function truncateText(text: string, maxLength: number, options: TruncateOptions = {}): string {
  const {
    ellipsis = DEFAULT_ELLIPSIS,
    unit = 'grapheme',
    locale,
    isolate: shouldIsolate = false,
  } = options

  const wrap = (value: string): string => (shouldIsolate ? isolateText(value) : value)

  if (!Number.isInteger(maxLength) || maxLength < 1) {
    return wrap(invalidMaxLength(maxLength, ellipsis))
  }
  if (!text) return ''

  const split = graphemeSplitter(locale)
  const clusters = split(text)
  if (clusters.length <= maxLength) return wrap(text)

  const budget = maxLength - split(ellipsis).length
  if (budget < 1) return wrap(ellipsis)

  let cut: string | null = null
  if (unit === 'word') {
    const wordSegmenter = createSegmenter(locale, 'word')
    cut = wordSegmenter
      ? cutAtWord(text, budget, wordSegmenter, split)
      : cutAtWhitespaceWord(text, budget)
  }
  if (cut === null) cut = clusters.slice(0, budget).join('')

  return wrap(cut.replace(TRAILING_TRIM, '') + ellipsis)
}