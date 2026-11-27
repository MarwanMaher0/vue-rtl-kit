# تنسيق المدد الزمنية

تُبنى مدة الفيديو وموعد التوصيل والمؤقّت عادةً بضمّ الأرقام إلى الكلمات يدويًا:

```ts
const label = `${hours} ساعة و ${minutes} دقيقة`
// '2 ساعة و 3 دقيقة'
```

وهذه ليست عربية سليمة. فالساعتان تُكتبان بصيغة المثنى `ساعتان` دون رقم، والدقائق الثلاث تأخذ الجمع `دقائق`، وإحدى عشرة دقيقة تعود إلى المفرد (`11 دقيقة`)، وواو العطف تلتصق بالكلمة التي بعدها، وقد تحتاج صفحة مصرية أو سعودية إلى `٣` حيث كتب القالب `3`. وبيانات CLDR تتضمن كل هذه الصيغ لكل لغة.

`formatDuration` دالة نقية (دون أي استيراد من Vue ودون أي وصول إلى DOM) تطلب هذه الصيغ من `Intl.DurationFormat`، ولها بديل مبني على `Intl.NumberFormat` و`Intl.ListFormat` في بيئات التشغيل التي لم تدعمه بعد.

```ts
import { formatDuration } from 'vue-rtl-kit'

const ar = { locale: 'ar', numberingSystem: 'latn' }
const eg = { locale: 'ar-EG', numberingSystem: 'arab' }

formatDuration({ hours: 2, minutes: 3 }, ar) // 'ساعتان و3 دقائق'
formatDuration({ hours: 11, minutes: 2 }, eg) // '١١ ساعة ودقيقتان'
formatDuration(3_723_000, { ...eg, style: 'digital' }) // '١:٠٢:٠٣'
```

المعامل الأول كائن من الوحدات (`years` و`months` و`weeks` و`days` و`hours` و`minutes` و`seconds` و`milliseconds`) أو عدد من الميلي ثانية. والمعامل الثاني اختياري؛ القيمة الافتراضية لـ `locale` هي `'en'` ولـ `style` هي `'long'`.

## صيغ الجمع العربية

يتغيّر الاسم العربي بتغيّر العدد: لا رقم مع الواحد والاثنين، والجمع من 3 إلى 10، والمفرد من 11 فما فوق، مع تنوين بعض الأسماء من 11 إلى 99.

| العدد | الساعات | الدقائق | الأيام |
| --- | --- | --- | --- |
| 1 | `ساعة` | `دقيقة` | `يوم` |
| 2 | `ساعتان` | `دقيقتان` | `يومان` |
| 3 | `3 ساعات` | `3 دقائق` | `3 أيام` |
| 10 | `10 ساعات` | `10 دقائق` | `10 أيام` |
| 11 | `11 ساعة` | `11 دقيقة` | `11 يومًا` |
| 100 | `100 ساعة` | `100 دقيقة` | `100 يوم` |

```ts
const ar = { locale: 'ar', numberingSystem: 'latn' }

formatDuration({ hours: 1 }, ar)   // 'ساعة'
formatDuration({ hours: 2 }, ar)   // 'ساعتان'
formatDuration({ hours: 3 }, ar)   // '3 ساعات'
formatDuration({ hours: 10 }, ar)  // '10 ساعات'
formatDuration({ hours: 11 }, ar)  // '11 ساعة'
formatDuration({ hours: 100 }, ar) // '100 ساعة'
formatDuration({ days: 11 }, ar)   // '11 يومًا'
```

ولكل لغة قواعدها. فللفارسية صيغة واحدة مع كل الأعداد، وللعبرية مثنى مع أغلب الوحدات، وكل لغة تربط الوحدات بطريقتها:

