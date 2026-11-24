# useLogicalStyles

استخدم `useLogicalStyles()` للأنماط وتفاعلات لوحة المفاتيح المعتمدة على الاتجاه والمحسوبة في JavaScript. أما التخطيط المتجاوب العادي، فينبغي أن يستخدم خصائص CSS المنطقية مباشرةً.

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
| `toPhysical` | `(style: StyleObject, dir?: Direction) => StyleObject` | يحل الخصائص المنطقية وفق الاتجاه الحالي. |
| `property` | `(name: string, options?: LogicalStyleOptions) => string` | يحوّل اسم خاصية واحدًا. |
| `mirror` | `(value: number) => number` | يضرب الإزاحة في `sign`. |
| `arrow` | `(event: KeyboardEvent) => LogicalArrow \| null` | يحوّل حدث مفتاح سهم أو `Home` أو `End` إلى خطوة منطقية وفق النطاق الحالي. |

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

## التنقل بلوحة المفاتيح

في اتجاه RTL، تعكس عناصر الواجهة الأفقية المركّبة — مثل علامات التبويب وأشرطة التمرير والعروض الدوّارة وشرائط القوائم — دلالة `ArrowLeft` و`ArrowRight` وفق إرشادات ممارسات التأليف WAI-ARIA APG، بينما يبقى `Home` و`End` بمعنى الأول والأخير (`'first'` و`'last'`) وتبقى الأسهم العمودية دون تغيير.

تحل الدالة `arrow(event)` كائن `KeyboardEvent` وفق نطاق الاتجاه الحالي؛ لذلك فإن عنصرًا داخل `<RtlProvider dir="ltr">` في صفحة RTL يُعامَل باتجاه LTR تلقائيًا. وتُعيد `null` للمفاتيح غير ذات الصلة أو عند الضغط مع `Ctrl` أو `Alt` أو `Meta`، مما يحافظ على اختصارات المتصفح مثل `Alt+ArrowLeft` ويترك `Shift` متاحًا لتحديد النطاقات أو القفزات الكبيرة في المنزلقات.

| المفتاح | في LTR | في RTL |
| --- | --- | --- |
| `ArrowRight` | `'next'` | `'previous'` |
| `ArrowLeft` | `'previous'` | `'next'` |
| `Home` | `'first'` | `'first'` |
| `End` | `'last'` | `'last'` |
| `ArrowUp` | `'up'` | `'up'` |
| `ArrowDown` | `'down'` | `'down'` |
| أي مفتاح آخر أو مع `Ctrl` / `Alt` / `Meta` | `null` | `null` |

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useLogicalStyles } from 'vue-rtl-kit'

const tabs = ['نظرة عامة', 'الإعدادات', 'السجل']
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

وخارج `setup` في المكونات — كما في آلات الحالة أو الدوال المستقلة — استدعِ الدالة النقية `logicalArrow(key, dir)` مباشرةً:

```ts
import { logicalArrow } from 'vue-rtl-kit'

logicalArrow('ArrowRight', 'rtl') // 'previous'
logicalArrow('ArrowLeft', 'rtl') // 'next'
logicalArrow('Home', 'rtl') // 'first'
```

## التمرير السطري {#inline-scrolling}

في اتجاه RTL، تبدأ المتصفحات الحديثة عنصر التمرير الأفقي عند `scrollLeft === 0` في حافة بداية السطر (اليمين) ثم تتجه إلى قيم سالبة نحو حافة نهاية السطر (اليسار). لذلك تتعطل أزرار السابق والتالي في العروض الدوّارة، وفحوصات الوصول إلى النهاية، واستدعاءات `scrollTo({ left })` المكتوبة بافتراض LTR على الصفحات العربية والفارسية والعبرية.

توحّد `useInlineScroll(target, options?)` إحداثيات التمرير السطري ضمن مقياس واحد من `0` إلى `max` في كلا الاتجاهين، وتقرأ `getComputedStyle(el).direction` بحيث تعمل جزر `dir` والتوجيه `v-rtl` ومكوّن `<RtlProvider>` تلقائيًا، وتربط مستمع `scroll` خاملًا (`passive`) ومراقب `ResizeObserver`، وتعيد القراءة عند تغيّر `target` أو `useDirection().dir`، وتزيل المستمعات عند التخلص من النطاق، كما أنها آمنة مع SSR. مخصصة لأوضاع الكتابة الأفقية (`writing-mode: horizontal-tb`) فقط.

### القيمة المعادة من `useInlineScroll`

| العضو | التوقيع | الغرض |
| --- | --- | --- |
| `offset` | `Readonly<Ref<number>>` | المسافة المقطوعة من بداية السطر بالبكسل، محصورة بين `0` و`max`. |
| `max` | `Readonly<Ref<number>>` | أقصى مسافة تمرير سطرية (`max(0, scrollWidth - clientWidth)`). |
| `atStart` | `Readonly<Ref<boolean>>` | تكون `true` عند بداية السطر (ضمن هامش `tolerance` بالبكسل) أو عند غياب الفيض. |
| `atEnd` | `Readonly<Ref<boolean>>` | تكون `true` عند نهاية السطر (ضمن هامش `tolerance` بالبكسل) أو عند غياب الفيض. |
| `scrollTo` | `(offset: number, options?: ScrollInlineOptions) => void` | تحصر الإزاحة وتمرّر إلى موضع مقاس من بداية السطر. |
| `scrollBy` | `(delta: number, options?: ScrollInlineOptions) => void` | تمرّر بمقدار نسبي (القيمة الموجبة تتجه نحو نهاية السطر). |
| `scrollToStart` | `(options?: ScrollInlineOptions) => void` | تمرّر إلى حافة بداية السطر (`0`). |
| `scrollToEnd` | `(options?: ScrollInlineOptions) => void` | تمرّر إلى حافة نهاية السطر (`max`). |

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useInlineScroll } from 'vue-rtl-kit'

const track = ref<HTMLElement | null>(null)
const { atStart, atEnd, scrollBy, scrollToStart, scrollToEnd } = useInlineScroll(track)
</script>

<template>
  <button type="button" :disabled="atStart" @click="scrollToStart({ behavior: 'smooth' })">
    البداية
  </button>
  <button type="button" :disabled="atStart" @click="scrollBy(-240, { behavior: 'smooth' })">
    السابق
  </button>
  <div ref="track" style="display: flex; overflow-x: auto">
    <slot />
  </div>
  <button type="button" :disabled="atEnd" @click="scrollBy(240, { behavior: 'smooth' })">
    التالي
  </button>
  <button type="button" :disabled="atEnd" @click="scrollToEnd({ behavior: 'smooth' })">
    النهاية
  </button>
</template>
```

وخارج `setup` في المكونات، استورد الدوال النقية القابلة لاقتطاع الشجرة مباشرةً (دون أي استيراد من Vue، ولأوضاع الكتابة الأفقية فقط). عند غياب الفيض تُعيد `0` و`{ atStart: true, atEnd: true }`؛ كما أن تمرير `null` أو التشغيل على الخادم أو تمرير `NaN` أو `Infinity` يعيد `0` أو لا ينفّذ شيئًا دون رمي استثناء أبدًا:

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
