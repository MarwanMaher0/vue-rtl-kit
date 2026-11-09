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
import { createRtl, normaliseLocales } from 'vue-rtl-kit'
import type { Direction } from 'vue-rtl-kit'
import type { App } from 'vue'
import { defineNuxtPlugin, useCookie, useRuntimeConfig } from '#app'
import { useHead } from '#imports'

interface CookieConfig {
  name: string
  maxAge: number
  sameSite: boolean | 'lax' | 'strict' | 'none'
}

function isDirection(value: string): value is Direction {
  return value === 'rtl' || value === 'ltr'
}

/**
 * Parse a saved cookie value. Accepted forms are a locale (`ar`), a direction
 * (`rtl`), or the `locale:dir` pair this plugin writes. A locale counts only
 * when it (or its language subtag) is one of the configured locales, so
 * arbitrary cookie values can never steer the initial render.
 */
function parseCookie(
  value: string | null | undefined,
  locales: Record<string, Direction>,
): { locale?: string, dir?: Direction } | undefined {
  if (!value || typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (isDirection(trimmed)) return { dir: trimmed }

  const [locale, dir, ...rest] = trimmed.split(':')
  if (!locale || rest.length || (dir !== undefined && !isDirection(dir))) return undefined
  const known = Object.keys(locales).some(
    key => key.toLowerCase() === locale.toLowerCase()
      || key.toLowerCase() === locale.split('-')[0]!.toLowerCase(),
  )
  if (!known) return undefined
  return dir ? { locale, dir } : { locale }
}

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

  const cookieConfig = (raw as Record<string, unknown>).cookie as CookieConfig | '' | undefined
  let cookie: ReturnType<typeof useCookie<string>> | undefined
  let saved: { locale?: string, dir?: Direction } | undefined

  if (cookieConfig && typeof cookieConfig === 'object') {
    cookie = useCookie<string>(cookieConfig.name || 'vue-rtl-kit', {
      maxAge: cookieConfig.maxAge,
      sameSite: cookieConfig.sameSite,
      path: '/',
    })
    saved = parseCookie(cookie.value, normaliseLocales(options.locales))
    if (saved?.locale) options.defaultLocale = saved.locale
    // A saved locale re-derives direction unless the cookie pinned one too.
    if (saved?.dir) options.dir = saved.dir
    else if (saved?.locale) options.dir = undefined
  }

  const rtl = createRtl(options)

  if (cookie) {
    const target = cookie
    const write = () => {
      target.value = `${rtl.locale.value}:${rtl.dir.value}`
    }
    const setLocale = rtl.setLocale.bind(rtl)
    const setDirection = rtl.setDirection.bind(rtl)
    const toggleDirection = rtl.toggleDirection.bind(rtl)
    rtl.setLocale = (locale: string) => {
      setLocale(locale)
      write()
    }
    rtl.setDirection = (dir: Direction) => {
      setDirection(dir)
      write()
    }
    rtl.toggleDirection = () => {
      const next = toggleDirection()
      write()
      return next
    }
  }

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
