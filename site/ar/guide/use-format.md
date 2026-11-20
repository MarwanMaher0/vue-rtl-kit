# useFormat

تربط `useFormat()` منسّقات الأرقام والعملات والتواريخ والقوائم والأزمنة النسبية، ومحلّل الأرقام `parseNumber()`، بلغة النطاق الحالي واتجاهه. كما تطبّق إعداد `numberingSystem` المضبوط على نسخة `createRtl()` الجذرية.

```ts
function useFormat(): ComputedRef<BoundFormatters>
```

```vue
<script setup lang="ts">
import { useFormat } from 'vue-rtl-kit'

const format = useFormat()
const updatedAt = new Date('2024-05-12T12:00:00Z')

console.log(format.value.formatNumber(1234.5))
</script>

<template>
  <dl>
    <dt>Total</dt>
    <dd>{{ format.formatCurrency(2500, 'EGP') }}</dd>
    <dt>Updated</dt>
    <dd>{{ format.formatDate(updatedAt, { dateStyle: 'long' }) }}</dd>
    <dt>Reviewers</dt>
    <dd>{{ format.formatList(['Ahmed', 'Sara', 'Omar'], { isolate: true }) }}</dd>
    <dt>Edited</dt>
    <dd>{{ format.formatRelativeTime(-3, 'day') }}</dd>
  </dl>
</template>
```

يُفك المرجع المحسوب داخل القوالب. أما في الشيفرة البرمجية، فاستدعِ التوابع عبر `format.value`.

## BoundFormatters

| العضو | التوقيع |
| --- | --- |
| `locale` | `string` |
| `dir` | `Direction` |
| `formatNumber` | `(value: number, options?: NumberFormatOptions) => string` |
| `formatCurrency` | `(value: number, currency: string, options?: NumberFormatOptions) => string` |
| `formatDate` | `(value: Date \| number \| string, options?: DateFormatOptions) => string` |
| `formatList` | `(items: Iterable<string>, options?: ListFormatOptions) => string` |
| `formatRelativeTime` | `(value: number, unit: Intl.RelativeTimeFormatUnit, options?: RelativeTimeFormatOptions) => string` |
| `parseNumber` | `(text: string, options?: ParseNumberOptions) => number` |

تتجاوز الخيارات المقدّمة في كل استدعاء اللغة ونظام الأرقام المرتبطين. ويُعاد حساب المنسّقات المرتبطة عندما يغيّر `setLocale()` لغة النطاق. يوسّع كل من `NumberFormatOptions` و`DateFormatOptions` و`ListFormatOptions` و`RelativeTimeFormatOptions` خيارات `Intl` المقابلة بما يلي:

| الخيار | النوع | التأثير |
| --- | --- | --- |
| `locale` | `string` | وسم لغة وفق BCP-47. |
| `numberingSystem` | `NumberingSystem` | مثل `'latn'` أو `'arab'` أو `'arabext'`. |
| `isolate` | `boolean \| DirectionOrAuto` | يلف النتيجة المنسّقة داخل معزل Unicode. تستخدم القيمة `true` اكتشاف أول اتجاه قوي. |

```ts
const isolated = format.value.formatDate(updatedAt, {
  locale: 'ar-EG',
  numberingSystem: 'latn',
  dateStyle: 'long',
  isolate: 'ltr',
})
```

## القوائم والأزمنة النسبية

تغلّف `formatList()` الواجهة `Intl.ListFormat` وتقبل خياري `type` (`'conjunction'` و`'disjunction'` و`'unit'`) و`style`. وتغلّف `formatRelativeTime()` الواجهة `Intl.RelativeTimeFormat` وتقبل خياري `numeric` و`style`؛ وتدل القيم السالبة على الماضي. تستخدم الدالتان اللغة ونظام الأرقام المرتبطين، لذا تحصل اللغات العربية على أداة العطف العربية والأرقام العربية الهندية ما لم يُضبط `numberingSystem: 'latn'`.

عند ضبط `isolate`، تنسّق `formatList()` العناصر كما هي أولًا، فتبقى أدوات العطف التي تتبع العنصر التالي صحيحة (`e`/`u` في الإسبانية و`ו` في العبرية)، ثم تلف كل عنصر في النتيجة داخل معزل يعتمد أول حرف قوي، فلا يتبادل اسم لاتيني موضعه مع الأسماء العربية المجاورة، ثم تعزل النتيجة كاملة بالاتجاه المطلوب.

