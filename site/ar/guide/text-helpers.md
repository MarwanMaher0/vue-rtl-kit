# دوال النص

تتعامل هذه الدوال المستقلة مع عزل Unicode واتجاه اللغة دون مكوّن أو DOM. وهي آمنة في العرض على الخادم، أو وحدة أدوات، أو سلسلة على وشك النسخ.

```ts
import {
  detectDirection,
  directionOfLocale,
  hasRtlCharacters,
  isolate,
  isolateRuns,
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
