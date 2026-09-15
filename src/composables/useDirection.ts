import { inject } from 'vue'
import { createDirectionState } from '../context'
import { directionScopeKey, rtlInstanceKey } from '../keys'
import type { DirectionContext, RtlInstance } from '../types'

/**
 * Fallback used when `useDirection()` is called without the plugin and without
 * a `<RtlProvider>`. Created once, syncs no DOM, and keeps standalone use of
 * `<BidiText>` working instead of throwing.
 */
let detached: DirectionContext | undefined

function getDetached(): DirectionContext {
  detached ??= { ...createDirectionState({ dir: 'ltr', locale: 'en' }), isRoot: false }
  return detached
}

/** Reset the fallback context. Test helper; not part of the public contract. */
export function resetDetachedDirection(): void {
  detached = undefined
}

/**
 * Read and control the direction of the current subtree.
 *
 * Resolution order: the nearest `<RtlProvider>`, then the app-level store from
 * `createRtl()`, then a detached fallback so the composable never throws.
 *
 * Inside a `<RtlProvider>`, `setDirection` / `toggleDirection` affect that
 * scope only - the surrounding page is left alone.
 *
 * @example
 * const { dir, isRtl, toggleDirection } = useDirection()
 */
export function useDirection(): DirectionContext {
  return inject(directionScopeKey, null) ?? inject(rtlInstanceKey, null) ?? getDetached()
}

/**
 * Get the app-level store, skipping any `<RtlProvider>` in between.
 *
 * Use it when a control inside a scoped subtree - a language switcher in an
 * LTR-pinned toolbar, say - must still flip the whole page.
 *
 * @throws when the plugin was never installed
 */
export function useRtl(): RtlInstance {
  const instance = inject(rtlInstanceKey, null)
  if (!instance) {
    throw new Error(
      '[vue-rtl-kit] useRtl() needs the plugin: `app.use(createRtl({ ... }))`. '
      + 'For a scope-local direction, use useDirection() instead.',
    )
  }
  return instance
}
