/**
 * Nuxt 3 / Nuxt 4 module.
 *
 * Registers the plugin, auto-imports the composables and components, injects
 * the stylesheet, and - the part that matters - writes `dir` and `lang` onto
 * `<html>` during SSR, so the first paint is already in the right direction
 * and there is no flash of LTR before hydration.
 *
 * @example
 * // nuxt.config.ts
 * export default defineNuxtConfig({
 *   modules: ['vue-rtl-kit/nuxt'],
 *   rtl: { locales: { en: 'ltr', ar: 'rtl' }, defaultLocale: 'ar' },
 * })
 */
import { addComponent, addImports, addPlugin, createResolver, defineNuxtModule } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import type { RtlOptions } from '../types'

export interface ModuleOptions extends RtlOptions {
  /** Auto-import the composables. Default `true`. */
  autoImports?: boolean
  /** Register `<RtlProvider>` and `<BidiText>` globally. Default `true`. */
  components?: boolean
  /** Inject `vue-rtl-kit/styles.css`. Default `true`. */
  css?: boolean
  /**
   * Persist the visitor's locale/direction in a cookie so returning users get
   * the right `dir`/`lang` in server-rendered HTML. `false` (default) disables
   * persistence; a string is the cookie name; an object overrides the cookie
   * `name`, `maxAge` (seconds) and `sameSite`. Defaults are name
   * `'vue-rtl-kit'`, `maxAge` one year and `sameSite: 'lax'`.
   */
  cookie?: false | string | {
    name?: string
    maxAge?: number
    sameSite?: boolean | 'lax' | 'strict' | 'none'
  }
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'vue-rtl-kit',
    configKey: 'rtl',
    compatibility: { nuxt: '>=3.0.0' },
  },
  defaults: {
    locales: { en: 'ltr', ar: 'rtl' },
    defaultLocale: 'en',
    autoImports: true,
    components: true,
    css: true,
  },
  setup(options: ModuleOptions, nuxt: Nuxt) {
    const { resolve } = createResolver(import.meta.url)

    const cookie = options.cookie
      ? {
          name: (typeof options.cookie === 'string' ? options.cookie : options.cookie.name) || 'vue-rtl-kit',
          maxAge: (typeof options.cookie === 'object' ? options.cookie.maxAge : undefined) ?? 60 * 60 * 24 * 365,
          sameSite: (typeof options.cookie === 'object' ? options.cookie.sameSite : undefined) ?? 'lax',
        }
      : undefined

    // Exposed to the runtime plugin through `useRuntimeConfig().public.rtl`.
    // Undefined option values are omitted: Nuxt would serialise them as "".
    nuxt.options.runtimeConfig.public.rtl = {
      locales: options.locales,
      defaultLocale: options.defaultLocale,
      ...(options.dir !== undefined && { dir: options.dir }),
      ...(cookie && { cookie }),
      ...(options.syncDocument !== undefined && { syncDocument: options.syncDocument }),
      ...(options.htmlClass !== undefined && { htmlClass: options.htmlClass }),
      ...(options.numberingSystem !== undefined && { numberingSystem: options.numberingSystem }),
      ...(options.registerGlobals !== undefined && { registerGlobals: options.registerGlobals }),
    } as Record<string, unknown>

    if (options.css !== false) {
      nuxt.options.css.push('vue-rtl-kit/styles.css')
    }

    if (options.components !== false) {
      for (const name of ['RtlProvider', 'BidiText'] as const) {
        addComponent({ name, export: name, filePath: 'vue-rtl-kit' })
      }
    }

    if (options.autoImports !== false) {
      for (const name of ['useDirection', 'useRtl', 'useLogicalStyles', 'useFormat'] as const) {
        addImports({ name, from: 'vue-rtl-kit' })
      }
    }

    addPlugin({ src: resolve('./runtime/plugin'), mode: 'all' })
  },
})