```ts
formatList(['Ahmed', 'Sara', 'Omar'], { locale: 'ar' }) // 'Ahmed وSara وOmar'
formatList(['PDF', 'CSV'], { locale: 'en', type: 'disjunction' }) // 'PDF or CSV'
formatRelativeTime(-3, 'day', { locale: 'ar-EG' }) // 'قبل ٣ أيام'
formatRelativeTime(-3, 'day', { locale: 'ar-EG', numberingSystem: 'latn' }) // 'قبل 3 أيام'
formatRelativeTime(1, 'day', { locale: 'en', numeric: 'auto' }) // 'tomorrow'

// Each item gets its own first-strong isolate, then the whole list is isolated.
format.value.formatList(['Ahmed Ali', 'سارة'], { isolate: 'rtl' })
```

## تحليل الأرقام {#parsing-numbers}

`parseNumber()` هي معكوس `formatNumber()` لمدخلات النماذج. تعيد `Number()` القيمة `NaN` لما تكتبه `formatNumber()` في `ar-EG` أو `fa-IR` أو `he` أو `de` أو `fr`، بسبب الأرقام أو الفواصل أو علامة اتجاه غير مرئية قبل إشارة السالب. تقرأ `parseNumber()` ذلك النص وتعيده عددًا، وتعيد `NaN` بدلًا من رمي استثناء حين لا يكون النص عددًا.

```ts
function parseNumber(text: string, options?: ParseNumberOptions): number

interface ParseNumberOptions {
  locale?: string
  numberingSystem?: NumberingSystem
}
```

يُقرأ فاصل المجموعات والفاصلة العشرية وإشارة السالب من `formatToParts()` في `Intl.NumberFormat` بحسب اللغة ونظام الأرقام، وتُخزَّن النتيجة مؤقتًا لكل وسم لغة؛ فلا يوجد جدول فواصل مكتوب يدويًا. مرّر قيمتي `locale` و`numberingSystem` نفسيهما اللتين تنسّق بهما. أما `format.value.parseNumber()` المرتبطة فتفعل ذلك تلقائيًا.

- **الأرقام**: تُقرأ الأرقام الغربية (`0-9`) والعربية الهندية (`٠-٩`) والفارسية (`۰-۹`) في كل لغة، ومعها أرقام نظام الأرقام الخاص باللغة.
- **المحارف المتجاهَلة**: تُحذف أولًا علامات الاتجاه U+061C وU+200E وU+200F، ومحارف العزل من U+2066 إلى U+2069، والمسافة غير الفاصلة، والمسافة الضيقة غير الفاصلة U+202F، والمسافات العادية. يشمل ذلك العلامات التي تضيفها `Intl`، ومحارف العزل التي يضيفها `isolate: true`، والمسافات المستخدمة لفصل المجموعات. لا تُحذف محارف التضمين والتجاوز (من U+202A إلى U+202E)، لأن التجاوز قد يعرض `12` لنص يُقرأ `21`.
- **الإشارة**: تجعل الشرطة العادية أو U+2212 أو إشارة السالب الخاصة باللغة العدد سالبًا إذا جاءت في أوله. ويُسمح بعلامة `+` في أوله.
- **النسبة المئوية**: تقسم العلامة `%` أو `٪` (U+066A) في آخر النص الناتج على 100. تُنقل الفاصلة العشرية نقلًا دقيقًا، فتعطي `5.6%` القيمة `0.056`.
- **فواصل المجموعات**: تُقبل بين رقمين من الجزء الصحيح فقط. لا يُتحقق من أحجام المجموعات، لذا يُقرأ التجميع الهندي في `en-IN` مثل `12,34,567`، ويُقرأ `1,2` أيضًا (على أنه `12`). وفي `de` يُقرأ `1.5` على أنه `15` لأن `.` فاصل مجموعات.
- **المسافة فاصلًا للمجموعات**: حين تفصل اللغة المجموعات بمسافة، كما في `fr` و`sv`، تُعد المسافة العادية أو غير الفاصلة أو الضيقة غير الفاصلة بين رقمين فاصل مجموعات وتخضع للقاعدة نفسها، فيُقرأ `1 234,5` ويعطي `1,2 3` القيمة `NaN`. أما المسافات في أي موضع آخر، كالتي تسبق علامة النسبة المئوية، فتبقى متجاهَلة.
- **الفاصلة العشرية**: واحدة على الأكثر. يُقبل `.5` و`5.` كما تقبلهما `Number()`.
- **`NaN`**: للسلسلة الفارغة، والحروف، ورموز العملات، والأسس مثل `1e5`، وفاصل لا تستخدمه اللغة، وفاصلة عشرية ثانية، وفاصل منفرد، وإشارة أو علامة نسبة مئوية في غير موضعها، وكل ما ليس سلسلة نصية.

