import type { PropType, VNode, VNodeChild } from 'vue'
import { Comment, Fragment, Text, computed, defineComponent, h } from 'vue'
import { detectDirection, isolateRuns, splitBidiRuns } from '../bidi'
import { useDirection } from '../composables/useDirection'
import type { Direction } from '../types'

/**
 * Pull plain text out of a slot's vnodes.
 *
 * Returns `null` as soon as the slot holds anything other than text, comments
 * and fragments, so markup a caller passed in is handed back untouched rather
 * than silently flattened.
 */
function slotText(nodes: VNodeChild[] | undefined): string | null {
  if (!nodes?.length) return null
  let text = ''

  const walk = (list: VNodeChild[]): boolean => {
    for (const node of list) {
      if (node == null || typeof node === 'boolean') continue
      if (typeof node === 'string' || typeof node === 'number') {
        text += String(node)
        continue
      }
      if (Array.isArray(node)) {
        if (!walk(node)) return false
        continue
      }
      const vnode = node as VNode
      if (vnode.type === Comment) continue
      if (vnode.type === Text) {
        text += String(vnode.children ?? '')
        continue
      }
      if (vnode.type === Fragment && Array.isArray(vnode.children)) {
        if (!walk(vnode.children as VNodeChild[])) return false
        continue
      }
      return false
    }
    return true
  }

  return walk(nodes) ? text : null
}

/**
 * Render mixed-direction text without letting the bidi algorithm reorder it.
 *
 * The problem, concretely: inside an Arabic paragraph the browser resolves
 * neutral characters - hyphens, dots, slashes, colons, spaces - against the
 * paragraph direction. `12-05-2024` is therefore *displayed* as `2024-05-12`,
 * `v1.2.3` as `3.2.1`, and `example.com/ar/pricing` ends up with its segments
 * shuffled. The string in memory is correct, which is exactly why the bug gets
 * past review and reaches users.
 *
 * `<BidiText>` splits the text into directional runs and wraps each run that
 * runs against the base direction in an isolate, so the browser resolves it on
 * its own. Neutral characters on a boundary are deliberately left outside the
 * isolate, so a trailing comma or full stop stays with the Arabic sentence.
 *
 * Runs of digits with no internal punctuation are left alone - a bare `2024`
 * renders the same either way, and wrapping it would only add noise.
 *
 * @example
 * <!-- broken: renders as "2024-05-12" -->
 * <p>آخر تحديث 12-05-2024</p>
 *
 * <!-- correct -->
 * <BidiText as="p" text="آخر تحديث 12-05-2024" />
 */
export const BidiText = defineComponent({
  name: 'BidiText',
  props: {
    /** The text to render. Falls back to the default slot's text content. */
    text: { type: String, default: undefined },
    /** Element to render. Default `'span'`. */
    as: { type: String, default: 'span' },
    /**
     * Base direction of the surrounding paragraph. Defaults to the current
     * scope. `'auto'` detects it from the text's first strong character.
     */
    dir: {
      type: String as PropType<Direction | 'auto' | undefined>,
      default: undefined,
    },
    /**
     * `'element'` wraps runs in `<bdi>` - the DOM equivalent of an isolate, and
     * the default, because the characters never end up in copied text.
     * `'chars'` inserts U+2066/U+2067 ... U+2069 instead, for when the output
     * has to survive as a plain string.
     */
    strategy: {
      type: String as PropType<'element' | 'chars'>,
      default: 'element',
      validator: (value: string) => value === 'element' || value === 'chars',
    },
    /**
     * Set `false` to render the raw text untouched. Useful for demonstrating
     * the bug, and for A/B-ing a fix in production.
     */
    enabled: { type: Boolean, default: true },
  },
  setup(props, { slots }) {
    const scope = useDirection()

    const children = computed(() => slots.default?.())
    const fromSlot = computed(() => slotText(children.value))
    const source = computed(() => props.text ?? fromSlot.value ?? '')

    const baseDir = computed<Direction>(() => {
      if (props.dir === 'auto') return detectDirection(source.value, scope.dir.value)
      return props.dir ?? scope.dir.value
    })

    const runs = computed(() => splitBidiRuns(source.value, baseDir.value))

    return () => {
      const attrs: Record<string, unknown> = {}
      if (props.dir) attrs.dir = props.dir === 'auto' ? 'auto' : props.dir

      const usingSlotMarkup = props.text === undefined && fromSlot.value === null

      if (!props.enabled || usingSlotMarkup) {
        return h(props.as, attrs, props.text === undefined ? children.value : source.value)
      }

      if (props.strategy === 'chars') {
        return h(props.as, attrs, isolateRuns(source.value, baseDir.value))
      }

      return h(
        props.as,
        attrs,
        runs.value.map(run => (run.isolated ? h('bdi', { dir: run.dir }, run.text) : run.text)),
      )
    }
  },
})

export default BidiText
