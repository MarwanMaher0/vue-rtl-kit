/**
 * Nuxt runtime plugin.
 *
 * Installs the direction store and mirrors it onto `<html>` through `useHead`,
 * which is what puts the correct direction in the *server-rendered* HTML rather
 * than only after hydration - no flash of LTR on an Arabic page.
 *
 * The Nuxt APIs are imported explicitly: auto-imports are never injected into
 * this module's own built file, so calling them as bare globals fails every SSR
 * request with "defineNuxtPlugin is not defined".
 */
import { createRtl } from 'vue-rtl-kit'
import type { App } from 'vue'
import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import { useHead } from '#imports'

export default defineNuxtPlugin((nuxtApp: { vueApp: App }) => {
  const raw = useRuntimeConfig().public.rtl ?? {}
  // Nuxt serialises unset runtime-config fields as empty strings; treat those
  // as "not set" so `dir` is inferred from `defaultLocale` instead of "".
  const options = {
    ...raw,
    dir: raw.dir || undefined,
    syncDocument: raw.syncDocument === '' ? undefined : raw.syncDocument,
    htmlClass: raw.htmlClass === '' ? undefined : raw.htmlClass,
    numberingSystem: raw.numberingSystem || undefined,
  }
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
