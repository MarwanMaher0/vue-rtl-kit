import type { MaybeRefOrGetter, Ref } from 'vue'
import { readonly, ref, toValue, watch } from 'vue'
import { isClient } from '../env'
import type { ScrollInlineOptions } from '../scroll'
import {
  getScrollInline,
  getScrollInlineMax,
  scrollByInline,
  scrollToInline,
} from '../scroll'
import { useDirection } from './useDirection'

/** Options for {@link useInlineScroll}. */
export interface UseInlineScrollOptions {
  /** Edge tolerance in pixels used for `atStart` and `atEnd`. Default `1`. */
  tolerance?: number
}

/** Return value of {@link useInlineScroll}. */
export interface UseInlineScrollReturn {
  /** Distance scrolled from the inline-start edge in pixels (clamped `0..max`). */
  readonly offset: Readonly<Ref<number>>
  /** Maximum scrollable inline distance in pixels (`max(0, scrollWidth - clientWidth)`). */
  readonly max: Readonly<Ref<number>>
  /** `true` when at (or within `tolerance` px of) the inline-start edge. */
  readonly atStart: Readonly<Ref<boolean>>
  /** `true` when at (or within `tolerance` px of) the inline-end edge. */
  readonly atEnd: Readonly<Ref<boolean>>
  /** Scroll to an inline-start offset in pixels (clamped `0..max`). */
  scrollTo: (offset: number, options?: ScrollInlineOptions) => void
  /** Scroll by a signed inline delta in pixels (positive moves toward inline-end). */
  scrollBy: (delta: number, options?: ScrollInlineOptions) => void
  /** Scroll to the inline-start edge (`0`). */
  scrollToStart: (options?: ScrollInlineOptions) => void
  /** Scroll to the inline-end edge (`max`). */
  scrollToEnd: (options?: ScrollInlineOptions) => void
}

/**
 * Track and control a horizontal scroller in logical inline coordinates.
 *
 * Exposes readonly `offset`, `max`, `atStart` and `atEnd` refs plus logical
 * scroll actions (`scrollTo`, `scrollBy`, `scrollToStart`, `scrollToEnd`).
 * Attaches a passive `scroll` listener and a `ResizeObserver` on the target
 * element, re-reads when `target` or `useDirection().dir` changes, and removes
 * listeners automatically when the target changes or the enclosing scope is
 * disposed.
 *
 * Safe during SSR: on the server it attaches no listeners and returns
 * `offset = 0`, `max = 0`, `atStart = true`, `atEnd = true`. Horizontal writing
 * modes (`writing-mode: horizontal-tb`) only.
 *
 * @example
 * const track = ref<HTMLElement | null>(null)
 * const { atStart, atEnd, scrollBy } = useInlineScroll(track)
 * // <button :disabled="atStart" @click="scrollBy(-240, { behavior: 'smooth' })">Prev</button>
 * // <button :disabled="atEnd" @click="scrollBy(240, { behavior: 'smooth' })">Next</button>
 */
export function useInlineScroll(
  target: MaybeRefOrGetter<Element | null | undefined>,
  options: UseInlineScrollOptions = {},
): UseInlineScrollReturn {
  const tolerance = options.tolerance ?? 1
  const tol = Number.isFinite(tolerance) ? Math.max(0, tolerance) : 0
  const { dir } = useDirection()

  const offset = ref(0)
  const max = ref(0)
  const atStart = ref(true)
  const atEnd = ref(true)

  const sync = (): void => {
    const el = toValue(target)
    const nextMax = getScrollInlineMax(el)
    const nextOffset = getScrollInline(el)
    max.value = nextMax
    offset.value = nextOffset
    atStart.value = nextMax === 0 || nextOffset <= tol
    atEnd.value = nextMax === 0 || nextOffset >= nextMax - tol
  }

  if (isClient) {
    watch(
      () => toValue(target),
      (el, _prev, onCleanup) => {
        sync()
        if (!el) return

        el.addEventListener('scroll', sync, { passive: true })

        let observer: ResizeObserver | undefined
        if (typeof ResizeObserver === 'function') {
          observer = new ResizeObserver(sync)
          observer.observe(el)
        }

        onCleanup(() => {
          el.removeEventListener('scroll', sync)
          observer?.disconnect()
        })
      },
      { immediate: true },
    )

    watch(dir, sync, { flush: 'post' })
  }

  return {
    offset: readonly(offset),
    max: readonly(max),
    atStart: readonly(atStart),
    atEnd: readonly(atEnd),
    scrollTo: (nextOffset, scrollOptions) => {
      scrollToInline(toValue(target), nextOffset, scrollOptions)
      sync()
    },
    scrollBy: (delta, scrollOptions) => {
      scrollByInline(toValue(target), delta, scrollOptions)
      sync()
    },
    scrollToStart: (scrollOptions) => {
      scrollToInline(toValue(target), 0, scrollOptions)
      sync()
    },
    scrollToEnd: (scrollOptions) => {
      const el = toValue(target)
      scrollToInline(el, getScrollInlineMax(el), scrollOptions)
      sync()
    },
  }
}
