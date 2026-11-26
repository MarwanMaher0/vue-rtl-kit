import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'
import { computed, shallowRef, toValue, watch } from 'vue'
import { isClient } from '../env'
import type { LogicalPlacement, PhysicalPlacement } from '../placement'
import { resolvePlacement } from '../placement'
import type { Direction } from '../types'
import { useDirection } from './useDirection'

function computedDirection(el: HTMLElement): Direction | undefined {
  const direction = el.ownerDocument.defaultView?.getComputedStyle(el).direction
  if (direction === 'rtl' || direction === 'ltr') return direction
}

/**
 * Resolve a reactive placement against the anchor's computed direction. Without
 * a mounted anchor (including during SSR), use the current direction scope.
 */
export function useLogicalPlacement(
  placement: MaybeRefOrGetter<LogicalPlacement>,
  target?: Ref<HTMLElement | null>,
): ComputedRef<PhysicalPlacement> {
  const { dir } = useDirection()
  const observed = shallowRef<{ el: HTMLElement; direction: Direction | undefined }>()

  if (isClient && target) {
    watch([target, dir], ([el], _previous, onCleanup) => {
      if (!el) {
        observed.value = undefined
        return
      }

      const sync = () => {
        const direction = computedDirection(el)
        if (observed.value?.el !== el || observed.value.direction !== direction) {
          observed.value = { el, direction }
        }
      }
      sync()

      const Observer = el.ownerDocument.defaultView?.MutationObserver
      if (!Observer) return

      // Watch only the anchor and its inheritance chain, not the whole page.
      // Child-list changes can move the anchor; dir="auto" also depends on text.
      const observe = () => {
        observer.disconnect()
        for (let node: HTMLElement | null = el; node; node = node.parentElement) {
          const auto = node.dir === 'auto'
          observer.observe(node, {
            attributes: true,
            attributeFilter: ['dir', 'class', 'style'],
            childList: true,
            subtree: auto,
            characterData: auto,
          })
        }
      }
      const observer = new Observer((records) => {
        if (records.some(record => record.type === 'childList' || record.attributeName === 'dir')) observe()
        sync()
      })
      observe()
      onCleanup(() => observer.disconnect())
    }, { immediate: true, flush: 'post' })
  }

  return computed(() => {
    const el = target?.value
    const snapshot = observed.value
    const direction = isClient && el
      ? (snapshot?.el === el ? snapshot.direction : computedDirection(el))
      : undefined
    return resolvePlacement(toValue(placement), direction ?? dir.value)
  })
}
