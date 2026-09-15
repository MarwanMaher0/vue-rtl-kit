/**
 * The app-level direction store and Vue plugin.
 */
import type { App } from 'vue'
import { effectScope, watch } from 'vue'
import { BidiText, RtlProvider } from './components'
import { createDirectionState } from './context'
import { vRtl } from './directives/vRtl'
import { isClient } from './env'
import { directionScopeKey, rtlInstanceKey } from './keys'
import { directionOfLocale, normaliseLocales, resolveDirection } from './locale'
import type { DirectionContext, ResolvedRtlOptions, RtlInstance, RtlOptions } from './types'

function resolveOptions(options: RtlOptions): ResolvedRtlOptions {
  const locales = normaliseLocales(options.locales)
  const tags = Object.keys(locales)
  const defaultLocale = options.defaultLocale ?? tags[0] ?? 'en'
  const dir = options.dir
    ?? (tags.length ? resolveDirection(defaultLocale, locales) : directionOfLocale(defaultLocale))

  return {
    locales,
    defaultLocale,
    dir,
    syncDocument: options.syncDocument ?? true,
    htmlClass: options.htmlClass ?? false,
    numberingSystem: options.numberingSystem,
    registerGlobals: options.registerGlobals ?? true,
  }
}

/**
 * Create the app-level direction store.
 *
 * The result is both a Vue plugin (`app.use(rtl)`) and a plain store you can
 * drive from outside the component tree - a router guard, a settings action,
 * an SSR shell that needs `rtl.htmlAttrs()`.
 *
 * On the client the store keeps `<html dir>` and `<html lang>` in sync. During
 * SSR it touches no DOM at all: render `rtl.htmlAttrs()` into your shell (or
 * let the Nuxt module do it) and the first paint is already correct, with no
 * direction flash on hydration.
 *
 * @example
 * import { createApp } from 'vue'
 * import { createRtl } from 'vue-rtl-kit'
 * import 'vue-rtl-kit/styles.css'
 *
 * const rtl = createRtl({
 *   locales: { en: 'ltr', ar: 'rtl' },
 *   defaultLocale: 'ar',
 * })
 * createApp(App).use(rtl).mount('#app')
 */
export function createRtl(options: RtlOptions = {}): RtlInstance {
  const resolved = resolveOptions(options)

  const state = createDirectionState({
    dir: resolved.dir,
    locale: resolved.defaultLocale,
    locales: resolved.locales,
    pinned: options.dir !== undefined,
  })

  const scope = effectScope(true)

  scope.run(() => {
    if (!resolved.syncDocument || !isClient) return
    watch(
      [state.dir, state.locale],
      ([nextDir, nextLocale]) => {
        const root = document.documentElement
        root.setAttribute('dir', nextDir)
        root.setAttribute('lang', nextLocale)
        if (resolved.htmlClass) {
          const names = resolved.htmlClass === true ? { rtl: 'rtl', ltr: 'ltr' } : resolved.htmlClass
          root.classList.toggle(names.rtl, nextDir === 'rtl')
          root.classList.toggle(names.ltr, nextDir === 'ltr')
        }
      },
      { immediate: true, flush: 'post' },
    )
  })

  const instance: RtlInstance = {
    ...state,
    isRoot: true,
    options: resolved,
    dispose: () => scope.stop(),
    install(app: App) {
      app.provide(rtlInstanceKey, instance)
      app.provide(directionScopeKey, instance as DirectionContext)
      app.config.globalProperties.$rtl = instance

      if (!resolved.registerGlobals) return
      app.component('RtlProvider', RtlProvider)
      app.component('BidiText', BidiText)
      app.directive('rtl', vRtl)
    },
  }

  return instance
}
