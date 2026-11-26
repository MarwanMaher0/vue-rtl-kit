# دوال النص

تتعامل هذه الدوال المستقلة مع عزل Unicode واتجاه اللغة والبحث النصي من جهة العميل والفرز حسب اللغة دون مكوّن أو DOM. وهي آمنة في العرض على الخادم، أو وحدة أدوات، أو سلسلة على وشك النسخ.

```ts
import {
  detectDirection,
  directionOfLocale,
  findSearchMatches,
  foldSearchText,
  hasRtlCharacters,
  isolate,
  isolateRuns,
  matchesSearch,
  resolveDirection,
  splitBidiRuns,
  stripBidiControls,
} from 'vue-rtl-kit'
```

## `isolate(text, dir?)`

تلتف الدالة حول السلسلة كاملة بعزل واحد. تُصدر القيمة الافتراضية `'auto'` المحرف FSI وتترك للمستهلك كشف الاتجاه؛ مرّر `'ltr'` أو `'rtl'` لتثبيت LRI أو RLI.

```ts
isolate('مرحبا') // → '\u2068مرحبا\u2069'
isolate('v1.2.3', 'ltr') // → '\u2066v1.2.3\u2069'
isolate('v1.2.3', 'rtl') // → '\u2067v1.2.3\u2069'
isolate('', 'ltr') // → ''
```

## `isolateRuns(text, baseDir)`

تعزل الدالة المقاطع التي قد يُعاد ترتيبها فقط، بعد إزالة محارف التحكم ثنائية الاتجاه الموجودة في الإدخال. وهي الصيغة النصية لـ`<BidiText>`.

```ts
isolateRuns('تم التحديث في 12-05-2024', 'rtl') // → 'تم التحديث في \u206612-05-2024\u2069'
isolateRuns('Hello عالم', 'ltr') // → 'Hello \u2067عالم\u2069'
isolateRuns('نص عربي خالص', 'rtl') // → 'نص عربي خالص'
```

## `splitBidiRuns(text, baseDir)`

تعيد المقاطع الخام بصيغة `{ text, dir, isolated, hasStrong }[]`. ويُعيد ضمّ `text` الإدخال كما هو تمامًا، وتشير `isolated` إلى المقاطع التي تحتاج إلى غلاف.

```ts
splitBidiRuns('12-05-2024', 'rtl') // → [
//   { text: '12-05-2024', dir: 'ltr', hasStrong: false, isolated: true },
// ]
splitBidiRuns('زر GitHub، ثم عد', 'rtl') // → [
//   { text: 'زر', dir: 'rtl', hasStrong: true, isolated: false },
//   { text: ' ', dir: 'rtl', hasStrong: false, isolated: false },
//   { text: 'GitHub', dir: 'ltr', hasStrong: true, isolated: true },
//   { text: '، ', dir: 'rtl', hasStrong: false, isolated: false },
//   { text: 'ثم عد', dir: 'rtl', hasStrong: true, isolated: false },
// ]
splitBidiRuns('', 'rtl') // → []
```

## `detectDirection(text, fallback?)`

تستخدم الدالة قاعدة أول محرف قوي الاتجاه في Unicode، وهي القاعدة نفسها التي يستخدمها `dir="auto"`. وتتخطى الأرقام وعلامات الترقيم البادئة.

```ts
detectDirection('مرحبا world') // → 'rtl'
detectDirection('Hello عالم') // → 'ltr'
detectDirection('2024 - مرحبا') // → 'rtl'
detectDirection('123', 'rtl') // → 'rtl'
```

## `hasRtlCharacters(text)`

محدد سريع لوجود محرف قوي واحد على الأقل من اليمين إلى اليسار.

```ts
hasRtlCharacters('مرحبا') // → true
hasRtlCharacters('hello') // → false
```

## `stripBidiControls(text)`

تزيل الدالة كل محرف تحكم ثنائي الاتجاه في Unicode: العلامات والتضمينات والتجاوزات والعوازل.

```ts
stripBidiControls('\u200E\u202Aabc\u202C\u2067د\u2069') // → 'abcد'
```

## `directionOfLocale(locale, fallback?)`

تستنتج الدالة اتجاه وسم BCP-47 من وسم الكتابة أولًا ثم من اللغة. ولا تُستخدم القيمة الاحتياطية إلا لوسم فارغ أو غير صالح.

```ts
directionOfLocale('ar-EG') // → 'rtl'
directionOfLocale('ku-Latn') // → 'ltr'
directionOfLocale('az-Arab') // → 'rtl'
directionOfLocale('', 'rtl') // → 'rtl'
```

## `resolveDirection(locale, locales, fallback?)`

تفحص الدالة خريطة اللغات الصريحة أولًا، بمطابقة الوسم الدقيق ثم وسم اللغة، قبل تطبيق كشف اتجاه اللغة.

```ts
resolveDirection('ar-EG', { ar: 'rtl' }) // → 'rtl'
resolveDirection('fr', {}) // → 'ltr'
resolveDirection('ku-Arab', { ku: 'ltr' }, 'rtl') // → 'ltr'
```

