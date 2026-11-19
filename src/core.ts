/**
 * The app-level direction store and Vue plugin.
 */
import type { App, EffectScope } from 'vue'
import { effectScope, watch } from 'vue'
import { BidiText, RtlProvider } from './components'
import { createDirectionState } from './context'
import { vRtl } from './directives/vRtl'
import { isClient } from './env'
import { directionScopeKey, rtlInstanceKey } from './keys'
import { directionOfLocale, normaliseLocales, resolveDirection } from './locale'
import { readPersistedLocale, writePersistedLocale } from './persist'
import type { DirectionContext, LocaleMap, ResolvedRtlOptions, RtlInstance, RtlOptions } from './types'

function hasDom(): boolean {
  return isClient
    && typeof window !== 'undefined'
    && typeof document !== 'undefined'
    && Boolean(document.documentElement)
}

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
    persist: options.persist ?? false,
    persistKey: options.persistKey ?? 'rtl-locale',
  }
}

/**
 * The locale to restore from storage, or `undefined` when it is not usable.
 * A configured locale is an exact tag or a configured language subtag
 * (`ar-EG` matches an `ar` entry) and is restored as stored. With no
 * `locales`, the tag must be one `Intl.getCanonicalLocales` accepts and is
 * restored in its canonical spelling (`AR-eg` becomes `ar-EG`).
 */
function restorableLocale(locale: string, locales: LocaleMap): string | undefined {
  const tags = Object.keys(locales)
  if (!tags.length) {
    try {
      return Intl.getCanonicalLocales(locale)[0]
    }
    catch {
      return undefined
    }
  }
  return tags.includes(locale) || tags.includes(locale.split(/[-_]/)[0]!) ? locale : undefined
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
 * With `persist: 'localStorage'` or `persist: 'cookie'` the locale is also
 * saved on every `setLocale()` and restored the next time a store is created.
 * Persistence is browser-only and best-effort: storage errors are ignored,
 * and `dispose()` stops the writes.
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

  // Browser-only, opt-in restore. A pinned `dir` option stays pinned: only the
  // locale is restored, never the direction, when `dir` was supplied.
  const stored = resolved.persist && hasDom()
    ? readPersistedLocale(resolved.persist, resolved.persistKey)
    : undefined
  const initialLocale = (stored !== undefined && restorableLocale(stored, resolved.locales))
    || resolved.defaultLocale
  const pinned = options.dir !== undefined
  const initialDir = pinned
    ? resolved.dir
    : Object.keys(resolved.locales).length
      ? resolveDirection(initialLocale, resolved.locales)
      : directionOfLocale(initialLocale)

  const state = createDirectionState({
    dir: initialDir,
    locale: initialLocale,
    locales: resolved.locales,
    pinned,
  })

  let scope: EffectScope | undefined
  let disposed = false
  let installedApps = 0

  const stopSync = (): void => {
    scope?.stop()
    scope = undefined
  }

  const startSync = (): void => {
    if (scope || !hasDom() || (!resolved.syncDocument && !resolved.persist)) return
    const persist = resolved.persist
    scope = effectScope(true)
    scope.run(() => {
      if (resolved.syncDocument) {
        watch(
          [state.dir, state.locale],
          ([nextDir, nextLocale]) => {
            if (!hasDom()) return
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
      }
      if (persist) {
        // Lives in the same scope as the document watcher, so dispose() (or
        // the last app unmounting) stops persistence writes too.
        watch(state.locale, next => writePersistedLocale(persist, resolved.persistKey, next), { flush: 'sync' })
      }
    })
  }

  startSync()

  const instance: RtlInstance = {
    ...state,
    isRoot: true,
    options: resolved,
    dispose: () => {
      disposed = true
      installedApps = 0
      stopSync()
    },
    install(app: App) {
      installedApps++
      if (!disposed) startSync()
      app.provide(rtlInstanceKey, instance)
      app.provide(directionScopeKey, instance as DirectionContext)
      app.config.globalProperties.$rtl = instance

      let active = true
      const onAppUnmount = (): void => {
        if (!active) return
        active = false
        installedApps = Math.max(0, installedApps - 1)
        if (installedApps === 0) stopSync()
      }

      const appWithUnmount = app as App & { onUnmount?: (cb: () => void) => void }
      if (typeof appWithUnmount.onUnmount === 'function') {
        appWithUnmount.onUnmount(onAppUnmount)
      }
      else {
        const originalUnmount = app.unmount.bind(app)
        app.unmount = () => {
          onAppUnmount()
          originalUnmount()
        }
      }

      if (!resolved.registerGlobals) return
      if (!app.component('RtlProvider')) app.component('RtlProvider', RtlProvider)
      if (!app.component('BidiText')) app.component('BidiText', BidiText)
      if (!app.directive('rtl')) app.directive('rtl', vRtl)
    },
  }

  return instance
}
