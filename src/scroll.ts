/**
 * Logical inline scroll helpers for LTR and RTL containers.
 *
 * Under the CSSOM View specification implemented by modern browsers (Chrome 85+,
 * Firefox 64+, Safari 15.4+), an RTL scroller starts at `scrollLeft === 0` on
 * the inline-start (right) edge and scrolls into negative values toward the
 * inline-end (left) edge. Code that assumes `scrollLeft >= 0`, tests
 * `scrollLeft === 0` or `scrollLeft + clientWidth >= scrollWidth`, or calls
 * `scrollTo({ left: +offset })` breaks on Arabic, Persian and Hebrew pages.
 *
 * These helpers normalise inline scroll coordinates to a single direction-agnostic
 * scale: `0` at the inline-start edge, increasing positively up to `max` at the
 * inline-end edge in both LTR and RTL. Direction is read from
 * `getComputedStyle(el).direction`, so nested `dir` islands, `v-rtl`, and
 * `<RtlProvider>` scopes all resolve automatically.
 *
 * **Writing mode scope:** horizontal writing modes (`writing-mode: horizontal-tb`)
 * only. Vertical writing modes (`vertical-rl`, `vertical-lr`) scroll their inline
 * axis through `scrollTop` rather than `scrollLeft` and are not handled here.
 */

/** Options passed to {@link scrollToInline} and {@link scrollByInline}. */
export interface ScrollInlineOptions {
  /** Native scroll behaviour (`'auto'`, `'instant'`, or `'smooth'`). */
  behavior?: ScrollBehavior
}

/** Edge state returned by {@link scrollInlineEdges}. */
export interface ScrollInlineEdges {
  /** `true` when at (or within `tolerance` px of) the inline-start edge. */
  atStart: boolean
  /** `true` when at (or within `tolerance` px of) the inline-end edge. */
  atEnd: boolean
}

function hasDom(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function isRtlElement(el: Element): boolean {
  if (!hasDom()) return false
  try {
    const view = el.ownerDocument?.defaultView ?? window
    if (typeof view?.getComputedStyle !== 'function') return false
    return view.getComputedStyle(el).direction === 'rtl'
  }
  catch {
    return false
  }
}

function clampInline(value: number, max: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0
  if (value >= max) return max
  return value
}

/**
 * Maximum scrollable inline distance in pixels (`max(0, scrollWidth - clientWidth)`).
 *
 * Returns `0` when there is no horizontal overflow, when `el` is `null` or
 * `undefined`, on the server, or when layout dimensions are non-finite.
 * Horizontal writing modes (`horizontal-tb`) only.
 */
export function getScrollInlineMax(el: Element | null | undefined): number {
  if (!el || !hasDom()) return 0
  const scrollWidth = el.scrollWidth
  const clientWidth = el.clientWidth
  if (!Number.isFinite(scrollWidth) || !Number.isFinite(clientWidth)) return 0
  return Math.max(0, scrollWidth - clientWidth)
}

/**
 * Distance scrolled from the inline-start edge in pixels, clamped to `0..max`.
 *
 * Returns the same `0..max` value in LTR and RTL: `0` at the inline-start edge
 * (left in LTR, right in RTL) and `max` at the inline-end edge. Direction is
 * read from `getComputedStyle(el).direction`. Returns `0` when there is no
 * overflow, when `el` is `null` or `undefined`, on the server, or when
 * `scrollLeft` is non-finite. Horizontal writing modes (`horizontal-tb`) only.
 */
export function getScrollInline(el: Element | null | undefined): number {
  if (!el || !hasDom()) return 0
  const max = getScrollInlineMax(el)
  if (max === 0) return 0
  const raw = el.scrollLeft
  if (!Number.isFinite(raw)) return 0
  const offset = isRtlElement(el) ? -raw : raw
  return clampInline(offset, max)
}

/**
 * Scroll `el` to an inline-start `offset` in pixels, clamped to `0..max`.
 *
 * Converts the logical offset to the physical `left` coordinate (`-clamped` in
 * RTL, `+clamped` in LTR) and calls `el.scrollTo({ left, behavior })`.
 * No-op when `el` is `null` or `undefined`, on the server, or when `offset` is
 * `NaN` or `±Infinity`. Horizontal writing modes (`horizontal-tb`) only.
 */
export function scrollToInline(
  el: Element | null | undefined,
  offset: number,
  options?: ScrollInlineOptions,
): void {
  if (!el || !hasDom() || !Number.isFinite(offset)) return
  const max = getScrollInlineMax(el)
  const clamped = clampInline(offset, max)
  const left = clamped === 0 ? 0 : (isRtlElement(el) ? -clamped : clamped)
  const scrollOptions: ScrollToOptions = options?.behavior !== undefined
    ? { left, behavior: options.behavior }
    : { left }
  try {
    if (typeof el.scrollTo === 'function') {
      el.scrollTo(scrollOptions)
    }
    else {
      el.scrollLeft = left
    }
  }
  catch {
    // Never throw on non-standard or detached targets.
  }
}

/**
 * Scroll `el` by a signed inline `delta` in pixels.
 *
 * Positive values move toward the inline-end edge (right in LTR, left in RTL);
 * negative values move back toward the inline-start edge. The resulting offset
 * is clamped to `0..max`. No-op when `el` is `null` or `undefined`, on the
 * server, or when `delta` is `NaN` or `±Infinity`. Horizontal writing modes
 * (`horizontal-tb`) only.
 */
export function scrollByInline(
  el: Element | null | undefined,
  delta: number,
  options?: ScrollInlineOptions,
): void {
  if (!el || !hasDom() || !Number.isFinite(delta)) return
  scrollToInline(el, getScrollInline(el) + delta, options)
}

/**
 * Report whether `el` is at its inline-start and/or inline-end edge within
 * `tolerance` pixels (default `1` to absorb subpixel rounding).
 *
 * Returns `{ atStart: true, atEnd: true }` when there is no overflow, when `el`
 * is `null` or `undefined`, or on the server. Non-finite or negative `tolerance`
 * values are treated as `0`. Horizontal writing modes (`horizontal-tb`) only.
 */
export function scrollInlineEdges(
  el: Element | null | undefined,
  tolerance = 1,
): ScrollInlineEdges {
  const max = getScrollInlineMax(el)
  if (max === 0) return { atStart: true, atEnd: true }
  const offset = getScrollInline(el)
  const tol = Number.isFinite(tolerance) ? Math.max(0, tolerance) : 0
  return {
    atStart: offset <= tol,
    atEnd: offset >= max - tol,
  }
}
