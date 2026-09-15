/**
 * Environment probes. Everything that touches `document` funnels through here
 * so SSR safety is one assertion, not a habit.
 */

/** `true` only in a browser-like environment with a live document. */
export const isClient: boolean
  = typeof window !== 'undefined' && typeof document !== 'undefined'

/** `true` when rendering on a server (the inverse of {@link isClient}). */
export const isServer: boolean = !isClient