```ts
formatDuration({ days: 3, hours: 11 }, { locale: 'fa' }) // '۳ روز و ۱۱ ساعت'
formatDuration({ days: 2, hours: 2 }, { locale: 'he' })  // 'יומיים, שעתיים'
formatDuration({ days: 3, hours: 11 }, { locale: 'en' }) // '3 days, 11 hours'
```

الصيغ الناتجة هي صيغ الرفع التي توفّرها CLDR. وهي سليمة حين تُعرض قيمةً بجوار عنوان (`مدة التوصيل: يومان`)؛ أما بعد حرف الجر فتحتاج العربية إلى الجر (`خلال يومين`)، ولا توجد واجهة `Intl` تنتجه، فلا تضع المدة في ذلك الموضع.

## أشكال الأرقام

يحدد `numberingSystem` شكل الأرقام: `'latn'` للأرقام `0123`، و`'arab'` للأرقام `٠١٢٣`، و`'arabext'` للأرقام الفارسية `۰۱۲۳`. وعند غيابه تُستخدم أرقام اللغة نفسها، وهي تتبع إصدار CLDR في بيئة التشغيل: تستخدم `ar-EG` و`ar-SA` الأرقام العربية الهندية، أما `ar` المجردة فتستخدم الأرقام الغربية في المحركات الحديثة والأرقام العربية الهندية في المحركات الأقدم. لذا مرّر `numberingSystem` كلما اشترط التصميم شكلًا بعينه، ودائمًا حين تُعرض الصفحة على الخادم ثم تُفعَّل في المتصفح.

```ts
formatDuration({ days: 3, hours: 11 }, { locale: 'ar-EG' })                          // '٣ أيام و١١ ساعة'
formatDuration({ days: 3, hours: 11 }, { locale: 'ar-EG', numberingSystem: 'latn' }) // '3 أيام و11 ساعة'
formatDuration({ days: 3, hours: 11 }, { locale: 'ar-SA', numberingSystem: 'arab' }) // '٣ أيام و١١ ساعة'
formatDuration({ days: 3, hours: 11 }, { locale: 'ar', numberingSystem: 'arab' })    // '٣ أيام و١١ ساعة'
```

نظام الأرقام غير المعروف يعود إلى `'latn'`. وإذا تضمّن وسم اللغة امتداد `-u-nu-` فله الأولوية على هذا الخيار.

## الأنماط

| النمط | `ar` مع `latn` | `ar-EG` مع `arab` | `en` |
| --- | --- | --- | --- |
| `'long'` (الافتراضي) | `ساعة، و45 دقيقة، و30 ثانية` | `ساعة، و٤٥ دقيقة، و٣٠ ثانية` | `1 hour, 45 minutes, 30 seconds` |
| `'short'` | `1 س، و45 د، و30 ث` | `١ س، و٤٥ د، و٣٠ ث` | `1 hr, 45 min, 30 sec` |
| `'narrow'` | `1 س و45 د و30 ث` | `١ س و٤٥ د و٣٠ ث` | `1h 45m 30s` |
| `'digital'` | `1:45:30` | `١:٤٥:٣٠` | `1:45:30` |

```ts
const length = { hours: 1, minutes: 45, seconds: 30 }

formatDuration(length, { locale: 'ar', numberingSystem: 'latn', style: 'short' })     // '1 س، و45 د، و30 ث'
formatDuration(length, { locale: 'ar-EG', numberingSystem: 'arab', style: 'narrow' }) // '١ س و٤٥ د و٣٠ ث'
formatDuration(length, { locale: 'ar-EG', numberingSystem: 'arab', style: 'digital' }) // '١:٤٥:٣٠'
```

## الوحدات وموازنتها

يُكتب كائن الأعداد الصحيحة كما هو، مثلما يفعل `Intl.DurationFormat`. أما عدد الميلي ثانية فيُوازَن: يُقسَّم من الأيام نزولًا إلى الميلي ثانية. ويوازن `largestUnit` و`smallestUnit` الكائن أيضًا، ويحركان طرفي التقسيم.

