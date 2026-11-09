# useLogicalStyles

استخدم `useLogicalStyles()` للقيم المعتمدة على الاتجاه والمحسوبة في JavaScript. أما التخطيط المتجاوب العادي، فينبغي أن يستخدم خصائص CSS المنطقية مباشرةً.

```ts
function useLogicalStyles(): UseLogicalStylesReturn
```

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

تقبل `toLogical()` الخيار `size` (الافتراضي `false`) لتضمين تعيينات العرض والارتفاع، والخيار `values` (الافتراضي `true`) لتحويل قيم مثل `textAlign: 'left'` إلى `'start'`، والخيار `shorthands` (الافتراضي `false`) لتوسيع الخصائص المختصرة المادية إلى خصائص منطقية طويلة.

تتبع `toPhysical()` النطاق الحالي، وهي مفيدة لمسارات عرض canvas وSVG وPDF والبريد الإلكتروني والأنظمة القديمة التي لا تستطيع استهلاك CSS المنطقي.

## الخصائص المختصرة

الخصائص المختصرة المادية للصندوق غامضة من دون اتجاه: `margin: '1px 2px 3px 4px'` تعني أعلى، يمين، أسفل، يسار، وهي تتعيّن إلى خصائص منطقية مختلفة حسب طريقة التفكير في المحور السطري. مرّر `{ shorthands: true }` إلى `toLogical()` لتوسيعها:

```ts
toLogical({ margin: '1px 2px 3px 4px' }, { shorthands: true })
// {
//   marginBlockStart: '1px',
//   marginInlineEnd: '2px',
//   marginBlockEnd: '3px',
//   marginInlineStart: '4px',
// }
```

يتعامل الخيار مع `margin` و`padding` و`inset` و`borderWidth` و`borderStyle` و`borderColor` و`borderRadius`، ويقبل صيغ الصندوق المعتادة ذات القيمة إلى أربع قيم وكذلك القيم الرقمية. تُترك القيم التي تحتوي على `var()` أو `calc()` أو `!important` أو شرطة مائلة في المستوى الأعلى من `border-radius: … / …` دون تغيير. وتُحفظ الدوال الأخرى مثل `rgb()` و`hsl()` و`env()`، مع تقسيم القيم عند المسافات في المستوى الأعلى فقط.

وفي الاتجاه الآخر، يوسّع `toPhysical()` الخصائص المنطقية المختصرة ذات القيمة أو القيمتين إلى الجوانب المادية وفق الاتجاه المعطى:

```ts
toPhysical({ marginInline: '1px 2px', insetBlock: '3px 4px' }, 'rtl')
// { marginRight: '1px', marginLeft: '2px', top: '3px', bottom: '4px' }
```

الخصائص المنطقية المختصرة المدعومة هي `marginInline` و`marginBlock` و`paddingInline` و`paddingBlock` و`insetInline` و`insetBlock` و`borderInlineWidth`/`Style`/`Color` و`borderBlockWidth`/`Style`/`Color` و`scrollMarginInline`/`Block` و`scrollPaddingInline`/`Block`. وتحافظ المفاتيح المكتوبة بصيغة kebab-case على صيغتها في الناتج.
