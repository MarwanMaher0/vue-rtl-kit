# useLogicalStyles

Use `useLogicalStyles()` for direction-dependent styles and keyboard interactions computed in JavaScript. Ordinary responsive layout should use CSS logical properties directly.

```ts
function useLogicalStyles(): UseLogicalStylesReturn
```

## Return value

| Member | Signature | Purpose |
| --- | --- | --- |
| `dir` | `ComputedRef<Direction>` | Current scope direction. |
| `isRtl` | `ComputedRef<boolean>` | Whether the scope is RTL. |
| `startSide`, `endSide` | `ComputedRef<'left' \| 'right'>` | Resolved physical inline sides. |
| `sign` | `ComputedRef<1 \| -1>` | Horizontal multiplier for the current direction. |
| `toLogical` | `(style: StyleObject, options?: LogicalStyleOptions) => StyleObject` | Convert physical properties and directional values. |
| `toPhysical` | `(style: StyleObject, dir?: Direction) => StyleObject` | Resolve logical properties for the current direction. |
| `property` | `(name: string, options?: LogicalStyleOptions) => string` | Convert one property name. |
| `mirror` | `(value: number) => number` | Multiply an offset by `sign`. |
| `arrow` | `(event: KeyboardEvent) => LogicalArrow \| null` | Map an arrow, `Home`, or `End` key event to a logical step for the current scope. |

## Dynamic styles

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLogicalStyles } from 'vue-rtl-kit'

const offset = ref(24)
const { mirror, property, sign, toLogical, toPhysical } = useLogicalStyles()

const panelStyle = computed(() => toLogical({
  marginLeft: '16px',
  textAlign: 'left',
  width: '280px',
}, { size: true }))

const dragTransform = computed(() => `translateX(${mirror(offset.value)}px)`)
const physicalStyle = computed(() => toPhysical({ insetInlineStart: '12px' }))

console.log(property('padding-right')) // padding-inline-end
console.log(sign.value) // 1 or -1
console.log(dragTransform.value, physicalStyle.value)
</script>

<template>
  <aside :style="panelStyle">
    <span :style="{ transform: dragTransform }">Drag handle</span>
  </aside>
</template>
```

`toLogical()` accepts `size` (default `false`) to include width/height mappings, `values` (default `true`) to convert values such as `textAlign: 'left'` to `'start'`, and `shorthands` (default `false`) to expand physical shorthands into logical longhands.

`toPhysical()` follows the current scope and is useful for canvas, SVG, PDF, email, and legacy rendering paths that cannot consume logical CSS.

## Shorthands

Physical box shorthands are ambiguous without a direction: `margin: '1px 2px 3px 4px'` means top, right, bottom, left, which maps to different logical properties depending on how you think about the inline axis. Pass `{ shorthands: true }` to `toLogical()` to expand them:

```ts
toLogical({ margin: '1px 2px 3px 4px' }, { shorthands: true })
// {
//   marginBlockStart: '1px',
//   marginInlineEnd: '2px',
//   marginBlockEnd: '3px',
//   marginInlineStart: '4px',
// }
```

The option handles `margin`, `padding`, `inset`, `borderWidth`, `borderStyle`, `borderColor`, and `borderRadius`, accepting the usual 1–4-value CSS box forms as well as numeric values. Values containing `var()`, `calc()`, `!important`, or a top-level `border-radius: … / …` slash are left untouched. Other functions such as `rgb()`, `hsl()`, and `env()` are preserved, with values split only at top-level whitespace.

In the other direction, `toPhysical()` expands the 1- and 2-value logical shorthands to the physical sides for the given direction:

```ts
toPhysical({ marginInline: '1px 2px', insetBlock: '3px 4px' }, 'rtl')
// { marginRight: '1px', marginLeft: '2px', top: '3px', bottom: '4px' }
```

Supported logical shorthands are `marginInline`, `marginBlock`, `paddingInline`, `paddingBlock`, `insetInline`, `insetBlock`, `borderInlineWidth`/`Style`/`Color`, `borderBlockWidth`/`Style`/`Color`, `scrollMarginInline`/`Block`, and `scrollPaddingInline`/`Block`. Kebab-case keys keep their casing in the output.

## Keyboard navigation

In RTL, horizontal composite widgets — tabs, sliders, carousels, toolbars, and menubars — swap `ArrowLeft` and `ArrowRight` under the WAI-ARIA Authoring Practices Guide (APG), while `Home` and `End` remain `'first'` and `'last'` and vertical arrows stay unchanged.

`arrow(event)` resolves a `KeyboardEvent` against the current direction scope, so a widget inside `<RtlProvider dir="ltr">` on an RTL page still resolves LTR. It returns `null` for unrelated keys or whenever `Ctrl`, `Alt`, or `Meta` is held, leaving browser shortcuts such as `Alt+ArrowLeft` untouched while keeping `Shift` available for range selection or coarse slider steps.

| Key | In LTR | In RTL |
| --- | --- | --- |
| `ArrowRight` | `'next'` | `'previous'` |
| `ArrowLeft` | `'previous'` | `'next'` |
| `Home` | `'first'` | `'first'` |
| `End` | `'last'` | `'last'` |
| `ArrowUp` | `'up'` | `'up'` |
| `ArrowDown` | `'down'` | `'down'` |
| Other keys, or `Ctrl` / `Alt` / `Meta` held | `null` | `null` |

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useLogicalStyles } from 'vue-rtl-kit'

const tabs = ['Overview', 'Settings', 'Activity']
const active = ref(0)
const tabEls: (HTMLButtonElement | null)[] = []
const { arrow } = useLogicalStyles()

function onKeydown(event: KeyboardEvent) {
  const move = arrow(event)
  let next = active.value
  if (move === 'next') next = (active.value + 1) % tabs.length
  else if (move === 'previous') next = (active.value - 1 + tabs.length) % tabs.length
  else if (move === 'first') next = 0
  else if (move === 'last') next = tabs.length - 1
  else return

  event.preventDefault()
  active.value = next
  tabEls[next]?.focus()
}
</script>

<template>
  <div role="tablist" @keydown="onKeydown">
    <button
      v-for="(label, index) in tabs"
      :key="label"
      :ref="el => { tabEls[index] = el as HTMLButtonElement | null }"
      type="button"
      role="tab"
      :aria-selected="index === active"
      :tabindex="index === active ? 0 : -1"
    >
      {{ label }}
    </button>
  </div>
</template>
```

