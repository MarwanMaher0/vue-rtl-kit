/**
 * Best-effort locale persistence for plain Vue apps.
 *
 * Every access is wrapped in try/catch: storage can throw (private browsing,
 * disabled cookies, quota limits) and persistence must never break the store.
 * Nothing here runs at import time, and callers gate on `hasDom()` so the
 * server never touches `window` or `document`.
 */

/** One year, in seconds. */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export type PersistMode = 'localStorage' | 'cookie'

/** Read the persisted locale, or `undefined` when absent or unreadable. */
export function readPersistedLocale(mode: PersistMode, key: string): string | undefined {
  try {
    if (mode === 'localStorage') {
      return window.localStorage.getItem(key) ?? undefined
    }
    const name = `${encodeURIComponent(key)}=`
    for (const part of document.cookie.split(';')) {
      const entry = part.trim()
      if (entry.startsWith(name)) return decodeURIComponent(entry.slice(name.length))
    }
    return undefined
  }
  catch {
    return undefined
  }
}

/** Write the locale. Cookie: `path=/`, `SameSite=Lax`, one year, encoded. */
export function writePersistedLocale(mode: PersistMode, key: string, locale: string): void {
  try {
    if (mode === 'localStorage') {
      window.localStorage.setItem(key, locale)
      return
    }
    document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(locale)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
  }
  catch {
    // Persistence is best-effort; a blocked storage must never throw.
  }
}