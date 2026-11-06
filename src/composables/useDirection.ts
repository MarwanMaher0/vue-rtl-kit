import type { App } from 'vue'
import { getCurrentInstance, hasInjectionContext, inject } from 'vue'
import { createDirectionState } from '../context'
import { directionScopeKey, rtlInstanceKey } from '../keys'
import type { DirectionContext, RtlInstance } from '../types'

/**
 * Fallback used when `useDirection()` is called without the plugin and without
 * a `<RtlProvider>`. Keyed per Vue `App` so concurrent SSR renders cannot leak
 * direction mutations across requests, with a global fallback outside any app.
 */
let detachedByApp = new WeakMap<App, DirectionContext>()
let detachedGlobal: DirectionContext | undefined

function createDetached(): DirectionContext {
  return { ...createDirectionState({ dir: 'ltr', locale: 'en' }), isRoot: false }
}

function getDetached(): DirectionContext {
  const app = getCurrentInstance()?.appContext.app
  if (app) {
    let ctx = detachedByApp.get(app)
    if (!ctx) {
      ctx = createDetached()
      detachedByApp.set(app, ctx)
    }
    return ctx
  }
  detachedGlobal ??= createDetached()
  return detachedGlobal
}

/** Reset the fallback context. Test helper; not part of the public contract. */
export function resetDetachedDirection(): void {
  detachedByApp = new WeakMap<App, DirectionContext>()
  detachedGlobal = undefined
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
  if (!hasInjectionContext()) return getDetached()
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
  const instance = hasInjectionContext() ? inject(rtlInstanceKey, null) : null
  if (!instance) {
    throw new Error(
      '[vue-rtl-kit] useRtl() needs the plugin: `app.use(createRtl({ ... }))`. '
      + 'For a scope-local direction, use useDirection() instead.',
    )
  }
  return instance
}
