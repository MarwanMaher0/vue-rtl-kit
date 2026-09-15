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

import type { RtlInstance } from './types'

export { createRtl } from './core'
export { createDirectionState } from './context'
export type { DirectionState, DirectionStateOptions } from './context'

export { directionScopeKey, rtlInstanceKey } from './keys'

export { useDirection, useRtl } from './composables/useDirection'
export { useLogicalStyles } from './composables/useLogicalStyles'
export type { UseLogicalStylesReturn } from './composables/useLogicalStyles'
export { useFormat } from './composables/useFormat'

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
  logicalProperty,
  toLogicalStyle,
  toPhysicalStyle,
} from './logical'
export type { LogicalStyleOptions, StyleObject } from './logical'

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
  formatNumber,
  transliterateDigits,
  withNumberingSystem,
} from './format'
export type {
  BoundFormatters,
  DateFormatOptions,
  FormatOptionsBase,
  NumberFormatOptions,
} from './format'

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
}
