# useFormat

تربط `useFormat()` منسّقات الأرقام والعملات والتواريخ والقوائم والأزمنة النسبية وصيغ الجمع، ومنسّقي النطاقات `formatDateRange()` و`formatNumberRange()`، ومساعد أسماء العرض `formatDisplayName()`، ومحلّل الأرقام `parseNumber()`، بلغة النطاق الحالي واتجاهه. كما تطبّق إعداد `numberingSystem` المضبوط على نسخة `createRtl()` الجذرية. ويتبع التابعان `compareText()` و`sortByLocale()` لغة النطاق عند المقارنة والفرز.

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
| `formatNumberRange` | `(start: number \| bigint, end: number \| bigint, options?: NumberFormatOptions) => string` |
| `formatDate` | `(value: Date \| number \| string, options?: DateFormatOptions) => string` |
| `formatDateRange` | `(start: Date \| number \| string, end: Date \| number \| string, options?: DateFormatOptions) => string` |
| `formatList` | `(items: Iterable<string>, options?: ListFormatOptions) => string` |
| `formatRelativeTime` | `(value: number, unit: Intl.RelativeTimeFormatUnit, options?: RelativeTimeFormatOptions) => string` |
| `formatPlural` | `(count: number, forms: PluralForms, options?: FormatPluralOptions) => string` |
| `formatDisplayName` | `(code: string, options: FormatDisplayNameOptions) => string` |
| `parseNumber` | `(text: string, options?: ParseNumberOptions) => number` |
| `compareText` | `(a: string, b: string, options?: CompareOptions) => number` |
| `sortByLocale` | `<T>(items: readonly T[], options?: CompareOptions & { key?: (item: T) => string }) => T[]` |

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

## نطاقات التواريخ والأرقام {#ranges}

تغلّف `formatDateRange()` و`formatNumberRange()` الدالتين `Intl.DateTimeFormat.prototype.formatRange` و`Intl.NumberFormat.prototype.formatRange`. فضمّ قيمتين منسّقتين بشرطة — وهي الطريقة المختصرة الشائعة في واجهات الحجز والجداول الزمنية والأسعار — يكرّر الشهر أو العملة المشتركة، ويستخدم فاصل نطاقات خاطئًا بالنسبة للغة، ويكسر الترتيب البصري في RTL: فالشرطة العادية بين الأرقام الغربية تُبقي النطاق كله مقطعًا لاتينيًا واحدًا، فيظهر طرف البداية على اليسار داخل بطاقة RTL. أما `formatRange` فتطبّق نمط النطاقات الخاص باللغة نفسه: تُدمج الأجزاء المشتركة، ويُحسم الفاصل (شرطة en، أو `تا` في الفارسية) حسمًا صحيحًا داخل فقرة RTL، فيُقرأ طرف البداية أولًا من اليمين.

```ts
function formatDateRange(
  start: Date | number | string,
  end: Date | number | string,
  options?: DateFormatOptions,
): string

function formatNumberRange(
  start: number | bigint,
  end: number | bigint,
  options?: NumberFormatOptions,
): string
```

تقبل `formatDateRange()` كائن `Date` أو طابعًا زمنيًا أو سلسلة ISO لكل طرف، وتقبل الخيارات نفسها الخاصة بـ`formatDate()` — بما فيها `calendar` و`timeZone`. وتقبل `formatNumberRange()` أطرافًا من النوع `number` أو `bigint`، وتقبل الخيارات نفسها الخاصة بـ`formatNumber()` (العملات والوحدات والصيغة المضغوطة). وتتشارك الدالتان ذاكرتي منسّقات `formatDate` / `formatNumber` الموجودتين، فاستدعاء النطاق يعيد استخدام نسخة `Intl` نفسها ولا يضيف مفتاحًا جديدًا إلى `formatterCacheStats()`.

