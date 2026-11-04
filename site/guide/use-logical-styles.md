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

`toLogical()` accepts `size` (default `false`) to include width/height mappings and `values` (default `true`) to convert values such as `textAlign: 'left'` to `'start'`.

`toPhysical()` follows the current scope and is useful for canvas, SVG, PDF, email, and legacy rendering paths that cannot consume logical CSS.