```ts
parseNumber('١٬٢٣٤٫٥', { locale: 'ar-EG' }) // 1234.5
parseNumber('۱٬۲۳۴٫۵', { locale: 'fa-IR' }) // 1234.5
parseNumber('1.234,5', { locale: 'de' }) // 1234.5
parseNumber('1 234,5', { locale: 'fr' }) // 1234.5
parseNumber('12,34,567.89', { locale: 'en-IN' }) // 1234567.89
parseNumber('1,234.5', { locale: 'ar-EG', numberingSystem: 'latn' }) // 1234.5
parseNumber('١٢٫٥٪', { locale: 'ar-EG' }) // 0.125
parseNumber('-12.5%') // -0.125
parseNumber('+٤٢', { locale: 'ar-EG' }) // 42

parseNumber('') // NaN
parseNumber('12abc') // NaN
parseNumber('1.2.3') // NaN
parseNumber(',') // NaN
parseNumber('1,234.5', { locale: 'de' }) // NaN: the group separator comes after the decimal
parseNumber('1,2 3', { locale: 'fr' }) // NaN: fr groups with a space, here after the decimal
parseNumber('1,234.5', { locale: 'ar-EG' }) // NaN: ar-EG separates with ٬ and ٫

// The round trip holds with isolate and with percent output.
const text = formatNumber(-1234567.89, { locale: 'ar-EG', isolate: true })
parseNumber(text, { locale: 'ar-EG' }) // -1234567.89
```

اللغة العربية المنسّقة بالأرقام العربية الهندية تفصل بالعلامتين `٬` و`٫`، لذا لا يُعد `1,234.5` عددًا فيها. أما الأعداد الصحيحة المكتوبة بأرقام غربية فتُقرأ. إذا أردت أن يقبل الحقل الفواصل الغربية، فحلّل باستخدام `numberingSystem: 'latn'`، أو اضبطه مرة واحدة في `createRtl()` ليتوافق التنسيق والتحليل.

اربط نص حقل الإدخال واقرأ العدد من قيمة محسوبة:

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useFormat } from 'vue-rtl-kit'

const format = useFormat()
const text = ref('')
const amount = computed(() => format.value.parseNumber(text.value))
const invalid = computed(() => text.value !== '' && Number.isNaN(amount.value))
</script>

<template>
  <input v-model="text" inputmode="decimal" :aria-invalid="invalid">
</template>
```

## معالجة المدخلات غير الصالحة

تُحوَّل الشرطات السفلية في وسوم اللغة إلى شرطات، لذا تُنسَّق `ar_EG` كما لو كانت `ar-EG`. إذا كان الوسم غير صالح، يحاول المنسّق استخدام وسم اللغة الفرعي ثم يعود إلى `en`. يُدرج نظام الأرقام قبل قسم الاستخدام الخاص `-x-`، لذا ينتج `en-x-foo` مع `numberingSystem: 'arab'` أرقامًا عربية، بينما تعود قيم `numberingSystem` غير المعروفة أو الفارغة بأمان إلى `'latn'`. وتعيد `formatDate()` سلسلة فارغة للتواريخ غير الصالحة بدلًا من رمي استثناء، وكذلك تفعل `formatRelativeTime()` مع القيم غير المنتهية مثل `NaN` و`Infinity`. تستخدم `parseNumber()` البدائل نفسها للغة ونظام الأرقام، وتعيد `NaN` للنص الذي لا تستطيع قراءته.

```ts
formatNumber(12, { locale: 'ar_EG' }) // '١٢'
formatNumber(12, { locale: 'en-x-foo', numberingSystem: 'arab' }) // '١٢'
formatNumber(12, { locale: 'ar-EG', numberingSystem: 'invalid' }) // '12'
formatDate('not a date') // ''
formatRelativeTime(NaN, 'day') // ''
parseNumber('١٢', { locale: 'ar_EG' }) // 12
parseNumber('not a number') // NaN
```

## مساعدات مستقلة

يمكن استخدام أساسيات التنسيق نفسها دون سياق مكوّن:

```ts
import {
  formatCurrency,
  formatDate,
  formatList,
  formatNumber,
  formatRelativeTime,
  parseNumber,
  transliterateDigits,
  withNumberingSystem,
} from 'vue-rtl-kit'

formatNumber(1234.5, { locale: 'ar-EG', numberingSystem: 'latn' })
formatCurrency(2500, 'EGP', { locale: 'ar-EG' })
formatDate('2024-05-12', { locale: 'ar-SA', calendar: 'islamic-umalqura' })
formatList(['PDF', 'CSV'], { locale: 'en', type: 'disjunction' })
formatRelativeTime(2, 'hour', { locale: 'ar-EG' })
parseNumber('١٬٢٣٤٫٥', { locale: 'ar-EG' })
transliterateDigits('طلب رقم 4821', 'arab')
withNumberingSystem('ar-EG', 'latn')
```
