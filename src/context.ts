/**
 * The shared reactive direction state.
 *
 * Both the app-level instance (`createRtl`) and every `<RtlProvider>` scope are
 * built from this, which is why `useDirection()` behaves identically whether it
 * resolves to the app root or to a nested provider.
 */
import { computed, ref } from 'vue'
import { oppositeDirection, resolveDirection } from './locale'
import type { Direction, DirectionContext, LocaleMap } from './types'

export interface DirectionStateOptions {
  /** Initial direction. */
  dir: Direction
  /** Initial BCP-47 locale tag. */
  locale: string
  /** Known locale -> direction pairs, used by `setLocale`. */
  locales?: LocaleMap
  /**
   * When `true`, `setLocale` leaves the direction alone: the direction was
   * chosen explicitly and must not be recomputed from the locale.
   */
  pinned?: boolean
}

export type DirectionState = Omit<DirectionContext, 'isRoot'>

/** Build the reactive direction state shared by the root store and scopes. */
export function createDirectionState(options: DirectionStateOptions): DirectionState {
  const locales = options.locales ?? {}
  const dir = ref<Direction>(options.dir)
  const locale = ref<string>(options.locale)
  let pinned = options.pinned ?? false

  const isRtl = computed(() => dir.value === 'rtl')

  return {
    dir,
    locale,
    isRtl,
    isLtr: computed(() => !isRtl.value),
    startSide: computed<'left' | 'right'>(() => (isRtl.value ? 'right' : 'left')),
    endSide: computed<'left' | 'right'>(() => (isRtl.value ? 'left' : 'right')),
    sign: computed<1 | -1>(() => (isRtl.value ? -1 : 1)),
    setDirection(next: Direction) {
      pinned = true
      dir.value = next
    },
    toggleDirection() {
      pinned = true
      dir.value = oppositeDirection(dir.value)
      return dir.value
    },
    setLocale(next: string) {
      locale.value = next
      if (!pinned) dir.value = resolveDirection(next, locales, dir.value)
    },
    htmlAttrs: () => ({ dir: dir.value, lang: locale.value }),
  }
}
