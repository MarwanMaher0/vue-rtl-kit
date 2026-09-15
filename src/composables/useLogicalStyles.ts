import type { ComputedRef } from 'vue'
import { computed } from 'vue'
import type { LogicalStyleOptions, StyleObject } from '../logical'
import { logicalProperty, toLogicalStyle, toPhysicalStyle } from '../logical'
import type { Direction } from '../types'
import { useDirection } from './useDirection'

export interface UseLogicalStylesReturn {
  /** Current direction of the surrounding scope. */
  dir: ComputedRef<Direction>
  /** `true` when the scope is right-to-left. */
  isRtl: ComputedRef<boolean>
  /** Physical side `inline-start` currently resolves to. */
  startSide: ComputedRef<'left' | 'right'>
  /** Physical side `inline-end` currently resolves to. */
  endSide: ComputedRef<'left' | 'right'>
  /** `1` in LTR, `-1` in RTL. Multiply horizontal offsets by it. */
  sign: ComputedRef<1 | -1>
  /** Rewrite a style object to logical properties. */
  toLogical: (style: StyleObject, options?: LogicalStyleOptions) => StyleObject
  /** Resolve a style object to physical properties for the current direction. */
  toPhysical: (style: StyleObject) => StyleObject
  /** Map a single property name to its logical equivalent. */
  property: (name: string, options?: LogicalStyleOptions) => string
  /** Flip a horizontal offset for the current direction. */
  mirror: (value: number) => number
}

/**
 * Direction-aware helpers for styles that have to be computed in JavaScript.
 *
 * Anything you can express in a stylesheet should stay there - `margin-inline-start`
 * needs no JavaScript. Reach for this when the value itself is dynamic: a drag
 * delta, a tooltip offset, a transform built from props.
 *
 * @example
 * const { toLogical, sign, startSide } = useLogicalStyles()
 *
 * const style = computed(() => toLogical({ marginLeft: `${indent.value}px` }))
 * const drag = computed(() => `translateX(${offset.value * sign.value}px)`)
 */
export function useLogicalStyles(): UseLogicalStylesReturn {
  const { dir, isRtl, startSide, endSide, sign } = useDirection()

  return {
    dir: computed(() => dir.value),
    isRtl,
    startSide,
    endSide,
    sign,
    toLogical: (style, options) => toLogicalStyle(style, options),
    toPhysical: style => toPhysicalStyle(style, dir.value),
    property: (name, options) => logicalProperty(name, options),
    mirror: value => value * sign.value,
  }
}