```ts
formatDateRange('2024-03-03', '2024-03-05', { locale: 'ar-EG', dateStyle: 'long', timeZone: 'UTC' }) // '٣–٥ مارس ٢٠٢٤' — one month, one year
formatDateRange('2024-03-03', '2024-03-05', { locale: 'en', dateStyle: 'long', timeZone: 'UTC' }) // 'March 3 – 5, 2024'
formatDateRange('2024-03-03', '2024-03-05', { locale: 'fa', dateStyle: 'long', timeZone: 'UTC' }) // '۱۳ تا ۱۵ اسفند ۱۴۰۲'
formatDateRange('2023-12-30', '2024-01-02', { locale: 'ar-EG', dateStyle: 'long', timeZone: 'UTC' }) // '٣٠ ديسمبر ٢٠٢٣ – ٢ يناير ٢٠٢٤'

formatNumberRange(100, 250, { locale: 'ar-EG', numberingSystem: 'latn' }) // '100–250'
formatNumberRange(100, 250, { locale: 'ar-EG', numberingSystem: 'latn', style: 'currency', currency: 'EGP' }) // one ج.م. symbol for the whole range
formatNumberRange(5, 12, { locale: 'en', style: 'unit', unit: 'kilometer' }) // '5–12 km'
formatNumberRange(1200, 3500, { locale: 'en', notation: 'compact' }) // '1.2K – 3.5K'
formatNumberRange(10n, 25n, { locale: 'en' }) // '10–25'

// Bound to the scope locale and the configured numbering system.
format.value.formatDateRange(checkIn, checkOut, { dateStyle: 'long' })
format.value.formatNumberRange(minPrice, maxPrice, { style: 'currency', currency: 'EGP' })
```

- **النطاقات المعكوسة**: حين تكون `start` أكبر من `end` يُنسَّق النطاق كما هو، تمامًا مثل `Intl` — دون رمي استثناء ودون تبديل صامت.
- **الطرفان المتساويان**: تدمجهما `Intl` — فنطاق اليوم الواحد يطبع تاريخًا واحدًا، والعددان المتساويان يستخدمان نمط التقريب الخاص باللغة (مثل `~100` في الإنجليزية).
- **المدخلات غير الصالحة**: التاريخ غير الصالح أو العدد غير المنتهي (`NaN` أو `Infinity`) يرمي `TypeError` في التطوير ويعيد سلسلة فارغة في الإنتاج.
- **البديل**: في بيئات التشغيل بلا `formatRange`، يُنسَّق الطرفان ويُضمّان بفاصل النطاقات الخاص باللغة — شرطة en محاطة بمسافتين للتواريخ (` تا ` في الفارسية)، وشرطة en بلا مسافات للأرقام — ويُلفّ كل طرف في معزل يعتمد أول حرف قوي (FSI ... PDI) كي يحافظ الطرفان على ترتيب القراءة داخل فقرة RTL.

## صيغ الجمع {#plural-forms}

تختار `formatPlural()` صيغة الرسالة المناسبة للعدد عبر `Intl.PluralRules`، بدلًا من `n === 1 ? singular : plural` الخاطئة في العربية: فللعربية ست فئات جمع، والعدد `11` يأخذ فئة `many` لا `few`. وللعبرية فئة `two`، وتعدّ الفارسية `0` ضمن `one`، أما الترتيبية الإنجليزية (`1st` و`2nd` و`3rd`) فمجموعة قواعد مختلفة أيضًا.

```ts
function formatPlural(count: number, forms: PluralForms, options?: FormatPluralOptions): string

interface PluralForms extends Partial<Record<'zero' | 'one' | 'two' | 'few' | 'many' | 'other', string>> {
  other: string
}

type FormatPluralOptions = FormatOptionsBase & { type?: 'cardinal' | 'ordinal' }
```

يربط `forms` فئات الجمع في CLDR بنصوص الرسائل؛ و`other` هي الصيغة الوحيدة المطلوبة، وتعود إليها أي فئة لا صيغة خاصة بها. ويُستبدل كل `{count}` في الصيغة المختارة بقيمة `formatNumber(count, options)`، فيُطبَّق نظام الأرقام المرتبط ويلفّ `isolate` العدد داخل الجملة. أما النص الذي لا يحتوي `{count}` فيُعاد كما هو.

