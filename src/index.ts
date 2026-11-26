/**
 * vue-rtl-kit
 *
 * Right-to-left support for Vue 3 and Nuxt, built around the parts that
 * actually break: direction state that survives SSR, logical properties for
 * styles computed in JavaScript, and Unicode isolation for mixed-direction
 * text.
 *
 * @packageDocumentation
 */

import type { BidiText, RtlProvider } from './components'
import type { vRtl } from './directives/vRtl'
import type { RtlInstance } from './types'

export { createRtl } from './core'
export { createDirectionState } from './context'
export type { DirectionState, DirectionStateOptions } from './context'

export { directionScopeKey, rtlInstanceKey } from './keys'

export { useDirection, useRtl } from './composables/useDirection'
export { useLogicalStyles } from './composables/useLogicalStyles'
export type { UseLogicalStylesReturn } from './composables/useLogicalStyles'
export { useFormat } from './composables/useFormat'
export { useInlineScroll } from './composables/useInlineScroll'
export type { UseInlineScrollOptions, UseInlineScrollReturn } from './composables/useInlineScroll'

export { BidiText, RtlProvider } from './components'

export { rtlDirective, vRtl } from './directives/vRtl'
export type { RtlDirectiveValue } from './directives/vRtl'

export {
  classifyChar,
  detectDirection,
  hasRtlCharacters,
  isMixedDirection,
  isolate,
  isolateRuns,
  splitBidiRuns,
  stripBidiControls,
  FSI,
  LRI,
  LRM,
  PDI,
  RLI,
  RLM,
} from './bidi'
export type { BidiRun } from './bidi'

export {
  logicalArrow,
  logicalProperty,
  toLogicalStyle,
  toPhysicalStyle,
} from './logical'
export type { LogicalArrow, LogicalStyleOptions, StyleObject } from './logical'

export {
  getScrollInline,
  getScrollInlineMax,
  scrollByInline,
  scrollInlineEdges,
  scrollToInline,
} from './scroll'
export type { ScrollInlineEdges, ScrollInlineOptions } from './scroll'

export {
  directionOfLocale,
  normaliseLocales,
  oppositeDirection,
  resolveDirection,
  RTL_LANGUAGES,
} from './locale'

export {
  formatCurrency,
  formatDate,
  formatList,
  formatNumber,
  formatRelativeTime,
  parseNumber,
  transliterateDigits,
  withNumberingSystem,
} from './format'
export type {
  BoundFormatters,
  DateFormatOptions,
  FormatOptionsBase,
  ListFormatOptions,
  NumberFormatOptions,
  ParseNumberOptions,
  RelativeTimeFormatOptions,
} from './format'

export {
  findSearchMatches,
  foldSearchText,
  matchesSearch,
} from './search'
export type { SearchMatch, SearchOptions } from './search'

export { isClient, isServer } from './env'

export type {
  Direction,
  DirectionContext,
  DirectionOrAuto,
  LocaleMap,
  NumberingSystem,
  ResolvedRtlOptions,
  RtlInstance,
  RtlOptions,
} from './types'

declare module 'vue' {
  interface ComponentCustomProperties {
    /** The app-level direction store installed by `createRtl()`. */
    $rtl: RtlInstance
  }

  interface GlobalComponents {
    /** Registered by `createRtl()` unless `registerGlobals` is `false`. */
    BidiText: typeof BidiText
    /** Registered by `createRtl()` unless `registerGlobals` is `false`. */
    RtlProvider: typeof RtlProvider
  }

  interface GlobalDirectives {
    /** `v-rtl`, registered by `createRtl()` unless `registerGlobals` is `false`. */
    vRtl: typeof vRtl
  }
}
