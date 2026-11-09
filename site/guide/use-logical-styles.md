# useLogicalStyles

Use `useLogicalStyles()` for direction-dependent values computed in JavaScript. Ordinary responsive layout should use CSS logical properties directly.

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
| `toPhysical` | `(style: StyleObject) => StyleObject` | Resolve logical properties for the current direction. |
| `property` | `(name: string, options?: LogicalStyleOptions) => string` | Convert one property name. |
| `mirror` | `(value: number) => number` | Multiply an offset by `sign`. |

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