| العدد (`ar`) | الفئة | صيغة المثال |
| --- | --- | --- |
| `0` | `zero` | `لا ملفات` |
| `1` | `one` | `ملف واحد` |
| `2` | `two` | `ملفان` |
| `3`–`10` | `few` | `{count} ملفات` |
| `11`–`99` | `many` | `{count} ملفًا` |
| `100`، `101`، … | `other` | `{count} ملف` |

```ts
const files = {
  zero: 'لا ملفات',
  one: 'ملف واحد',
  two: 'ملفان',
  few: '{count} ملفات',
  many: '{count} ملفًا',
  other: '{count} ملف',
}

formatPlural(0, files, { locale: 'ar' }) // 'لا ملفات'
formatPlural(1, files, { locale: 'ar' }) // 'ملف واحد'
formatPlural(2, files, { locale: 'ar' }) // 'ملفان'
formatPlural(3, files, { locale: 'ar' }) // '3 ملفات'
formatPlural(11, files, { locale: 'ar' }) // '11 ملفًا'
formatPlural(100, files, { locale: 'ar' }) // '100 ملف'
formatPlural(3, files, { locale: 'ar-EG' }) // '٣ ملفات'
formatPlural(11, files, { locale: 'ar-EG', numberingSystem: 'latn' }) // '11 ملفًا'

// Missing categories fall back to other.
formatPlural(11, { other: '{count} ملف' }, { locale: 'ar' }) // '11 ملف'

// Ordinal rules: English 1st, 2nd, 3rd, 4th…
formatPlural(3, { few: '{count}rd', other: '{count}th' }, { type: 'ordinal' }) // '3rd'

// Bound to the scope locale and the configured numbering system.
format.value.formatPlural(11, files)
```

تختار القيم `NaN` و`Infinity` والسالبة والكسرية الفئة التي تعلنها `Intl.PluralRules` (غالبًا `other`) دون رمي استثناء. وتعيد الدالة سلسلة فارغة حين تكون `forms.other` فارغة أو حين لا تتوفر `Intl.PluralRules` في بيئة التشغيل. وتُخزَّن نسخ القواعد مؤقتًا لكل لغة و`type` في ذاكرة LRU المحدودة نفسها الخاصة بسائر المنسّقات.

## أسماء العرض {#display-names}

تغلّف `formatDisplayName()` الواجهة `Intl.DisplayNames` كي تعرض قوائم اختيار اللغات والبلدان الأسماء بلغة الصفحة بدل الإنجليزية: `العربية` بدل `Arabic`، و`مصر` بدل `Egypt`.

```ts
function formatDisplayName(code: string, options: FormatDisplayNameOptions): string

interface FormatDisplayNameOptions {
  type: 'language' | 'region' | 'currency' | 'script' | 'calendar' | 'dateTimeField'
  locale?: string
  style?: 'long' | 'short' | 'narrow'
  languageDisplay?: 'dialect' | 'standard'
  fallback?: 'code' | 'none'
}
```

الخيار `type` مطلوب ويحدد ما يدل عليه الرمز. يقصّر `style` الاسم حين تملك اللغة صيغة أقصر؛ ويخص `languageDisplay` النوع `type: 'language'` وحده — تفضّل القيمة `'dialect'` (الافتراضية) أسماء اللهجات مثل "American English"، وتركّب `'standard'` صيغة "English (United States)".

