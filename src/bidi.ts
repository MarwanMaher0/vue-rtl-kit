/**
 * Bidirectional text utilities.
 *
 * The bug this file exists for: a Latin run inside Arabic (or Hebrew) text is
 * laid out by the Unicode Bidirectional Algorithm relative to the *paragraph*
 * direction. Any neutral character at the edge of that run - a hyphen, a dot,
 * a slash, a space - is resolved against the paragraph direction too, so
 * `12-05-2024` inside an RTL paragraph is displayed as `2024-05-12`, and
 * `v1.2.3` becomes `3.2.1`. Nothing is wrong with the data; only the *display*
 * order is wrong, which is why it survives code review and ships.
 *
 * The fix is an isolate: `U+2066 LRI` ... `U+2069 PDI` (or its DOM equivalent,
 * `<bdi>`) tells the algorithm to resolve the run on its own and treat the
 * whole thing as a single neutral character in the outer paragraph.
 */
import type { Direction, DirectionOrAuto } from './types'

/** U+2066 LEFT-TO-RIGHT ISOLATE */
export const LRI = '⁦'
/** U+2067 RIGHT-TO-LEFT ISOLATE */
export const RLI = '⁧'
/** U+2068 FIRST STRONG ISOLATE */
export const FSI = '⁨'
/** U+2069 POP DIRECTIONAL ISOLATE */
export const PDI = '⁩'
/** U+200E LEFT-TO-RIGHT MARK */
export const LRM = '‎'
/** U+200F RIGHT-TO-LEFT MARK */
export const RLM = '‏'

/** Every Unicode bidi control character, for stripping. */
const BIDI_CONTROLS = /[‎‏؜‪-‮⁦-⁩]/g

/* Strong right-to-left scripts. Arabic-Indic digits live inside Script=Arabic
 * but are weak (AN), so digits are tested first in `classifyChar`. */
const RTL_STRONG
  = /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}\p{Script=Samaritan}\p{Script=Mandaic}\p{Script=Adlam}\p{Script=Hanifi_Rohingya}]/u

/** European numbers (EN): ASCII digits and the extended Arabic-Indic set. */
const EN_DIGIT = /[0-9۰-۹０-９]/u

/** Arabic numbers (AN): Arabic-Indic digits and the Arabic number signs. */
const AN_DIGIT = /[؀-؅٠-٩٫٬۝]/u

/** Any letter counts as strong; `RTL_STRONG` already claimed the RTL ones. */
const LETTER = /[\p{L}\p{Nl}]/u

type CharClass = 'L' | 'R' | 'EN' | 'AN' | 'N'

/** Classify a single character into its (simplified) bidi class. */
export function classifyChar(char: string): CharClass {
  if (EN_DIGIT.test(char)) return 'EN'
  if (AN_DIGIT.test(char)) return 'AN'
  if (RTL_STRONG.test(char)) return 'R'
  if (LETTER.test(char)) return 'L'
  return 'N'
}

/**
 * Detect the direction of a string using the Unicode "first strong character"
 * heuristic - the same rule the browser applies for `dir="auto"`.
 *
 * @param text - text to inspect
 * @param fallback - direction to return when the text has no strong character
 */
export function detectDirection(text: string, fallback: Direction = 'ltr'): Direction {
  for (const char of stripBidiControls(text)) {
    const cls = classifyChar(char)
    if (cls === 'R') return 'rtl'
    if (cls === 'L') return 'ltr'
  }
  return fallback
}

/** `true` when the string contains at least one strong RTL character. */
export function hasRtlCharacters(text: string): boolean {
  return RTL_STRONG.test(text)
}

/** `true` when the string mixes strong LTR and strong RTL characters. */
export function isMixedDirection(text: string): boolean {
  let sawL = false
  let sawR = false
  for (const char of text) {
    const cls = classifyChar(char)
    if (cls === 'L') sawL = true
    else if (cls === 'R') sawR = true
    if (sawL && sawR) return true
  }
  return false
}

/** Remove every Unicode bidi control character from a string. */
export function stripBidiControls(text: string): string {
  return text.replace(BIDI_CONTROLS, '')
}