## دوال البحث {#search-helpers}

كثيرًا ما تتضمن الأسماء والعناوين المخزّنة بالعربية والفارسية والعبرية أشكال الهمزة أو الحركات أو التطويل أو نقاط التشكيل العبرية أو وصلات العرض أو الأرقام المحلية التي يغفلها المستخدم عند الكتابة، فتعيد `name.includes(query)` القيمة `false`. توحّد الدوال `foldSearchText()` و`matchesSearch()` و`findSearchMatches()` كلا الطرفين دون اعتماد على Vue أو DOM، ولا ترمي استثناءً أبدًا.

تقتصر هذه الدوال على طيّ المحارف الحتمي ومطابقة المقطع المطوي نصيًا — **ولا تُجري اشتقاقًا صرفيًا أو استخراجًا للجذور أو مطابقة ضبابية للأخطاء الإملائية**.

### `foldSearchText(text, options?)`

تُعيد مفتاح البحث الموحّد للفهرسة أو المقارنة:

- تطبّق تطبيع `NFKC` في Unicode لفكّ أشكال العرض العربية والعبرية (ومنها وصلات لام ألف `ﻻ` و`ﻷ` ولفظ الجلالة `ﷲ` و`שּ`) إلى حروف وعلامات قياسية قبل الطيّ.
- تحذف الحركات وعلامات الضبط القرآنية (`U+064B`–`U+065F` و`U+0670` و`U+06D6`–`U+06ED`) والتطويل (`U+0640`) ونقاط التشكيل العبرية (`U+0591`–`U+05C7`) ومحارف التحكم ثنائية الاتجاه.
- تحوّل `آ` (`U+0622`) و`أ` (`U+0623`) و`إ` (`U+0625`) و`ٱ` (`U+0671`) إلى `ا` (`U+0627`)؛ و`ؤ` (`U+0624`) إلى `و` (`U+0648`)؛ و`ئ` (`U+0626`) والياء الفارسية `ی` (`U+06CC`) إلى `ي` (`U+064A`)؛ والكاف الفارسية `ک` (`U+06A9`) إلى `ك` (`U+0643`).
- تحوّل الحروف اللاتينية إلى حالتها الصغيرة وتدمج تتابعات المسافات البيضاء في مسافة واحدة `' '`.
- تطوي اختياريًا التاء المربوطة `ة` (`U+0629`) إلى `ه` (`U+0647`)، والألف المقصورة `ى` (`U+0649`) إلى `ي` (`U+064A`)، والأرقام العربية الهندية (`٠`–`٩`) والفارسية (`۰`–`۹`) إلى أرقام ASCII `0`–`9` (وجميعها مفعّلة افتراضيًا).

| الخيار | الافتراضي | الأثر عند `true` |
| --- | --- | --- |
| `taMarbuta` | `true` | تحويل `ة` (`U+0629`) إلى `ه` (`U+0647`). |
| `alefMaqsura` | `true` | تحويل `ى` (`U+0649`) إلى `ي` (`U+064A`). (تُطوى `ئ` و`ی` الفارسية دائمًا إلى `ي`.) |
| `digits` | `true` | تحويل الأرقام العربية الهندية (`U+0660`–`U+0669`) والفارسية (`U+06F0`–`U+06F9`) إلى `0`–`9`. |

```ts
foldSearchText('أَحْمَد عـبـدالله ١٢٣') // 'احمد عبدالله 123'
foldSearchText('فاطمة مصطفى', { taMarbuta: false }) // 'فاطمة مصطفي'
foldSearchText('مُصْطَفَىٰ', { alefMaqsura: false }) // 'مصطفى'
foldSearchText('طلب ۱۲۳', { digits: false }) // 'طلب ۱۲۳'
foldSearchText('שָׁלוֹם עֲלֵיכֶם') // 'שלום עליכם'
foldSearchText(null) // ''
```

### `matchesSearch(text, query, options?)`

تختبر احتواء `text` بعد طيّه على `query` بعد طيّه. يطابق الاستعلام الفارغ أو المكوّن من علامات فقط أي سلسلة نصية (`true`)؛ أما تمرير `null` أو `undefined` قيمةً لـ `text` فيعيد `false`.

```ts
matchesSearch('مُحَمَّد أحمد', 'محمد احمد') // true
matchesSearch('کتابخانه علی', 'كتابخانه علي') // true
matchesSearch('فاطمة', 'فاطمه', { taMarbuta: false }) // false
matchesSearch('أحمد', '') // true
matchesSearch(null, '') // false
```

### `findSearchMatches(text, query, options?)`

