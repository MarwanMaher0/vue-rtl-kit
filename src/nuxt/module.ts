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
import { addComponent, addImports, addPlugin, createResolver, defineNuxtModule, useLogger } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import type { RtlOptions } from '../types'

/**
 * Nuxt module options. `persist` and `persistKey` from `RtlOptions` are
 * excluded: in Nuxt, persistence goes through the SSR-aware `cookie` option
 * below, so the server-rendered HTML already carries the saved direction.
 */
export interface ModuleOptions extends Omit<RtlOptions, 'persist' | 'persistKey'> {
  /** Auto-import the composables. Default `true`. */
  autoImports?: boolean
  /**
   * Register `<RtlProvider>` and `<BidiText>` through Nuxt's component
   * auto-registration. The runtime store can still register them globally
   * through `registerGlobals`. Default `true`.
   */
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

const DEFAULT_LOCALE = 'en'

const rtl = defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'vue-rtl-kit',
    configKey: 'rtl',
    compatibility: { nuxt: '>=3.0.0' },
  },
  defaults: {
    locales: { en: 'ltr', ar: 'rtl' },
    defaultLocale: DEFAULT_LOCALE,
    autoImports: true,
    components: true,
    css: true,
  },
  setup(options: ModuleOptions, nuxt: Nuxt) {
    const { resolve } = createResolver(import.meta.url)
    const logger = useLogger('vue-rtl-kit')

    // `options` already folds inline module options, the `rtl` config key, and
    // the module defaults together. Comparing the effective default locale
    // against the effective locale list therefore warns when the user picked
    // an unknown default, and also when they replaced `locales` without
    // choosing one (the inherited 'en' is no longer listed). The untouched
    // defaults keep 'en' in `locales`, so they stay quiet. Telling an explicit
    // 'en' apart from the inherited default needs the raw config, since the
    // merged options cannot say where the value came from.
    const localeKeys = Array.isArray(options.locales)
      ? options.locales
      : Object.keys(options.locales ?? {})
    const isConfiguredLocale = (locale: string): boolean => {
      if (localeKeys.includes(locale)) return true
      const language = locale.split(/[-_]/)[0]
      return Boolean(language) && localeKeys.includes(language as string)
    }
    if (options.defaultLocale !== undefined && !isConfiguredLocale(options.defaultLocale)) {
      const inherited = options.defaultLocale === DEFAULT_LOCALE
        && !((nuxt.options as Nuxt['options'] & { rtl?: Partial<ModuleOptions> }).rtl?.defaultLocale != null
          || nuxt.options.modules.some(i => Array.isArray(i)
            && (i[0] === rtl || i[0] === 'vue-rtl-kit/nuxt')
            && i[1]?.defaultLocale != null))
      logger.warn(inherited
        ? `defaultLocale "${options.defaultLocale}" (module default) is not one of the configured locales; set rtl.defaultLocale.`
        : `defaultLocale "${options.defaultLocale}" is not one of the configured locales.`)
    }
    const dir = options.dir as string | undefined
    if (dir !== undefined && dir !== 'rtl' && dir !== 'ltr') {
      logger.warn(`rtl.dir must be "rtl" or "ltr"; received "${dir}".`)
    }

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

export default rtl