```ts
const ar = { locale: 'ar', numberingSystem: 'latn' }

formatDuration({ minutes: 90 }, ar)                                    // '90 دقيقة' — يُكتب كما هو
formatDuration(5_400_000, ar)                                          // 'ساعة و30 دقيقة' — العدد يُوازَن
formatDuration({ minutes: 90 }, { ...ar, largestUnit: 'hours' })       // 'ساعة و30 دقيقة'
formatDuration({ days: 2, hours: 3 }, { ...ar, largestUnit: 'hours' }) // '51 ساعة' — تُضم الأيام إلى الساعات
formatDuration(5_531_000, { ...ar, smallestUnit: 'minutes' })          // 'ساعة و32 دقيقة' — تُقرَّب الثواني الإحدى عشرة
formatDuration(864_000_000, { ...ar, largestUnit: 'weeks' })           // 'أسبوع و3 أيام'
formatDuration(3_456_000_000, ar)                                      // '40 يومًا' — الأيام هي أكبر وحدة افتراضيًا
formatDuration(3_456_000_000, { ...ar, largestUnit: 'months', smallestUnit: 'days' }) // 'شهر و10 أيام'
```

- القيمة الافتراضية لـ `largestUnit` هي `'days'` مع العدد، وأكبر حقل غير صفري مع الكائن. والقيمة الافتراضية لـ `smallestUnit` هي `'milliseconds'`.
- لا تدخل الأسابيع في التقسيم إلا إذا تضمّن الكائن حقل `weeks` أو سمّاها أحد الخيارين.
- التحويلات 1000 ميلي ثانية و60 ثانية و60 دقيقة و24 ساعة و7 أيام و12 شهرًا دقيقة. ويُحسب الشهر 30.4375 يومًا والسنة 365.25 يومًا، فالتحويل بين الأشهر والأيام تقريبي؛ مرّر حقولًا محسوبة من التقويم حين يكون التاريخ مهمًا.
- ما يتبقى دون `smallestUnit` يُقرَّب إلى الأقرب، والنصف يُقرَّب بعيدًا عن الصفر. والوحدة التي يبلغ تقريبها وحدة كاملة مما فوقها تُرحَّل إليها، فتكون النتيجة `ساعة` لا `60 دقيقة`.

## maxUnits

يُبقي `maxUnits` هذا العدد من الوحدات، محسوبًا من أول وحدة غير صفرية، ويقرّب الأخيرة. وتتبع صيغة الجمع العدد بعد التقريب.

```ts
const ar = { locale: 'ar', numberingSystem: 'latn' }

formatDuration(5_531_000, ar)                      // 'ساعة، و32 دقيقة، و11 ثانية'
formatDuration(5_531_000, { ...ar, maxUnits: 2 })  // 'ساعة و32 دقيقة'
formatDuration(5_531_000, { ...ar, maxUnits: 1 })  // 'ساعتان' — ساعة و32 دقيقة تُقرَّب إلى المثنى
formatDuration(250_000_000, { ...ar, maxUnits: 1 }) // '3 أيام' — يومان و21 ساعة
formatDuration({ hours: 1, minutes: 59, seconds: 40 }, { ...ar, maxUnits: 2 }) // 'ساعتان' — التقريب يُرحَّل
formatDuration({ days: 1, minutes: 5 }, { ...ar, maxUnits: 2 })               // 'يوم' — الوحدتان هما الأيام والساعات
```

الوحدة الصفرية تدخل في العدّ: يوم وخمس دقائق مع `maxUnits: 2` تصير يومًا واحدًا، لأن الوحدة الثانية هي الساعات. ولا يُرفع الكائن فوق أكبر حقوله إلا إذا طلب `largestUnit` ذلك: فالكائن `{ minutes: 59, seconds: 59 }` مع `maxUnits: 1` يصير `60 دقيقة`، ويصير `ساعة` مع `largestUnit: 'hours'`.