```ts
formatDisplayName('ar', { type: 'language', locale: 'ar' }) // 'العربية'
formatDisplayName('fa', { type: 'language', locale: 'fa' }) // 'فارسی'
formatDisplayName('he', { type: 'language', locale: 'he' }) // 'עברית'
formatDisplayName('EG', { type: 'region', locale: 'ar' }) // 'مصر'
formatDisplayName('EGP', { type: 'currency', locale: 'ar' }) // 'جنيه مصري'
formatDisplayName('Arab', { type: 'script', locale: 'en' }) // 'Arabic'
formatDisplayName('ar-EG', { type: 'language', locale: 'en', languageDisplay: 'standard' }) // 'Arabic (Egypt)'
```

يعيد الرمز غير المعروف الرمز نفسه (`fallback: 'code'`، وهو الافتراضي) أو سلسلة فارغة (`fallback: 'none'`). أما الرمز غير الصالح بنيويًا، أو بيئة تشغيل بلا `Intl.DisplayNames`، فيعيدان البديل نفسه بدل رمي استثناء. وتحصل وسوم اللغة على تحويل الشرطات السفلية وبدائل وسم اللغة الفرعي / `en` نفسها الخاصة بسائر المنسّقات، وتُخزَّن النسخ مؤقتًا لكل لغة وخيارات في ذاكرة LRU المحدودة نفسها.

تتبع `format.value.formatDisplayName()` المرتبطة استدعاءات `setLocale()`، فتسمّي الرموز افتراضيًا بلغة النطاق الحالي. لكن قائمة اختيار اللغات تريد عادةً الأسماء الذاتية — تسمية كل خيار بلغته هو مهما كانت اللغة الحالية — لذا مرّر `locale: tag` في كل استدعاء. أسماء العرض كلمات لا أرقام: لا ينطبق عليها `numberingSystem` المرتبط ولا `isolate`.

```vue
<script setup lang="ts">
import { useDirection, useFormat } from 'vue-rtl-kit'

const { locale, setLocale } = useDirection()
const format = useFormat()
const locales = ['ar', 'en', 'fa', 'he']
</script>

<template>
  <select :value="locale" @change="setLocale($event.target.value)">
    <option v-for="tag in locales" :key="tag" :value="tag">
      {{ format.formatDisplayName(tag, { type: 'language', locale: tag }) }}
    </option>
  </select>
</template>
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

لتحويل الأرقام في الحقل أثناء الكتابة، استخدم [`v-digits`](/ar/guide/v-digits). أمّا إذا أردت إبقاء النص كما كتبه المستخدم وقراءة قيمته العددية على حدة، فاربط نص الحقل واقرأ العدد من قيمة محسوبة:

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

## الفرز حسب اللغة {#locale-aware-sorting}

يتبع التابعان `format.value.compareText()` و`format.value.sortByLocale()` لغة النطاق الحالي. استدعِهما عبر `format.value` داخل دالة `computed()` لإعادة الفرز عند تغيير اللغة باستخدام `setLocale()`. وللفرز بحسب لغة أخرى دون تغيير لغة النطاق، مرّر وسم لغة أو مصفوفة وسوم مرتّبة حسب الأولوية لذلك الاستدعاء.

```ts
import { computed } from 'vue'
import { useFormat } from 'vue-rtl-kit'

const format = useFormat()
const contacts = [{ name: 'سارة' }, { name: 'بدر' }, { name: 'ليلى' }]
const sortedContacts = computed(() =>
  format.value.sortByLocale(contacts, { key: (contact) => contact.name }),
)

