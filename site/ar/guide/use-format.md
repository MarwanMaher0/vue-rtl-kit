# useFormat

تربط `useFormat()` منسّقات الأرقام والعملات والتواريخ والقوائم والأزمنة النسبية بلغة النطاق الحالي واتجاهه. كما تطبّق إعداد `numberingSystem` المضبوط على نسخة `createRtl()` الجذرية.

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

## معالجة المدخلات غير الصالحة

تُحوَّل الشرطات السفلية في وسوم اللغة إلى شرطات، لذا تُنسَّق `ar_EG` كما لو كانت `ar-EG`. إذا كان الوسم غير صالح، يحاول المنسّق استخدام وسم اللغة الفرعي ثم يعود إلى `en`. يُدرج نظام الأرقام قبل قسم الاستخدام الخاص `-x-`، لذا ينتج `en-x-foo` مع `numberingSystem: 'arab'` أرقامًا عربية، بينما تعود قيم `numberingSystem` غير المعروفة أو الفارغة بأمان إلى `'latn'`. وتعيد `formatDate()` سلسلة فارغة للتواريخ غير الصالحة بدلًا من رمي استثناء، وكذلك تفعل `formatRelativeTime()` مع القيم غير المنتهية مثل `NaN` و`Infinity`.

```ts
formatNumber(12, { locale: 'ar_EG' }) // '١٢'
formatNumber(12, { locale: 'en-x-foo', numberingSystem: 'arab' }) // '١٢'
formatNumber(12, { locale: 'ar-EG', numberingSystem: 'invalid' }) // '12'
formatDate('not a date') // ''
formatRelativeTime(NaN, 'day') // ''
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
  transliterateDigits,
  withNumberingSystem,
} from 'vue-rtl-kit'

formatNumber(1234.5, { locale: 'ar-EG', numberingSystem: 'latn' })
formatCurrency(2500, 'EGP', { locale: 'ar-EG' })
formatDate('2024-05-12', { locale: 'ar-SA', calendar: 'islamic-umalqura' })
formatList(['PDF', 'CSV'], { locale: 'en', type: 'disjunction' })
formatRelativeTime(2, 'hour', { locale: 'ar-EG' })
transliterateDigits('طلب رقم 4821', 'arab')
withNumberingSystem('ar-EG', 'latn')
```