## النمط الرقمي

يكتب `style: 'digital'` المدة بصيغة `h:mm:ss` بأرقام اللغة. تظهر الساعات دائمًا، وتُكمَّل الدقائق والثواني إلى خانتين، وتُضم الأيام والوحدات الأكبر إلى الساعات دون فواصل آلاف، وتُقرَّب الميلي ثانية إلى الثانية. ولا تُستخدم الخيارات `largestUnit` و`smallestUnit` و`maxUnits` معه.

```ts
formatDuration(125_000, { locale: 'ar-EG', numberingSystem: 'arab', style: 'digital' }) // '٠:٠٢:٠٥'
formatDuration(125_000, { locale: 'fa', style: 'digital' })                             // '۰:۰۲:۰۵'
formatDuration(59_500, { locale: 'ar', numberingSystem: 'latn', style: 'digital' })     // '0:01:00' — تقريب إلى الثانية
formatDuration({ days: 1, hours: 1, minutes: 1, seconds: 1 }, { locale: 'ar', numberingSystem: 'latn', style: 'digital' }) // '25:01:01'
```

الأرقام المفصولة بنقطتين تحافظ على ترتيب `h:mm:ss` حين تكون في سطر مستقل داخل بطاقة RTL، بشكلَي الأرقام كليهما. أما داخل جملة فضع الوقت في `<bdi>` أو [`<BidiText>`](/ar/guide/bidi-text) كأي مقطع رقمي آخر، حتى لا يعيد النص المحيط ترتيبه.

## القيم السالبة والكسرية والصفرية

```ts
const ar = { locale: 'ar', numberingSystem: 'latn' }

formatDuration({ hours: -3 }, { locale: 'en' })            // '-3 hours'
formatDuration({ hours: -1, minutes: -30 }, ar)            // '\u200E-ساعة و30 دقيقة' — إشارة واحدة في البداية
formatDuration({ hours: 1, minutes: -30 }, ar)             // '30 دقيقة' — تُجمع الإشارات المختلفة
formatDuration({ hours: 1.5 }, ar)                         // 'ساعة و30 دقيقة'
formatDuration({ days: 2.5 }, ar)                          // 'يومان و12 ساعة'
formatDuration(1500, { ...ar, smallestUnit: 'seconds' })   // 'ثانيتان' — ثانية ونصف تُقرَّب بعيدًا عن الصفر
formatDuration(0, ar)                                      // '0 ثانية'
formatDuration({ minutes: 0 }, ar)                         // '0 دقيقة'
formatDuration(20_000, { ...ar, smallestUnit: 'minutes' }) // '0 دقيقة' — تُقرَّب إلى الصفر
formatDuration(0, { ...ar, style: 'digital' })             // '0:00:00'
```

- **السالبة.** تُكتب إشارة المدة كلها مرة واحدة في البداية، بعلامة السالب الخاصة باللغة مع محرف الاتجاه المصاحب لها (`U+200E` قبل `-` في العربية بالأرقام الغربية، و`U+061C` بالأرقام العربية الهندية)؛ وتُنسَّق الوحدات دونها. أما `Intl.DurationFormat` وحده فيُسقط الإشارة في العربية والعبرية، لأن صيغتي المفرد والمثنى فيهما بلا رقم يحملها. والحقول المختلفة الإشارة تُجمع أولًا. والعدّ التنازلي الذي يجب ألا ينزل عن الصفر يحصر مدخله: `Math.max(0, remaining)`.
- **الكسرية.** يُرحَّل الكسر إلى الوحدات الأصغر، وما يتبقى دون `smallestUnit` يُقرَّب إلى الأقرب، والنصف بعيدًا عن الصفر.
- **الصفرية.** تُحذف الوحدات الصفرية. والمدة التي تساوي صفرًا أو تُقرَّب إليه تُكتب صفرًا من `smallestUnit`؛ وعند غياب هذا الخيار تُكتب صفرًا من أصغر حقل في الكائن، وصفرًا من الثواني مع العدد ومع `{}`. ولا يحمل الصفر إشارة أبدًا.

