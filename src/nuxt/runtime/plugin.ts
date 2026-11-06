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
    registerGlobals: (raw as Record<string, unknown>).registerGlobals === '' ? undefined : raw.registerGlobals,
  }
  const rtl = createRtl(options)

  nuxtApp.vueApp.use(rtl)

  useHead(() => {
    const htmlClass = rtl.options.htmlClass
    const names = htmlClass
      ? (htmlClass === true ? { rtl: 'rtl', ltr: 'ltr' } : htmlClass)
      : undefined
    return {
      htmlAttrs: {
        dir: rtl.dir.value,
        lang: rtl.locale.value,
        ...(names && { class: rtl.dir.value === 'rtl' ? names.rtl : names.ltr }),
      },
    }
  })

  return { provide: { rtl } }
})