تُعيد نطاقات `{ start, end }` مرتّبة وغير متداخلة بوحدات ترميز UTF-16 في النص **الأصلي** `text`. يمتد كل موضع نهاية `end` ليشمل علامات التشكيل اللاحقة للحرف الأخير المطابق حتى لا يفصل التغليف بـ `<mark>` الحرف عن حركته أو تشكيله. وتحافظ الأزواج البديلة (مثل الرموز التعبيرية) ووصلات العرض (`ﻻ` و`ﻷ`) على مواضع UTF-16 الدقيقة. ويعيد الاستعلام الفارغ أو المكوّن من علامات فقط، أو `text` بقيمة `null`، أو غياب التطابق مصفوفة فارغة `[]`.

```ts
const title = '😀 مرحبا مُحَمَّدٌ في ﻻهور'
const ranges = findSearchMatches(title, 'محمد') // [{ start: 9, end: 18 }]
title.slice(ranges[0].start, ranges[0].end) // 'مُحَمَّدٌ'
findSearchMatches(title, 'لاهور') // [{ start: 22, end: 26 }]
findSearchMatches(title, '') // []
```

## الفرز حسب اللغة {#locale-aware-sorting}

استخدم `compareText()` و`sortByLocale()` لترتيب النص المعروض بدلًا من فرز المفاتيح الناتجة من `foldSearchText()`. يحذف الخيار `ignoreDiacritics` افتراضيًا التشكيل العربي (الحركات والشدة والسكون والألف الخنجرية) والتطويل فقط قبل المقارنة. ولا يوحّد الألف المجرّدة (`ا`) مع الألف المهموزة (`أ`، `إ`) أو الممدودة (`آ`). تتبع هذه الأشكال قواعد الفرز في اللغة المحدّدة، وكذلك علامات النبر اللاتينية وحالة الحروف. ولا يتغيّر النص الأصلي.

### `compareText(a, b, options?)`

استخدم الناتج للمقارنة: قيمة سالبة إذا سبق `a` القيمة `b`، وصفر إذا تساويا في الترتيب، وقيمة موجبة إذا جاء `a` بعد `b`. الإشارة وحدها مضمونة، لا القيمتان `-1` و`1` بعينهما.

```ts
import { compareText, sortByLocale } from 'vue-rtl-kit'

compareText('مُحَمَّد', 'مـحمد', { locale: 'ar' }) // 0
compareText('مُحَمَّد', 'محمد', { locale: 'ar', ignoreDiacritics: false }) !== 0 // true
compareText('احمد', 'أحمد', { locale: 'ar' }) !== 0 // true
compareText('طلب ٢', 'طلب ۲', { locale: 'ar' }) // 0
compareText('طلب 2', 'طلب ٢', { locale: 'ar' }) // 0
compareText('طلب ٢', 'طلب ١٠', { locale: 'ar' }) < 0 // true
compareText('طلب ٢', 'طلب ١٠', { locale: 'ar', numeric: false }) > 0 // true
```

### `sortByLocale(items, options?)`

إذا كانت العناصر سلاسل نصية، فكل عنصر هو مفتاحه. أما مع الكائنات، فمرّر دالة `key` لاستخراج المفتاح. تعيد الدالة مصفوفة جديدة، وتحافظ العناصر ذات المفاتيح المتساوية على ترتيبها الأصلي.

```ts
sortByLocale(['طلب ١٠', 'طلب ٢', 'طلب ۲', 'طلب ۳'], { locale: 'ar' })
// ['طلب ٢', 'طلب ۲', 'طلب ۳', 'طلب ١٠']

const orders = [
  { id: 1, title: 'طلب ٢' },
  { id: 2, title: '' },
  { id: 3, title: 'طلب ١٠' },
]
const sorted = sortByLocale(orders, {
  locale: ['ar-EG', 'ar', 'en'],
  key: (order) => order.title,
  direction: 'desc',
})
sorted.map((order) => order.id) // [2, 3, 1]
```

تأتي السلسلة الفارغة فعليًا (`''`) أولًا في الفرز التصاعدي والتنازلي. أما المفتاح `null` أو `undefined` فيؤدي إلى رمي `TypeError` في التطوير، ويأتي دائمًا في آخر القائمة في الإنتاج حتى عند الفرز التنازلي.

يعمل `direction: 'desc'` في الدالتين، والافتراضي هو `'asc'`. في النص المختلط بالعربية واللاتينية، يجعل `caseFirst: 'upper'` النص `ملف A` يسبق `ملف a` في الفرز التصاعدي. استخدم `'lower'` لعكس الأولوية. لا تعطي القيمة الافتراضية `'false'` أولوية لأيٍّ منهما، لكن حالة الحروف تظلّ مؤثّرة في المقارنة.

تستخدم الدالتان المستقلتان اللغة `'en'` افتراضيًا؛ مرّر وسم لغة وفق BCP-47 أو مصفوفة وسوم مرتّبة حسب الأولوية. في Nuxt، استورد الدالتين المستقلتين صراحةً من `vue-rtl-kit`. ولاتباع لغة نطاق Vue الحالي، استخدم [تابعي `useFormat()`](/ar/guide/use-format#locale-aware-sorting). راجع [مرجع API](/ar/api#locale-aware-sorting) للاطلاع على جميع الخيارات.