## داخل مكوّن

`formatDuration` دالة مستقلة: لا تقرأ مخزن الاتجاه، فمرّر لها اللغة الحالية، ومرّر نظام الأرقام إذا كان التطبيق يثبّت نظامًا بعينه. وفي Nuxt لا تُستورد تلقائيًا؛ استوردها من `vue-rtl-kit`.

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { formatDuration, useDirection } from 'vue-rtl-kit'

const props = defineProps<{ lengthMs: number, deliveryDays: number }>()
const { locale } = useDirection()

const length = computed(() =>
  formatDuration(props.lengthMs, { locale: locale.value, numberingSystem: 'arab', style: 'digital' }))
const delivery = computed(() =>
  formatDuration({ days: props.deliveryDays }, { locale: locale.value, numberingSystem: 'arab' }))
</script>

<template>
  <article class="card">
    <h3>مدة الفيديو</h3>
    <bdi>{{ length }}</bdi>
    <p>مدة التوصيل: {{ delivery }}</p>
  </article>
</template>
```

حين تكون قيمة `locale` هي `ar-EG`، يظهر فيديو مدته 12 دقيقة و34 ثانية وتوصيل مدته ثلاثة أيام هكذا: `٠:١٢:٣٤` و`مدة التوصيل: ٣ أيام`. ولا تلمس الدالة DOM أبدًا، فالاستدعاء نفسه يعمل في أي عرض SSR؛ والكلمات تأتي من بيانات `Intl` في بيئة التشغيل التي تنسّقها.

## الخيارات

```ts
type DurationUnit = 'years' | 'months' | 'weeks' | 'days' | 'hours' | 'minutes' | 'seconds' | 'milliseconds'
type DurationInput = Partial<Record<DurationUnit, number>>
type DurationStyle = 'long' | 'short' | 'narrow' | 'digital'

interface FormatDurationOptions {
  locale?: string // الافتراضي 'en'
  style?: DurationStyle // الافتراضي 'long'
  numberingSystem?: string // الافتراضي: أرقام اللغة نفسها
  largestUnit?: DurationUnit // الافتراضي 'days' مع العدد، وأكبر حقل غير صفري مع الكائن
  smallestUnit?: DurationUnit // الافتراضي 'milliseconds'
  maxUnits?: number // عدد صحيح لا يقل عن 1
}

