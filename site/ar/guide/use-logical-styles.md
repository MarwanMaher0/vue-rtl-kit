# useLogicalStyles

```ts
function useLogicalStyles(): UseLogicalStylesReturn
```

استخدم هذا الـcomposable للقيم المعتمدة على الاتجاه والمحسوبة في JavaScript. أما التخطيط المتجاوب العادي، فينبغي أن يستخدم خصائص CSS المنطقية مباشرةً.

## القيمة المعادة

| العضو | التوقيع | الغرض |
| --- | --- | --- |
| `dir` | `ComputedRef<Direction>` | اتجاه النطاق الحالي. |
| `isRtl` | `ComputedRef<boolean>` | يحدد ما إذا كان النطاق RTL. |
| `startSide`, `endSide` | `ComputedRef<'left' \| 'right'>` | الجانبان الماديان المحلولان لبداية السطر ونهايته. |
| `sign` | `ComputedRef<1 \| -1>` | معامل الضرب الأفقي للاتجاه الحالي. |
| `toLogical` | `(style: StyleObject, options?: LogicalStyleOptions) => StyleObject` | يحوّل الخصائص المادية والقيم الاتجاهية. |
| `toPhysical` | `(style: StyleObject) => StyleObject` | يحل الخصائص المنطقية وفق الاتجاه الحالي. |
| `property` | `(name: string, options?: LogicalStyleOptions) => string` | يحوّل اسم خاصية واحدًا. |
| `mirror` | `(value: number) => number` | يضرب الإزاحة في `sign`. |

## الأنماط الديناميكية

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

تقبل `toLogical()` الخيار `size` (الافتراضي `false`) لتضمين تعيينات العرض والارتفاع، والخيار `values` (الافتراضي `true`) لتحويل قيم مثل `textAlign: 'left'` إلى `'start'`.

تتبع `toPhysical()` النطاق الحالي، وهي مفيدة لمسارات عرض canvas وSVG وPDF والبريد الإلكتروني والأنظمة القديمة التي لا تستطيع استهلاك CSS المنطقي.