format.value.compareText('طلب ٢', 'طلب ١٠', { locale: ['ar-EG', 'ar', 'en'] }) < 0 // true
```

يعتمد التابعان على اللغة، لا على اتجاه العرض أو إعداد `numberingSystem`. افتراضيًا يحذفان التشكيل العربي والتطويل فقط قبل المقارنة، وتظلّ أشكال الهمزة والمدّة خاضعة لقواعد الفرز في اللغة المحدّدة. راجع [الفرز حسب اللغة في دوال النص](/ar/guide/text-helpers#locale-aware-sorting) لمعرفة طريقة مقارنة الأرقام والتعامل مع المفاتيح الفارغة واستخدام الدالتين المستقلتين.

## معالجة المدخلات غير الصالحة

تُحوَّل الشرطات السفلية في وسوم اللغة إلى شرطات، لذا تُنسَّق `ar_EG` كما لو كانت `ar-EG`. إذا كان الوسم غير صالح، يحاول المنسّق استخدام وسم اللغة الفرعي ثم يعود إلى `en`. يُدرج نظام الأرقام قبل قسم الاستخدام الخاص `-x-`، لذا ينتج `en-x-foo` مع `numberingSystem: 'arab'` أرقامًا عربية، بينما تعود قيم `numberingSystem` غير المعروفة أو الفارغة بأمان إلى `'latn'`. وتعيد `formatDate()` سلسلة فارغة للتواريخ غير الصالحة بدلًا من رمي استثناء، وكذلك تفعل `formatRelativeTime()` مع القيم غير المنتهية مثل `NaN` و`Infinity`. وتستخدم `formatDateRange()` و`formatNumberRange()` بدائل اللغة نفسها، لكنهما ترفضان التاريخ غير الصالح أو العدد غير المنتهي برمي `TypeError` في التطوير وسلسلة فارغة في الإنتاج. وتستخدم `formatPlural()` بدائل اللغة نفسها، وتعيد سلسلة فارغة حين تكون `forms.other` فارغة أو حين لا تتوفر `Intl.PluralRules`. وتستخدم `formatDisplayName()` بدائل اللغة نفسها، وتعيد الرمز نفسه (أو `''` مع `fallback: 'none'`) للرموز غير المعروفة أو غير الصالحة وفي بيئات التشغيل بلا `Intl.DisplayNames`. تستخدم `parseNumber()` البدائل نفسها للغة ونظام الأرقام، وتعيد `NaN` للنص الذي لا تستطيع قراءته.

```ts
formatNumber(12, { locale: 'ar_EG' }) // '١٢'
formatNumber(12, { locale: 'en-x-foo', numberingSystem: 'arab' }) // '١٢'
formatNumber(12, { locale: 'ar-EG', numberingSystem: 'invalid' }) // '12'
formatDate('not a date') // ''
formatRelativeTime(NaN, 'day') // ''
formatPlural(1, { other: '' }) // ''
formatDisplayName('zz', { type: 'language' }) // 'zz'
formatDisplayName('!!', { type: 'region', fallback: 'none' }) // ''
parseNumber('١٢', { locale: 'ar_EG' }) // 12
parseNumber('not a number') // NaN
```

## مساعدات مستقلة

يمكن استخدام أساسيات التنسيق نفسها دون سياق مكوّن:

```ts
import {
  formatCurrency,
  formatDate,
  formatDateRange,
  formatDisplayName,
  formatList,
  formatNumber,
  formatNumberRange,
  formatPlural,
  formatRelativeTime,
  parseNumber,
  transliterateDigits,
  withNumberingSystem,
} from 'vue-rtl-kit'

formatNumber(1234.5, { locale: 'ar-EG', numberingSystem: 'latn' })
formatCurrency(2500, 'EGP', { locale: 'ar-EG' })
formatDate('2024-05-12', { locale: 'ar-SA', calendar: 'islamic-umalqura' })
formatDateRange('2024-03-03', '2024-03-05', { locale: 'ar-EG', dateStyle: 'long', timeZone: 'UTC' })
formatNumberRange(100, 250, { locale: 'ar-EG', style: 'currency', currency: 'EGP' })
formatList(['PDF', 'CSV'], { locale: 'en', type: 'disjunction' })
formatRelativeTime(2, 'hour', { locale: 'ar-EG' })
formatPlural(2, { one: '{count} يوم', other: '{count} أيام' }, { locale: 'ar' })
formatDisplayName('ar', { type: 'language', locale: 'ar' })
parseNumber('١٬٢٣٤٫٥', { locale: 'ar-EG' })
transliterateDigits('طلب رقم 4821', 'arab')
withNumberingSystem('ar-EG', 'latn')
```