Outside component setup — in a state machine or standalone utility — call the pure `logicalArrow(key, dir)` helper directly:

```ts
import { logicalArrow } from 'vue-rtl-kit'

logicalArrow('ArrowRight', 'rtl') // 'previous'
logicalArrow('ArrowLeft', 'rtl') // 'next'
logicalArrow('Home', 'rtl') // 'first'
```

## Inline scrolling {#inline-scrolling}

In RTL, modern browsers start a horizontal scroller at `scrollLeft === 0` on the inline-start (right) edge and scroll into negative values toward the inline-end (left) edge. Carousel prev/next buttons, edge checks, and `scrollTo({ left })` calls written for LTR break on Arabic, Persian, and Hebrew pages.

`useInlineScroll(target, options?)` normalises inline scrolling into a single `0..max` scale in both directions, reads `getComputedStyle(el).direction` so `dir` islands, `v-rtl`, and `<RtlProvider>` all resolve automatically, attaches a passive `scroll` listener and `ResizeObserver`, re-reads when `target` or `useDirection().dir` changes, cleans up listeners on dispose, and is SSR-safe. Horizontal writing modes (`writing-mode: horizontal-tb`) only.

### `useInlineScroll` return value

| Member | Signature | Purpose |
| --- | --- | --- |
| `offset` | `Readonly<Ref<number>>` | Distance scrolled from inline-start in px, clamped to `0..max`. |
| `max` | `Readonly<Ref<number>>` | Maximum scrollable inline distance (`max(0, scrollWidth - clientWidth)`). |
| `atStart` | `Readonly<Ref<boolean>>` | `true` at (or within `tolerance` px of) inline-start, or when there is no overflow. |
| `atEnd` | `Readonly<Ref<boolean>>` | `true` at (or within `tolerance` px of) inline-end, or when there is no overflow. |
| `scrollTo` | `(offset: number, options?: ScrollInlineOptions) => void` | Clamp and scroll to an inline-start offset. |
| `scrollBy` | `(delta: number, options?: ScrollInlineOptions) => void` | Scroll by a signed inline delta (positive moves toward inline-end). |
| `scrollToStart` | `(options?: ScrollInlineOptions) => void` | Scroll to the inline-start edge (`0`). |
| `scrollToEnd` | `(options?: ScrollInlineOptions) => void` | Scroll to the inline-end edge (`max`). |

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useInlineScroll } from 'vue-rtl-kit'

const track = ref<HTMLElement | null>(null)
const { atStart, atEnd, scrollBy, scrollToStart, scrollToEnd } = useInlineScroll(track)
</script>

<template>
  <button type="button" :disabled="atStart" @click="scrollToStart({ behavior: 'smooth' })">
    Start
  </button>
  <button type="button" :disabled="atStart" @click="scrollBy(-240, { behavior: 'smooth' })">
    Previous
  </button>
  <div ref="track" style="display: flex; overflow-x: auto">
    <slot />
  </div>
  <button type="button" :disabled="atEnd" @click="scrollBy(240, { behavior: 'smooth' })">
    Next
  </button>
  <button type="button" :disabled="atEnd" @click="scrollToEnd({ behavior: 'smooth' })">
    End
  </button>
</template>
```

Outside component setup, import the pure, tree-shakeable helpers directly (zero Vue imports, horizontal writing modes only). No overflow reports `0` and `{ atStart: true, atEnd: true }`; `null` targets, SSR, `NaN`, and `Infinity` return `0` or act as a no-op and never throw:

```ts
import {
  getScrollInline,
  getScrollInlineMax,
  scrollByInline,
  scrollInlineEdges,
  scrollToInline,
} from 'vue-rtl-kit'

const offset = getScrollInline(el)
const max = getScrollInlineMax(el)
const { atStart, atEnd } = scrollInlineEdges(el, 1)
scrollToInline(el, max, { behavior: 'smooth' })
scrollByInline(el, -240, { behavior: 'smooth' })
```