function formatDuration(duration: DurationInput | number, options?: FormatDurationOptions): string
```

| الخيار | الافتراضي | الوصف |
| --- | --- | --- |
| `locale` | `'en'` | لغة BCP 47. يُقرأ `ar_EG` على أنه `ar-EG`؛ والوسم غير السليم يعود إلى رمز اللغة فيه ثم إلى `'en'` بدل رمي خطأ. |
| `style` | `'long'` | أسماء الوحدات `'long'` أو `'short'` أو `'narrow'`، أو `'digital'` لصيغة `h:mm:ss`. |
| `numberingSystem` | أرقام اللغة نفسها | `'latn'` أو `'arab'` أو `'arabext'` أو أي نظام أرقام آخر في CLDR؛ والنظام غير المعروف يعود إلى `'latn'`. |
| `largestUnit` | `'days'` مع العدد، وأكبر حقل غير صفري مع الكائن | أكبر وحدة تظهر؛ وما فوقها يُضم إليها. لا يُستخدم مع `'digital'`. |
| `smallestUnit` | `'milliseconds'` | أصغر وحدة تظهر؛ وما دونها يُقرَّب إليها. وهي أيضًا الوحدة التي تُكتب بها المدة الصفرية. لا يُستخدم مع `'digital'`. |
| `maxUnits` | كل الوحدات | إظهار هذا العدد من الوحدات على الأكثر، محسوبًا من أول وحدة غير صفرية، مع تقريب الأخيرة. لا يُستخدم مع `'digital'`. |

## البديل عند غياب Intl.DurationFormat

وصل `Intl.DurationFormat` إلى Chrome 129 وFirefox 136 وSafari 16.4 وNode.js 23. وحيث يغيب تسلك `formatDuration` الطريق الذي تصفه المواصفة نفسها: تُنسَّق كل وحدة عبر `Intl.NumberFormat` بنمط `style: 'unit'`، وهو الذي يختار صيغة الجمع والأرقام، ثم تُربط الوحدات عبر `Intl.ListFormat` بنوع `type: 'unit'`. وهذا هو المسار المتّبع دائمًا في Node.js 20 و22.

- مع `'long'` و`'short'` و`'narrow'` يعيد المساران السلسلة نفسها؛ ويقارن اختبار المتصفح بينهما في Chromium للغات `ar` و`ar-EG` و`ar-SA` و`fa` و`he` و`en`.
- مع `'digital'` يفصل البديل دائمًا بالنقطتين `:`. أما `Intl.DurationFormat` فيستخدم فاصل اللغة، وهو `:` أيضًا في العربية والفارسية والعبرية والإنجليزية، لكنه `.` في لغات قليلة (`1.02.03` في الفنلندية والدنماركية).
- يعمل البديل أيضًا حين يرفض `Intl.DurationFormat` قيمة خارج نطاقه، مثل خمسة مليارات سنة.
- يحتاج البديل إلى نمط الوحدات في `Intl.NumberFormat` (Chrome 77 وFirefox 78 وSafari 14.1) وإلى `Intl.ListFormat` (Chrome 72 وFirefox 78 وSafari 14.1). وتُحفظ المنسِّقات في ذاكرة مؤقتة صغيرة من نوع LRU، فلا يعاد إنشاؤها مع تكرار الاستدعاء.

الموازنة والتقريب والإشارة وقاعدة الصفر تُحسب قبل أي من المسارين، فلا تتأثر ببيئة التشغيل.

## المدخلات غير الصالحة

في بيئة التطوير ترمي المدخلات غير الصالحة خطأ `TypeError` يسمّي موضع الخلل. أما في الإنتاج (`NODE_ENV === 'production'` أو بناء متصفح بلا كائن `process` عام) فتعيد الدالة سلسلة فارغة، فتترك القيمة الخاطئة فراغًا بدل إسقاط العرض.

```ts
formatDuration(Number.NaN)                                              // TypeError في التطوير؛ '' في الإنتاج
formatDuration({ hour: 1 })                                             // TypeError — أسماء الوحدات بالجمع: hours
formatDuration({ hours: Number.POSITIVE_INFINITY })                     // TypeError — كل حقل يجب أن يكون عددًا منتهيًا
formatDuration(1000, { style: 'medium' })                               // TypeError — ليس نمطًا معروفًا
formatDuration(1000, { maxUnits: 0 })                                   // TypeError — عدد صحيح لا يقل عن 1
formatDuration(1000, { largestUnit: 'seconds', smallestUnit: 'hours' }) // TypeError — largestUnit هي الأصغر
```

المدخل غير الصالح هو: مدة ليست عددًا منتهيًا ولا كائنًا عاديًا من أعداد منتهية، أو اسم وحدة غير معروف، أو قيمة غير معروفة لـ `style` أو `largestUnit` أو `smallestUnit`، أو `largestUnit` أصغر من `smallestUnit`، أو `maxUnits` ليس عددًا صحيحًا لا يقل عن 1، أو `locale` ليس سلسلة نصية. أما وسم اللغة غير السليم فليس خطأ؛ بل يعود إلى البديل الموصوف أعلاه.

راجع [مرجع API](/ar/api#format-duration) للاطلاع على التوقيع الكامل.
