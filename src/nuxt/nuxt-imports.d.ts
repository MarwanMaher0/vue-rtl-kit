/**
 * Types for Nuxt's virtual modules.
 *
 * The runtime plugin imports `defineNuxtPlugin`, `useRuntimeConfig` and
 * `useHead` explicitly so the built plugin works under SSR, where Nuxt's
 * auto-imports are not injected into a module's own file. This repository type
 * checks without a generated `.nuxt/` directory, so only the signatures the
 * plugin actually uses are declared here.
 */
declare module '#app' {
  import type { RtlOptions } from '../types'

  export function defineNuxtPlugin<T>(plugin: T): T
  export function useRuntimeConfig(): { public: { rtl?: RtlOptions } }
}

declare module '#imports' {
  export { defineNuxtPlugin, useRuntimeConfig } from '#app'
  export function useHead(
    input:
      | { htmlAttrs: { dir?: string, lang?: string, class?: string } }
      | (() => { htmlAttrs: { dir?: string, lang?: string, class?: string } }),
  ): void
}