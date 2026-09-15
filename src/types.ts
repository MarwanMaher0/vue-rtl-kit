/**
 * Public type surface for vue-rtl-kit.
 */
import type { App, ComputedRef, Ref } from 'vue'

/** A writing direction. `vue-rtl-kit` never invents a third value. */
export type Direction = 'rtl' | 'ltr'

/** Direction, plus the browser's first-strong heuristic. */
export type DirectionOrAuto = Direction | 'auto'

/**
 * Unicode numbering system identifier, as accepted by the `-u-nu-` locale
 * extension. The common ones for RTL work are listed explicitly; any other
 * CLDR identifier is accepted too.
 */
export type NumberingSystem =
  | 'latn'
  | 'arab'
  | 'arabext'
  | 'hanidec'
  | 'deva'
  | 'beng'
  | (string & {})

/** How a locale maps onto a direction. */
export type LocaleMap = Record<string, Direction>

export interface RtlOptions {
  /**
   * Locales the app supports. Either a list of BCP-47 tags (direction is
   * inferred from the language subtag) or an explicit tag -> direction map.
   *
   * @example ['en', 'ar-EG']
   * @example { en: 'ltr', ar: 'rtl' }
   */
  locales?: string[] | LocaleMap
  /** Locale to start with. Defaults to the first entry of `locales`, else `'en'`. */
  defaultLocale?: string
  /**
   * Force the initial direction. When omitted the direction is inferred from
   * `defaultLocale`.
   */
  dir?: Direction
  /**
   * Keep `document.documentElement.dir` / `lang` in sync with the store.
   * No-op during SSR. Default `true`.
   */
  syncDocument?: boolean
  /**
   * Also toggle `rtl` / `ltr` class names on `<html>`. Pass an object to use
   * your own class names. Default `false`.
   */
  htmlClass?: boolean | { rtl: string, ltr: string }
  /**
   * Default numbering system for the formatting helpers. Either one value for
   * every locale, or a per-locale map. Default: the locale's own default.
   *
   * @example { ar: 'latn' } // Arabic UI, Western digits
   */
  numberingSystem?: NumberingSystem | Record<string, NumberingSystem>
  /** Register `<RtlProvider>`, `<BidiText>` and `v-rtl` globally. Default `true`. */
  registerGlobals?: boolean
}

/** Options after defaults have been applied. */
export interface ResolvedRtlOptions extends Required<Omit<RtlOptions, 'numberingSystem' | 'dir' | 'locales'>> {
  locales: LocaleMap
  dir: Direction
  numberingSystem?: NumberingSystem | Record<string, NumberingSystem>
}

/**
 * The reactive direction surface. The app-level instance and every
 * `<RtlProvider>` scope implement it, which is why `useDirection()` behaves
 * the same wherever you call it.
 */
export interface DirectionContext {
  /** Current direction. */
  readonly dir: Ref<Direction>
  /** `true` when `dir === 'rtl'`. */
  readonly isRtl: ComputedRef<boolean>
  /** `true` when `dir === 'ltr'`. */
  readonly isLtr: ComputedRef<boolean>
  /** Current BCP-47 locale tag. */
  readonly locale: Ref<string>
  /** Physical side that `inline-start` resolves to right now. */
  readonly startSide: ComputedRef<'left' | 'right'>
  /** Physical side that `inline-end` resolves to right now. */
  readonly endSide: ComputedRef<'left' | 'right'>
  /** `1` in LTR, `-1` in RTL - multiply X offsets/translations by it. */
  readonly sign: ComputedRef<1 | -1>
  /** Set the direction explicitly. */
  setDirection: (dir: Direction) => void
  /** Flip the direction and return the new value. */
  toggleDirection: () => Direction
  /** Switch locale; direction follows unless it was pinned with `setDirection`. */
  setLocale: (locale: string) => void
  /** `{ dir, lang }` - handy for `useHead()` or a manual SSR shell. */
  htmlAttrs: () => { dir: Direction, lang: string }
  /** `true` for the app-level instance, `false` for a `<RtlProvider>` scope. */
  readonly isRoot: boolean
}

export interface RtlInstance extends DirectionContext {
  readonly isRoot: true
  /** Resolved options this instance was created with. */
  readonly options: ResolvedRtlOptions
  /** Vue plugin entry point. */
  install: (app: App) => void
  /** Stop the document-sync watcher. Mostly useful in tests. */
  dispose: () => void
}
