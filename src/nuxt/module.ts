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

    // Exposed to the runtime plugin through `useRuntimeConfig().public.rtl`.
    nuxt.options.runtimeConfig.public.rtl = {
      locales: options.locales,
      defaultLocale: options.defaultLocale,
      dir: options.dir,
      syncDocument: options.syncDocument,
      htmlClass: options.htmlClass,
      numberingSystem: options.numberingSystem,
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
