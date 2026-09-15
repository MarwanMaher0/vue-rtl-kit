import type { DirectiveBinding, ObjectDirective } from 'vue'
import type { DirectionOrAuto } from '../types'

/** What `v-rtl` can be bound to. */
export type RtlDirectiveValue =
  | DirectionOrAuto
  | boolean
  | undefined
  | null
  | { dir?: DirectionOrAuto, isolate?: boolean }

interface RtlElement extends HTMLElement {
  /** The element's own `dir` before the directive touched it, for restoring. */
  __rtlPreviousDir?: string | null
  /** The element's own inline `unicode-bidi` before the directive touched it. */
  __rtlPreviousBidi?: string
}

const PREVIOUS_DIR = '__rtlPreviousDir' as const
const PREVIOUS_BIDI = '__rtlPreviousBidi' as const

function resolve(binding: DirectiveBinding<RtlDirectiveValue>): { dir: DirectionOrAuto, isolate: boolean } {
  const { value, arg, modifiers } = binding

  let dir: DirectionOrAuto | undefined
  let isolateRun = Boolean(modifiers.isolate)

  if (typeof value === 'string') dir = value
  else if (value === false) dir = 'ltr'
  else if (value && typeof value === 'object') {
    dir = value.dir
    if (value.isolate !== undefined) isolateRun = value.isolate
  }

  dir ??= (arg as DirectionOrAuto | undefined)
  if (!dir) {
    dir = modifiers.ltr ? 'ltr' : modifiers.auto ? 'auto' : 'rtl'
  }

  return { dir, isolate: isolateRun }
}

function apply(el: RtlElement, binding: DirectiveBinding<RtlDirectiveValue>): void {
  const { dir, isolate } = resolve(binding)
  el.setAttribute('dir', dir)
  if (isolate) el.style.unicodeBidi = 'isolate'
}

/**
 * Pin a subtree to one direction.
 *
 * The everyday case is a fragment that is not in the page language: a code
 * block, a file path, a terminal transcript, an English brand name inside an
 * Arabic layout. Without a `dir` of its own it inherits the page direction and
 * its punctuation drifts to the wrong end.
 *
 * On unmount the element's previous `dir` is restored, so the directive is safe
 * on elements that already carried one (server-rendered markup, for instance).
 *
 * @example
 * <pre v-rtl:ltr><code>npm install vue-rtl-kit</code></pre>
 * <span v-rtl.ltr.isolate>{{ branchName }}</span>
 * <div v-rtl="userPreferredDir">...</div>
 */
export const vRtl: ObjectDirective<RtlElement, RtlDirectiveValue> = {
  /** Server-side render: emit the attribute into the HTML string. */
  getSSRProps(binding) {
    const { dir, isolate } = resolve(binding as DirectiveBinding<RtlDirectiveValue>)
    return isolate ? { dir, style: { 'unicode-bidi': 'isolate' } } : { dir }
  },
  mounted(el, binding) {
    el[PREVIOUS_DIR] = el.getAttribute('dir')
    el[PREVIOUS_BIDI] = el.style.unicodeBidi
    apply(el, binding)
  },
  updated(el, binding) {
    apply(el, binding)
  },
  unmounted(el) {
    const previousDir = el[PREVIOUS_DIR]
    if (previousDir === null || previousDir === undefined) el.removeAttribute('dir')
    else el.setAttribute('dir', previousDir)
    el.style.unicodeBidi = el[PREVIOUS_BIDI] ?? ''
    delete el[PREVIOUS_DIR]
    delete el[PREVIOUS_BIDI]
  },
}

/** Alias for `app.directive('rtl', vRtl)` registrations that prefer a name. */
export const rtlDirective: ObjectDirective<RtlElement, RtlDirectiveValue> = vRtl
