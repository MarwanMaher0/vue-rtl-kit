import type { PropType, SlotsType, VNode } from 'vue'
import { computed, defineComponent, h, provide, watch } from 'vue'
import { useDirection } from '../composables/useDirection'
import { createDirectionState } from '../context'
import { directionScopeKey } from '../keys'
import { directionOfLocale } from '../locale'
import type { Direction, DirectionContext } from '../types'

/**
 * Scope a subtree to its own direction.
 *
 * An RTL page is almost never entirely RTL. Documentation has code samples,
 * dashboards have log output, settings screens have file paths and API keys.
 * `<RtlProvider>` gives that subtree a real direction - both the `dir`
 * attribute the browser needs and the reactive context `useDirection()`,
 * `useLogicalStyles()` and `<BidiText>` read - without disturbing the page.
 *
 * `setDirection` / `toggleDirection` obtained inside the scope affect the scope
 * only. To flip the whole page from within one, use `useRtl()`.
 *
 * @example
 * <RtlProvider dir="ltr" tag="pre">
 *   <code>git checkout -b feature/rtl</code>
 * </RtlProvider>
 *
 * @example
 * <RtlProvider locale="ar" v-slot="{ isRtl, toggleDirection }">
 *   <button @click="toggleDirection">{{ isRtl ? 'LTR' : 'RTL' }}</button>
 * </RtlProvider>
 */
export const RtlProvider = defineComponent({
  name: 'RtlProvider',
  props: {
    /** Direction for the subtree. Defaults to the direction of `locale`. */
    dir: {
      type: String as PropType<Direction | undefined>,
      default: undefined,
      validator: (value: string) => value === 'rtl' || value === 'ltr',
    },
    /** Locale for the subtree. Sets `lang`, and `dir` when `dir` is omitted. */
    locale: { type: String, default: undefined },
    /**
     * Element to render. `null` renders the slot with no wrapper - the context
     * still applies, but nothing carries the `dir` attribute, so only do it
     * when the children set their own.
     */
    tag: { type: [String, null] as PropType<string | null>, default: 'div' },
    /**
     * Add `unicode-bidi: isolate`, so the subtree cannot influence the
     * ordering of the text around it. Default `true`.
     */
    isolate: { type: Boolean, default: true },
  },
  slots: Object as SlotsType<{
    default: (props: {
      dir: Direction
      isRtl: boolean
      setDirection: (dir: Direction) => void
      toggleDirection: () => Direction
    }) => VNode[]
  }>,
  setup(props, { slots }) {
    const parent = useDirection()

    const initialDir: Direction = props.dir
      ?? (props.locale ? directionOfLocale(props.locale, parent.dir.value) : parent.dir.value)

    const state = createDirectionState({
      dir: initialDir,
      locale: props.locale ?? parent.locale.value,
      pinned: true,
    })

    // Props stay authoritative: changing `dir`/`locale` from outside overrides
    // whatever the scope did to itself, and an omitted `dir` keeps following
    // the parent scope.
    watch(() => props.dir, (next) => { if (next) state.dir.value = next })
    watch(() => props.locale, (next) => {
      if (!next) return
      state.locale.value = next
      if (!props.dir) state.dir.value = directionOfLocale(next, state.dir.value)
    })
    watch(() => parent.dir.value, (next) => {
      if (!props.dir && !props.locale) state.dir.value = next
    })

    const scope: DirectionContext = { ...state, isRoot: false }
    provide(directionScopeKey, scope)

    const slotProps = computed(() => ({
      dir: state.dir.value,
      isRtl: state.isRtl.value,
      setDirection: state.setDirection,
      toggleDirection: state.toggleDirection,
    }))

    return () => {
      const children = slots.default?.(slotProps.value)
      if (!props.tag) return children
      return h(
        props.tag,
        {
          'dir': state.dir.value,
          'lang': state.locale.value,
          'style': props.isolate ? { unicodeBidi: 'isolate' } : undefined,
          'data-rtl-scope': '',
        },
        children,
      )
    }
  },
})

export default RtlProvider
