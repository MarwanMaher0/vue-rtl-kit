/**
 * Opt-in locale persistence for plain Vue (`persist` / `persistKey`).
 * These run in jsdom: both storage modes must restore on a new store, reject
 * unknown values, write on setLocale, stop on dispose, and survive storage
 * that throws. SSR safety is covered by test/ssr.spec.ts, which runs with no
 * window or document at all.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRtl } from '../src/core'

function clearCookies(): void {
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0]?.trim()
    if (name) document.cookie = `${name}=; path=/; max-age=0`
  }
}

describe('locale persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    clearCookies()
    document.documentElement.removeAttribute('dir')
    document.documentElement.removeAttribute('lang')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('restores a saved locale from localStorage on a new store', () => {
    localStorage.setItem('rtl-locale', 'ar')
    const rtl = createRtl({ locales: ['en', 'ar'], defaultLocale: 'en', persist: 'localStorage' })
    expect(rtl.locale.value).toBe('ar')
    expect(rtl.dir.value).toBe('rtl')
    expect(rtl.htmlAttrs()).toEqual({ dir: 'rtl', lang: 'ar' })
    rtl.dispose()

    const again = createRtl({ locales: ['en', 'ar'], defaultLocale: 'en', persist: 'localStorage' })
    expect(again.locale.value).toBe('ar')
    again.dispose()
  })

  it('restores a saved locale from a cookie on a new store', () => {
    document.cookie = 'rtl-locale=ar; path=/'
    const rtl = createRtl({ locales: ['en', 'ar'], defaultLocale: 'en', persist: 'cookie' })
    expect(rtl.locale.value).toBe('ar')
    expect(rtl.dir.value).toBe('rtl')
    rtl.dispose()
  })

  it('restores an encoded cookie value and matches configured language subtags', () => {
    document.cookie = `rtl-locale=${encodeURIComponent('ar-EG')}; path=/`
    const rtl = createRtl({ locales: ['en', 'ar'], defaultLocale: 'en', persist: 'cookie' })
    expect(rtl.locale.value).toBe('ar-EG')
    expect(rtl.dir.value).toBe('rtl')
    rtl.dispose()
  })

  it('falls back to defaultLocale for unknown stored values', () => {
    for (const mode of ['localStorage', 'cookie'] as const) {
      for (const unknown of ['fr', 'not-a-locale!', '']) {
        if (mode === 'localStorage') localStorage.setItem('rtl-locale', unknown)
        else document.cookie = `rtl-locale=${encodeURIComponent(unknown)}; path=/`
        const rtl = createRtl({ locales: ['en', 'ar'], defaultLocale: 'en', persist: mode })
        expect({ mode, unknown, locale: rtl.locale.value }).toEqual({ mode, unknown, locale: 'en' })
        expect(rtl.dir.value).toBe('ltr')
        rtl.dispose()
        if (mode === 'localStorage') localStorage.clear()
        else clearCookies()
      }
    }
  })

  it('with no locales, accepts only tags Intl.getCanonicalLocales accepts', () => {
    localStorage.setItem('rtl-locale', 'he')
    const rtl = createRtl({ persist: 'localStorage' })
    expect(rtl.locale.value).toBe('he')
    expect(rtl.dir.value).toBe('rtl')
    rtl.dispose()

    localStorage.setItem('rtl-locale', 'not a locale')
    const fallback = createRtl({ persist: 'localStorage' })
    expect(fallback.locale.value).toBe('en')
    expect(fallback.dir.value).toBe('ltr')
    fallback.dispose()
  })

  it('writes the locale on every setLocale in localStorage mode', () => {
    const rtl = createRtl({ locales: ['en', 'ar'], persist: 'localStorage' })
    expect(localStorage.getItem('rtl-locale')).toBeNull()
    rtl.setLocale('ar')
    expect(localStorage.getItem('rtl-locale')).toBe('ar')
    rtl.setLocale('en')
    expect(localStorage.getItem('rtl-locale')).toBe('en')
    rtl.dispose()
  })

  it('writes an encoded cookie with path=/, SameSite=Lax and one year on setLocale', () => {
    const writes: string[] = []
    const descriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')!
    vi.spyOn(document, 'cookie', 'set').mockImplementation(function (this: Document, value: string) {
      writes.push(value)
      descriptor.set!.call(this, value)
    })
    const rtl = createRtl({ locales: ['en', 'ar'], persist: 'cookie', persistKey: 'my lang' })
    rtl.setLocale('ar')
    expect(writes).toHaveLength(1)
    expect(writes[0]).toContain('my%20lang=ar')
    expect(writes[0]).toContain('path=/')
    expect(writes[0]).toContain('SameSite=Lax')
    expect(writes[0]).toContain(`max-age=${60 * 60 * 24 * 365}`)
    rtl.dispose()

    const again = createRtl({ locales: ['en', 'ar'], defaultLocale: 'en', persist: 'cookie', persistKey: 'my lang' })
    expect(again.locale.value).toBe('ar')
    again.dispose()
  })

  it('stops writing after dispose()', () => {
    for (const mode of ['localStorage', 'cookie'] as const) {
      const rtl = createRtl({ locales: ['en', 'ar'], persist: mode })
      rtl.setLocale('ar')
      rtl.dispose()
      rtl.setLocale('en')
      if (mode === 'localStorage') expect(localStorage.getItem('rtl-locale')).toBe('ar')
      else expect(document.cookie).toContain('rtl-locale=ar')
      clearCookies()
      localStorage.clear()
    }
  })

  it('ignores localStorage that throws on read and write', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    const rtl = createRtl({ locales: ['en', 'ar'], defaultLocale: 'en', persist: 'localStorage' })
    expect(rtl.locale.value).toBe('en')
    expect(() => rtl.setLocale('ar')).not.toThrow()
    expect(rtl.locale.value).toBe('ar')
    expect(rtl.dir.value).toBe('rtl')
    rtl.dispose()
  })

  it('ignores cookies that throw on read and write', () => {
    vi.spyOn(document, 'cookie', 'get').mockImplementation(() => {
      throw new Error('cookies blocked')
    })
    vi.spyOn(document, 'cookie', 'set').mockImplementation(() => {
      throw new Error('cookies blocked')
    })
    const rtl = createRtl({ locales: ['en', 'ar'], defaultLocale: 'en', persist: 'cookie' })
    expect(rtl.locale.value).toBe('en')
    expect(() => rtl.setLocale('ar')).not.toThrow()
    expect(rtl.locale.value).toBe('ar')
    rtl.dispose()
  })

  it('honours a custom persistKey in both modes', () => {
    localStorage.setItem('app-lang', 'ar')
    const fromStorage = createRtl({ locales: ['en', 'ar'], defaultLocale: 'en', persist: 'localStorage', persistKey: 'app-lang' })
    expect(fromStorage.locale.value).toBe('ar')
    fromStorage.setLocale('en')
    expect(localStorage.getItem('app-lang')).toBe('en')
    expect(localStorage.getItem('rtl-locale')).toBeNull()
    fromStorage.dispose()

    document.cookie = 'app-lang=ar; path=/'
    const fromCookie = createRtl({ locales: ['en', 'ar'], defaultLocale: 'en', persist: 'cookie', persistKey: 'app-lang' })
    expect(fromCookie.locale.value).toBe('ar')
    fromCookie.setLocale('en')
    expect(document.cookie).toContain('app-lang=en')
    expect(document.cookie).not.toContain('rtl-locale=')
    fromCookie.dispose()
  })

  it('keeps a pinned dir option pinned when restoring', () => {
    localStorage.setItem('rtl-locale', 'ar')
    const rtl = createRtl({ locales: ['en', 'ar'], defaultLocale: 'en', dir: 'ltr', persist: 'localStorage' })
    expect(rtl.locale.value).toBe('ar')
    expect(rtl.dir.value).toBe('ltr')
    rtl.setLocale('en')
    expect(rtl.dir.value).toBe('ltr')
    rtl.dispose()
  })

  it('reads and writes nothing without persist', () => {
    localStorage.setItem('rtl-locale', 'ar')
    document.cookie = 'rtl-locale=ar; path=/'
    const rtl = createRtl({ locales: ['en', 'ar'], defaultLocale: 'en' })
    expect(rtl.locale.value).toBe('en')
    rtl.setLocale('en')
    expect(localStorage.getItem('rtl-locale')).toBe('ar')
    expect(document.cookie).toBe('rtl-locale=ar')
    rtl.dispose()

    localStorage.clear()
    clearCookies()
    const plain = createRtl({ locales: ['en', 'ar'] })
    plain.setLocale('ar')
    expect(localStorage.getItem('rtl-locale')).toBeNull()
    expect(document.cookie).toBe('')
    plain.dispose()
  })

  it('persists even with syncDocument disabled', () => {
    localStorage.setItem('rtl-locale', 'ar')
    const rtl = createRtl({ locales: ['en', 'ar'], defaultLocale: 'en', syncDocument: false, persist: 'localStorage' })
    expect(rtl.locale.value).toBe('ar')
    expect(document.documentElement.hasAttribute('dir')).toBe(false)
    rtl.setLocale('en')
    expect(localStorage.getItem('rtl-locale')).toBe('en')
    rtl.dispose()
  })

  it('resolves persist and persistKey defaults in options', () => {
    const off = createRtl()
    expect(off.options.persist).toBe(false)
    expect(off.options.persistKey).toBe('rtl-locale')
    off.dispose()

    const on = createRtl({ persist: 'cookie', persistKey: 'site-lang' })
    expect(on.options.persist).toBe('cookie')
    expect(on.options.persistKey).toBe('site-lang')
    on.dispose()
  })
})