/** One directional run produced by {@link splitBidiRuns}. */
export interface BidiRun {
  /** The run's text. Concatenating every run reproduces the input exactly. */
  text: string
  /** Resolved direction of the run. */
  dir: Direction
  /**
   * `true` when the run runs against the base direction *and* would be
   * visually reordered without help - the runs you must wrap.
   */
  isolated: boolean
  /** `true` when the run contains a strong letter (as opposed to digits only). */
  hasStrong: boolean
}

interface Segment {
  text: string
  dir: 'L' | 'R' | null
  hasStrong: boolean
  hasNeutral: boolean
}

/**
 * Split text into directional runs against a base direction, marking the ones
 * that need isolating.
 *
 * Neutral characters *between two runs of the same direction* are absorbed into
 * that run (so `John Smith` is one isolate, not two). Neutrals on a boundary
 * between opposite directions stay in the base direction, so trailing commas
 * and full stops are never dragged inside an isolate.
 *
 * A run of digits with no internal punctuation is left alone: a bare `2024`
 * renders identically in either direction. `12-05-2024` is not - it has an
 * internal neutral, so it gets isolated.
 *
 * @param text - the text to split
 * @param baseDir - direction of the surrounding paragraph
 */
export function splitBidiRuns(text: string, baseDir: Direction = 'ltr'): BidiRun[] {
  if (!text) return []

  const segments: Segment[] = []
  let current: Segment | null = null
  let pendingNeutral = ''

  const flush = (): void => {
    if (current) segments.push(current)
    current = null
  }

  for (const char of text) {
    const cls = classifyChar(char)
    if (cls === 'N') {
      pendingNeutral += char
      continue
    }
    // EN digits run left-to-right even inside an RTL paragraph; AN digits
    // travel with the RTL text around them.
    const dir: 'L' | 'R' = cls === 'L' || cls === 'EN' ? 'L' : 'R'
    const strong = cls === 'L' || cls === 'R'

    if (current && current.dir === dir) {
      if (pendingNeutral) {
        current.text += pendingNeutral
        current.hasNeutral = true
        pendingNeutral = ''
      }
      current.text += char
      current.hasStrong ||= strong
    }
    else {
      flush()
      if (pendingNeutral) {
        segments.push({ text: pendingNeutral, dir: null, hasStrong: false, hasNeutral: true })
        pendingNeutral = ''
      }
      current = { text: char, dir, hasStrong: strong, hasNeutral: false }
    }
  }

  flush()
  if (pendingNeutral) {
    segments.push({ text: pendingNeutral, dir: null, hasStrong: false, hasNeutral: true })
  }

  return segments.map((segment) => {
    const dir: Direction = segment.dir === null ? baseDir : segment.dir === 'R' ? 'rtl' : 'ltr'
    const opposite = segment.dir !== null && dir !== baseDir
    return {
      text: segment.text,
      dir,
      hasStrong: segment.hasStrong,
      isolated: opposite && (segment.hasStrong || segment.hasNeutral),
    }
  })
}

/**
 * Wrap a whole string in a single Unicode isolate.
 *
 * Use this when you are dropping untrusted or opposite-direction text into a
 * sentence you control - a username, a filename, a branch name - and you only
 * need it to stop leaking its direction outwards.
 *
 * @param text - text to isolate
 * @param dir - `'auto'` (default) emits FSI and lets the consumer detect
 * @returns the text surrounded by an isolate pair, or `''` for empty input
 *
 * @example
 * `${t('greeting')} ${isolate(user.name)}!`
 */
export function isolate(text: string, dir: DirectionOrAuto = 'auto'): string {
  if (!text) return ''
  const open = dir === 'ltr' ? LRI : dir === 'rtl' ? RLI : FSI
  return `${open}${text}${PDI}`
}

/**
 * Isolate only the runs inside `text` that would otherwise be reordered.
 *
 * This is the string form of `<BidiText>`; reach for it when the text is going
 * somewhere that cannot hold elements - a `title` attribute, an `aria-label`,
 * a `<canvas>` call, a toast payload, a copied string.
 *
 * @param text - the mixed-direction text
 * @param baseDir - direction of the surrounding paragraph
 *
 * @example
 * isolateRuns('تم التحديث في 12-05-2024', 'rtl')
 * // => 'تم التحديث في ⁦12-05-2024⁩'
 */
export function isolateRuns(text: string, baseDir: Direction = 'ltr'): string {
  return splitBidiRuns(stripBidiControls(text), baseDir)
    .map(run => (run.isolated ? isolate(run.text, run.dir) : run.text))
    .join('')
}
