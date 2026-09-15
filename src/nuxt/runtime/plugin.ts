/**
 * Nuxt runtime plugin.
 *
 * Installs the direction store and mirrors it onto `<html>` through `useHead`,
 * which is what puts the correct direction in the *server-rendered* HTML rather
 * than only after hydration - no flash of LTR on an Arabic page.
 */
import { createRtl } from 'vue-rtl-kit'
import type { App } from 'vue'
import type { Direction, RtlOptions } from '../../types'

// Nuxt's auto-imports, declared rather than imported so this file type-checks
// without a generated `.nuxt/` directory present.
declare function defineNuxtPlugin<T>(plugin: T): T
declare function useRuntimeConfig(): { public: { rtl?: RtlOptions } }
declare function useHead(input: { htmlAttrs: { dir: Direction, lang: string } }): void

export default defineNuxtPlugin((nuxtApp: { vueApp: App }) => {
  const options = useRuntimeConfig().public.rtl ?? {}
  const rtl = createRtl(options)

  nuxtApp.vueApp.use(rtl)

  useHead({
    htmlAttrs: {
      get dir() {
        return rtl.dir.value
      },
      get lang() {
        return rtl.locale.value
      },
    },
  })

  return { provide: { rtl } }
})
