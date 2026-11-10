# useFormat

تربط `useFormat()` منسّقات الأرقام والعملات والتواريخ بلغة النطاق الحالي واتجاهه. كما تطبّق إعداد `numberingSystem` المضبوط على نسخة `createRtl()` الجذرية.

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

تتجاوز الخيارات المقدّمة في كل استدعاء اللغة ونظام الأرقام المرتبطين. يوسّع كل من `NumberFormatOptions` و`DateFormatOptions` خيارات `Intl` المقابلة بما يلي:

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

## معالجة المدخلات غير الصالحة

تُحوَّل الشرطات السفلية في وسوم اللغة إلى شرطات، لذا تُنسَّق `ar_EG` كما لو كانت `ar-EG`. إذا كان الوسم غير صالح، يحاول المنسّق استخدام وسم اللغة الفرعي ثم يعود إلى `en`. يُدرج نظام الأرقام قبل قسم الاستخدام الخاص `-x-`، لذا ينتج `en-x-foo` مع `numberingSystem: 'arab'` أرقامًا عربية. وتعيد `formatDate()` سلسلة فارغة للتواريخ غير الصالحة بدلًا من رمي استثناء.

```ts
formatNumber(12, { locale: 'ar_EG' }) // '١٢'
formatNumber(12, { locale: 'en-x-foo', numberingSystem: 'arab' }) // '١٢'
formatDate('not a date') // ''
```

## مساعدات مستقلة

يمكن استخدام أساسيات التنسيق نفسها دون سياق مكوّن:

```ts
import {
  formatCurrency,
  formatDate,
  formatNumber,
  transliterateDigits,
  withNumberingSystem,
} from 'vue-rtl-kit'

formatNumber(1234.5, { locale: 'ar-EG', numberingSystem: 'latn' })
formatCurrency(2500, 'EGP', { locale: 'ar-EG' })
formatDate('2024-05-12', { locale: 'ar-SA', calendar: 'islamic-umalqura' })
transliterateDigits('طلب رقم 4821', 'arab')
withNumberingSystem('ar-EG', 'latn')
```
