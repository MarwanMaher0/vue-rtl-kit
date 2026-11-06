import type { DirectiveBinding, MaybeRef, ObjectDirective, VNode, WatchStopHandle } from 'vue'
import { isReactive, isRef, unref, watch } from 'vue'
import type { DirectionOrAuto } from '../types'

/** What `v-rtl` can be bound to. */
export type RtlDirectiveValue = MaybeRef<
  | DirectionOrAuto
  | boolean
  | undefined
  | null
  | { dir?: MaybeRef<DirectionOrAuto | undefined>, isolate?: MaybeRef<boolean | undefined> }
>

interface RtlElement extends HTMLElement {
  /** The element's own `dir` before the directive touched it, for restoring. */
  __rtlPreviousDir?: string | null
  /** The element's own inline `unicode-bidi` before the directive touched it. */
  __rtlPreviousBidi?: string
  __rtlHadStyleAttr?: boolean
  __rtlStopWatch?: WatchStopHandle
}

const PREVIOUS_DIR = '__rtlPreviousDir' as const
const PREVIOUS_BIDI = '__rtlPreviousBidi' as const
const HAD_STYLE_ATTR = '__rtlHadStyleAttr' as const
const STOP_WATCH = '__rtlStopWatch' as const

function resolve(binding: DirectiveBinding<RtlDirectiveValue>): { dir: DirectionOrAuto, isolate: boolean } {
  const { arg, modifiers } = binding
  const value = unref(binding.value)

  let dir: DirectionOrAuto | undefined
  let isolateRun = Boolean(modifiers.isolate)

  if (typeof value === 'string') dir = value
  else if (value === true) dir = 'rtl'
  else if (value === false) dir = 'ltr'
  else if (value && typeof value === 'object') {
    const rawDir = unref(value.dir)
    const rawIsolate = unref(value.isolate)
    if (typeof rawDir === 'string') dir = rawDir
    if (typeof rawIsolate === 'boolean') isolateRun = rawIsolate
  }

  dir ??= (arg as DirectionOrAuto | undefined)
  if (!dir) {
    dir = modifiers.ltr ? 'ltr' : modifiers.auto ? 'auto' : 'rtl'
  }

  return { dir, isolate: isolateRun }
}

function isReactiveBinding(value: RtlDirectiveValue): boolean {
  if (isRef(value) || isReactive(value)) return true
  if (value && typeof value === 'object') {
    return isRef(value.dir) || isRef(value.isolate)
  }
  return false
}

function applyResolved(el: RtlElement, resolved: { dir: DirectionOrAuto, isolate: boolean }): void {
  el.setAttribute('dir', resolved.dir)
  if (resolved.isolate) {
    el.style.unicodeBidi = 'isolate'
  }
  else {
    el.style.unicodeBidi = el[PREVIOUS_BIDI] ?? ''
    if (!el[HAD_STYLE_ATTR] && el.getAttribute('style') === '') {
      el.removeAttribute('style')
    }
  }
}

function syncWatch(el: RtlElement, binding: DirectiveBinding<RtlDirectiveValue>): void {
  el[STOP_WATCH]?.()
  delete el[STOP_WATCH]
  if (isReactiveBinding(binding.value)) {
    el[STOP_WATCH] = watch(
      () => resolve(binding),
      resolved => applyResolved(el, resolved),
      { flush: 'sync' },
    )
  }
}

function readOwnStyleBidi(vnode?: VNode< unknown, RtlElement > | null): string | undefined {
  const rawStyle = vnode?.props?.style
  if (!rawStyle) return undefined
  if (typeof rawStyle === 'string') {
    const match = rawStyle.match(/unicode-bidi\s*:\s*([^;]+)/i)
    return match?.[1]?.trim()
  }
  if (typeof rawStyle === 'object' && !Array.isArray(rawStyle)) {
    const styleObj = rawStyle as Record<string, unknown>
    const val = styleObj.unicodeBidi ?? styleObj['unicode-bidi']
    return typeof val === 'string' ? val : undefined
  }
  return undefined
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
  mounted(el, binding, vnode) {
    const resolved = resolve(binding)
    const propDir = vnode?.props?.dir
    const domDir = el.getAttribute('dir')
    el[PREVIOUS_DIR] = propDir !== undefined
      ? String(propDir)
      : (domDir !== null && domDir !== resolved.dir ? domDir : null)

    const propBidi = readOwnStyleBidi(vnode)
    const domBidi = el.style.unicodeBidi
    el[PREVIOUS_BIDI] = propBidi !== undefined
      ? propBidi
      : (domBidi && (!resolved.isolate || domBidi !== 'isolate') ? domBidi : '')
    el[HAD_STYLE_ATTR] = vnode?.props?.style !== undefined || (el.hasAttribute('style') && Boolean(el[PREVIOUS_BIDI]))

    applyResolved(el, resolved)
    syncWatch(el, binding)
  },
  updated(el, binding) {
    applyResolved(el, resolve(binding))
    syncWatch(el, binding)
  },
  unmounted(el) {
    el[STOP_WATCH]?.()
    delete el[STOP_WATCH]
    const previousDir = el[PREVIOUS_DIR]
    if (previousDir === null || previousDir === undefined) el.removeAttribute('dir')
    else el.setAttribute('dir', previousDir)
    el.style.unicodeBidi = el[PREVIOUS_BIDI] ?? ''
    if (!el[HAD_STYLE_ATTR] && el.getAttribute('style') === '') {
      el.removeAttribute('style')
    }
    delete el[PREVIOUS_DIR]
    delete el[PREVIOUS_BIDI]
    delete el[HAD_STYLE_ATTR]
  },
}

/** Alias for `app.directive('rtl', vRtl)` registrations that prefer a name. */
export const rtlDirective: ObjectDirective<RtlElement, RtlDirectiveValue> = vRtl
