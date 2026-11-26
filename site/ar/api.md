# مرجع واجهة برمجة التطبيقات

فيما يلي قائمة بجميع العناصر المُصدَّرة من `src/index.ts`. استورد هذه الأسماء من `vue-rtl-kit`، إلا إذا أوضح أحد الأدلة نقطة الدخول المنفصلة `vue-rtl-kit/nuxt` أو `vue-rtl-kit/styles.css`.

```ts
import { createRtl } from 'vue-rtl-kit'
import type { Direction } from 'vue-rtl-kit'
```

## المخزن والدوال التركيبية

| التصدير | التوقيع | الوصف |
| --- | --- | --- |
| `createRtl` | `(options?: RtlOptions) => RtlInstance` | إنشاء مخزن الاتجاه الجذري وإضافة Vue. |
| `createDirectionState` | `(options: DirectionStateOptions) => DirectionState` | إنشاء حالة اتجاه تفاعلية مستقلة. |
| `useDirection` | `() => DirectionContext` | الحصول على أقرب نطاق، أو المخزن الجذري، أو القيمة الاحتياطية المنفصلة. |
| `useRtl` | `() => RtlInstance` | الحصول على المخزن الجذري؛ ويُطلق خطأً عند عدم وجود الإضافة. |
| `useLogicalStyles` | `() => UseLogicalStylesReturn` | أدوات مساعدة للأنماط المنطقية المرتبطة بالاتجاه. |
| `useFormat` | `() => ComputedRef<BoundFormatters>` | أدوات تنسيق الأرقام والعملات والتواريخ والقوائم والأزمنة النسبية وصيغ الجمع المرتبطة باللغة، ومعها `parseNumber`. |
| `useInlineScroll` | `(target: MaybeRefOrGetter<Element \| null \| undefined>, options?: UseInlineScrollOptions) => UseInlineScrollReturn` | حالة التمرير السطري المنطقي وأوامر التحكم فيه في LTR وRTL، وآمنة مع SSR. |

راجع [createRtl](/ar/guide/create-rtl) و[useDirection](/ar/guide/use-direction) و[useLogicalStyles](/ar/guide/use-logical-styles) (بما في ذلك [التمرير السطري](/ar/guide/use-logical-styles#inline-scrolling)) و[useFormat](/ar/guide/use-format) للاطلاع على أمثلة.

## المكونات والتوجيهات

| التصدير | التوقيع | الوصف |
| --- | --- | --- |
| `BidiText` | `const BidiText: DefineComponent` | مكوّن يعزل مقاطع النص القابلة لإعادة الترتيب. |
| `RtlProvider` | `const RtlProvider: DefineComponent` | مكوّن يوفّر نطاق اتجاه متداخلًا. |
| `vRtl` | `const vRtl: ObjectDirective<HTMLElement, RtlDirectiveValue>` | تنفيذ `v-rtl` متوافق مع العرض من جهة الخادم. |
| `rtlDirective` | `const rtlDirective: ObjectDirective<HTMLElement, RtlDirectiveValue>` | اسم بديل لـ `vRtl`. |

تعرض قيم `DefineComponent` الخصائص الموثقة في [BidiText](/ar/guide/bidi-text) و[RtlProvider](/ar/guide/rtl-provider).

## مفاتيح الحقن

| التصدير | التوقيع | الوصف |
| --- | --- | --- |
| `rtlInstanceKey` | `InjectionKey<RtlInstance>` | مفتاح التوفير/الحقن للمخزن الجذري. |
| `directionScopeKey` | `InjectionKey<DirectionContext>` | مفتاح التوفير/الحقن لأقرب نطاق. |

## النص ثنائي الاتجاه

| التصدير | التوقيع | الوصف |
| --- | --- | --- |
| `classifyChar` | `(char: string) => 'L' \| 'R' \| 'EN' \| 'AN' \| 'N'` | تصنيف محرف واحد باستخدام فئات الاتجاه الثنائي المبسّطة في المكتبة. |
| `detectDirection` | `(text: string, fallback?: Direction) => Direction` | اكتشاف الاتجاه وفق أول محرف قوي؛ وتكون القيمة الاحتياطية الافتراضية `'ltr'`. |
| `hasRtlCharacters` | `(text: string) => boolean` | التحقق من وجود محرف قوي من اليمين إلى اليسار. |
| `isMixedDirection` | `(text: string) => boolean` | التحقق من وجود محارف قوية من اليسار إلى اليمين ومن اليمين إلى اليسار معًا. |
| `stripBidiControls` | `(text: string) => string` | إزالة محارف التحكم في الاتجاه الثنائي في Unicode. |
| `splitBidiRuns` | `(text: string, baseDir?: Direction) => BidiRun[]` | تقسيم النص وتمييز المقاطع التي تتطلب العزل. |
| `isolate` | `(text: string, dir?: DirectionOrAuto) => string` | تغليف السلسلة النصية كاملة داخل عازل واحد؛ والقيمة الافتراضية هي `'auto'`. |
| `isolateRuns` | `(text: string, baseDir?: Direction) => string` | عزل المقاطع التي سيُعاد ترتيبها فقط. |
| `LRI` | `'\u2066'` | عازل من اليسار إلى اليمين. |
| `RLI` | `'\u2067'` | عازل من اليمين إلى اليسار. |
| `FSI` | `'\u2068'` | عازل وفق أول محرف قوي. |
| `PDI` | `'\u2069'` | إنهاء عازل الاتجاه. |
| `LRM` | `'\u200e'` | علامة من اليسار إلى اليمين. |
| `RLM` | `'\u200f'` | علامة من اليمين إلى اليسار. |

```ts
import { isolate, isolateRuns, splitBidiRuns } from 'vue-rtl-kit'

isolate('feature/rtl')
isolateRuns('الإصدار v1.2.3 متاح الآن', 'rtl')
splitBidiRuns('آخر تحديث 12-05-2024', 'rtl')
```

## الأنماط المنطقية

| التصدير | التوقيع | الوصف |
| --- | --- | --- |
| `logicalProperty` | `(property: string, options?: LogicalStyleOptions) => string` | تحويل اسم خاصية فيزيائية واحدة مع الحفاظ على حالة الأحرف. |
| `toLogicalStyle` | `<T extends StyleObject>(style: T, options?: LogicalStyleOptions) => StyleObject` | تحويل كائن أنماط فيزيائية إلى خصائص منطقية. |
| `toPhysicalStyle` | `<T extends StyleObject>(style: T, dir: Direction) => StyleObject` | تحويل الخصائص المنطقية إلى ما يناسب اتجاهًا محددًا. |
| `logicalArrow` | `(key: string, dir: Direction) => LogicalArrow \| null` | تحويل مفتاح سهم أو `Home` أو `End` إلى خطوة تنقل منطقية وفق WAI-ARIA. |

```ts
import { logicalArrow, logicalProperty, toLogicalStyle, toPhysicalStyle } from 'vue-rtl-kit'

logicalProperty('marginLeft') // marginInlineStart
toLogicalStyle({ textAlign: 'left' }) // { textAlign: 'start' }
toPhysicalStyle({ marginInlineStart: '8px' }, 'rtl')
logicalArrow('ArrowRight', 'rtl') // 'previous'
```

## التمرير السطري

دوال نقية دون أي استيراد من Vue توحّد `scrollLeft` الأفقي ضمن مقياس واحد من `0` إلى `max` من بداية السطر إلى نهايته في LTR وRTL. يُقرأ الاتجاه من `getComputedStyle(el).direction` بحيث تعمل جزر `dir` والتوجيه `v-rtl` ومكوّن `<RtlProvider>` تلقائيًا. لأوضاع الكتابة الأفقية (`writing-mode: horizontal-tb`) فقط. عند غياب الفيض تُعيد `0` و`{ atStart: true, atEnd: true }`؛ كما أن `null` وSSR و`NaN` و`Infinity` تُعيد `0` أو لا تنفّذ شيئًا دون رمي استثناء أبدًا.

| التصدير | التوقيع | الوصف |
| --- | --- | --- |
| `getScrollInline` | `(el: Element \| null \| undefined) => number` | المسافة المقطوعة من بداية السطر بالبكسل، محصورة بين `0` و`max`. |
| `getScrollInlineMax` | `(el: Element \| null \| undefined) => number` | أقصى مسافة تمرير سطرية: `max(0, scrollWidth - clientWidth)`. |
| `scrollToInline` | `(el: Element \| null \| undefined, offset: number, options?: ScrollInlineOptions) => void` | تحصر `offset` وتستدعي `el.scrollTo` بإحداثي `left` المادي. |
| `scrollByInline` | `(el: Element \| null \| undefined, delta: number, options?: ScrollInlineOptions) => void` | تمرّر بمقدار نسبي `delta` (القيمة الموجبة تتجه نحو نهاية السطر). |
| `scrollInlineEdges` | `(el: Element \| null \| undefined, tolerance?: number) => ScrollInlineEdges` | تُعيد `{ atStart, atEnd }` ضمن هامش `tolerance` بالبكسل (الافتراضي `1`). |

```ts
import {
  getScrollInline,
  getScrollInlineMax,
  scrollByInline,
  scrollInlineEdges,
  scrollToInline,
} from 'vue-rtl-kit'

getScrollInline(el)
getScrollInlineMax(el)
scrollToInline(el, 240, { behavior: 'smooth' })
scrollByInline(el, 240, { behavior: 'smooth' })
scrollInlineEdges(el, 1)
```

## أدوات اللغة المساعدة

| التصدير | التوقيع | الوصف |
| --- | --- | --- |
| `directionOfLocale` | `(locale: string \| undefined \| null, fallback?: Direction) => Direction` | استنتاج الاتجاه من وسم لغة وفق BCP-47؛ لا تُستخدم القيمة الاحتياطية إلا للوسوم الفارغة أو غير الصالحة. |
| `normaliseLocales` | `(locales: string[] \| LocaleMap \| undefined) => LocaleMap` | تسوية قائمة لغات أو خريطة لغات وتحويلها إلى خريطة صريحة. |
| `resolveDirection` | `(locale: string, locales: LocaleMap, fallback?: Direction) => Direction` | اعتماد اتجاه الخريطة المطابق للوسم كاملًا، ثم المطابق للغة، ثم الاستنتاج المضمّن. |
| `oppositeDirection` | `(dir: Direction) => Direction` | إرجاع الاتجاه المعاكس. |
| `RTL_LANGUAGES` | `ReadonlySet<string>` | الوسوم الفرعية للغات التي يكون اتجاهها الافتراضي من اليمين إلى اليسار. |

في الاستنتاج المضمّن، يتقدّم الخط المحدّد صراحةً في جزء اللغة على اتجاه اللغة الافتراضي. يُعتدّ بالخط فقط إذا ورد قبل أول وسم فرعي من محرف واحد، مثل `u` أو `x`. ولا تُستنتج الخطوط من الامتدادات مثل `-u-` أو من الوسوم الفرعية للاستخدام الخاص بعد `-x-`. تتقدّم الاتجاهات الصريحة في خريطة اللغات على هذا الاستنتاج، حتى عند تحديد الخط صراحةً.

| قيمة اللغة | الاتجاه المستنتج | القاعدة |
| --- | --- | --- |
| `az-Arab`، `ha-Arab`، `ku-Arab` | `rtl` | تكون الأولوية للخط الصريح المكتوب من اليمين إلى اليسار. |
| `ar-Latn`، `ku-Latn` | `ltr` | تكون الأولوية للخط الصريح غير المكتوب من اليمين إلى اليسار. |
| `ar-u-nu-latn`، `he-x-abcd` | `rtl` | لا تغيّر وسوم الامتدادات والاستخدام الخاص اتجاه اللغة الافتراضي. |
| `ha`، `ku` | `ltr` | الخط الافتراضي للهوسا والكردية هو اللاتيني. |
| `pnb`، `mzn`، `lrc`، `glk`، `bal`، `sdh` | `rtl` | لهذه اللغات اتجاه افتراضي من اليمين إلى اليسار. |
| `fr`، `qaa` | `ltr` | تعيد اللغات غير المعروفة أو غير المكتوبة من اليمين إلى اليسار `ltr` إذا كان الوسم صحيح البنية، حتى مع قيمة احتياطية `rtl`. |
| `''`، `null`، `undefined`، `en--US` | `fallback` | تستخدم الوسوم الفارغة أو غير الصالحة القيمة الاحتياطية، وقيمتها الافتراضية `ltr`. |

تستنتج المخازن غير المثبّتة الاتجاه حتى للغات غير المدرجة في الخريطة. وبالمثل، يكون اتجاه `RtlProvider` غير المثبّت ذي الخاصية `locale="fr"` هو `ltr` داخل نطاق أب باتجاه RTL، ما لم تحدّد الخريطة اتجاهًا آخر. ولا يؤثر تغيير اللغة في الاتجاه المثبّت. راجع [createRtl](/ar/guide/create-rtl#قواعد-اتجاه-اللغة) لسلوك المخزن.

```ts
import { directionOfLocale, oppositeDirection, resolveDirection } from 'vue-rtl-kit'

directionOfLocale('az-Arab') // rtl
directionOfLocale('ku-Latn') // ltr
oppositeDirection('rtl') // ltr
resolveDirection('ar-EG', { ar: 'rtl' }) // rtl
```

## دوال البحث {#search-helpers}

دوال نقية دون أي استيراد من Vue للبحث النصي من جهة العميل في النصوص العربية والفارسية والعبرية والمختلطة. تطابق النصوص المخزّنة بأشكال الهمزة أو الحركات أو التطويل أو نقاط التشكيل العبرية أو وصلات العرض أو الأرقام المحلية استعلامات البحث المكتوبة بحروف مجرّدة وأرقام ASCII. لا ترمي أيٌّ من هذه الدوال استثناءً أبدًا، **ولا تُجري اشتقاقًا صرفيًا أو استخراجًا للجذور أو مطابقة ضبابية**. راجع [دوال النص](/ar/guide/text-helpers#search-helpers) للاطلاع على قواعد الطيّ كاملة.

| التصدير | التوقيع | الوصف |
| --- | --- | --- |
| `foldSearchText` | `(text: string \| null \| undefined, options?: SearchOptions) => string` | إرجاع مفتاح البحث الموحّد (`NFKC`، وحذف الحركات والتطويل ونقاط التشكيل العبرية ومحارف التحكم ثنائية الاتجاه، وطيّ المتغيرات الإملائية والأرقام، وتصغير الحروف اللاتينية، ودمج المسافات البيضاء في `' '`). |
| `matchesSearch` | `(text: string \| null \| undefined, query: string \| null \| undefined, options?: SearchOptions) => boolean` | إرجاع `true` عند احتواء `text` المطوي على `query` المطوي. يعيد الاستعلام الفارغ أو المكوّن من علامات فقط `true`؛ ويعيد `null` أو `undefined` لـ `text` القيمة `false`. |
| `findSearchMatches` | `(text: string \| null \| undefined, query: string \| null \| undefined, options?: SearchOptions) => SearchMatch[]` | نطاقات `{ start, end }` مرتّبة وغير متداخلة بوحدات UTF-16 في النص الأصلي `text`، مع مدّ `end` عبر علامات التشكيل اللاحقة حتى لا يفصل `<mark>` الحرف عن حركته. |

```ts
import { findSearchMatches, foldSearchText, matchesSearch } from 'vue-rtl-kit'

foldSearchText('أَحْمَد عـبـدالله ١٢٣') // 'احمد عبدالله 123'
matchesSearch('فاطمة مصطفى', 'فاطمه مصطفي') // true
matchesSearch('فاطمة', 'فاطمه', { taMarbuta: false }) // false
findSearchMatches('مرحبا مُحَمَّدٌ!', 'محمد') // [{ start: 6, end: 15 }]
```

## التنسيق

| التصدير | التوقيع | الوصف |
| --- | --- | --- |
| `formatNumber` | `(value: number, options?: NumberFormatOptions) => string` | التنسيق باستخدام `Intl.NumberFormat`. |
| `formatCurrency` | `(value: number, currency: string, options?: NumberFormatOptions) => string` | تنسيق مبلغ بعملة وفق ISO 4217. |
| `formatDate` | `(value: Date \| number \| string, options?: DateFormatOptions) => string` | التنسيق باستخدام `Intl.DateTimeFormat`. |
| `formatList` | `(items: Iterable<string>, options?: ListFormatOptions) => string` | ضم العناصر باستخدام `Intl.ListFormat`؛ ويعزل `isolate` كل عنصر ثم النتيجة كاملة. |
| `formatRelativeTime` | `(value: number, unit: Intl.RelativeTimeFormatUnit, options?: RelativeTimeFormatOptions) => string` | التنسيق باستخدام `Intl.RelativeTimeFormat`؛ ويعيد `''` للقيم غير المنتهية. |
| `formatPlural` | `(count: number, forms: PluralForms, options?: FormatPluralOptions) => string` | اختيار صيغة الجمع وفق CLDR عبر `Intl.PluralRules` واستبدال كل `{count}` بقيمة `formatNumber(count, options)`؛ وتعود الفئات غير المزوّدة بصيغة إلى `forms.other`. يعيد `''` حين تكون `forms.other` فارغة أو حين لا تتوفر `Intl.PluralRules`. |
| `parseNumber` | `(text: string, options?: ParseNumberOptions) => number` | معكوس `formatNumber`: قراءة عدد مكتوب بأرقام اللغة وفواصلها. يعيد `NaN` للنص الفارغ أو غير الصالح ولا يرمي استثناء. |
| `transliterateDigits` | `(text: string, to: 'latn' \| 'arab' \| 'arabext') => string` | تحويل الأرقام فقط في سلسلة نصية موجودة. |
| `withNumberingSystem` | `(locale: string, numberingSystem?: NumberingSystem) => string` | إضافة امتداد اللغة `-u-nu-` في Unicode. |

```ts
import {
  formatCurrency,
  formatList,
  formatNumber,
  formatPlural,
  formatRelativeTime,
  parseNumber,
  transliterateDigits,
} from 'vue-rtl-kit'

formatNumber(1234.5, { locale: 'ar-EG', numberingSystem: 'latn' })
formatCurrency(2500, 'EGP', { locale: 'ar-EG', isolate: true })
formatList(['Ahmed', 'Sara', 'Omar'], { locale: 'ar', isolate: true })
formatRelativeTime(-3, 'day', { locale: 'ar-EG', numberingSystem: 'latn' })
formatPlural(11, { many: '{count} ملفًا', other: '{count} ملف' }, { locale: 'ar' }) // '11 ملفًا'
formatPlural(3, { few: '{count}rd', other: '{count}th' }, { type: 'ordinal' }) // '3rd'
parseNumber('١٬٢٣٤٫٥', { locale: 'ar-EG' }) // 1234.5
parseNumber('12abc') // NaN
transliterateDigits('طلب رقم 4821', 'arab')
```

تختار `formatPlural` الفئة عبر `Intl.PluralRules` بحسب اللغة — وتستخدم العربية الفئات الست جميعها (`zero` و`one` و`two` و`few` و`many` و`other`)، فالعدد `11` فئته `many` لا `few` — ويحوّل `type: 'ordinal'` إلى قواعد الترتيب (الإنجليزية `1st` و`2nd` و`3rd`). وتختار القيم `NaN` و`Infinity` والسالبة والكسرية الفئة التي تعلنها القواعد دون رمي استثناء. راجع [صيغ الجمع](/ar/guide/use-format#plural-forms).

تقرأ `parseNumber` فاصل المجموعات والفاصلة العشرية وإشارة السالب من `formatToParts()` في `Intl.NumberFormat` بحسب `locale` و`numberingSystem` (الافتراضي `'en'`)، وتخزّنها مؤقتًا لكل وسم لغة. تقبل الأرقام الغربية والعربية الهندية والفارسية، وتتجاهل علامات الاتجاه ومحارف العزل والمسافات، وتقبل `-` أو U+2212 إشارةً للسالب وعلامة `+` في أول النص، وتقسم على 100 عند وجود `%` أو `٪` في آخره. تُقبل فواصل المجموعات بين أرقام الجزء الصحيح فقط. راجع [تحليل الأرقام](/ar/guide/use-format#parsing-numbers) لمعرفة القواعد كاملة.

## البيئة

| التصدير | التوقيع | الوصف |
| --- | --- | --- |
| `isClient` | `boolean` | تكون `true` عند وجود كل من `window` و`document`. |
| `isServer` | `boolean` | القيمة المعاكسة لـ `isClient`. |

## الأنواع الأساسية

### الاتجاه واللغة

```ts
type Direction = 'rtl' | 'ltr'
type DirectionOrAuto = Direction | 'auto'
type LocaleMap = Record<string, Direction>

type NumberingSystem =
  | 'latn'
  | 'arab'
  | 'arabext'
  | 'hanidec'
  | 'deva'
  | 'beng'
  | (string & {})
```

### RtlOptions

```ts
interface RtlOptions {
  locales?: string[] | LocaleMap
  defaultLocale?: string
  dir?: Direction
  syncDocument?: boolean
  htmlClass?: boolean | { rtl: string, ltr: string }
  numberingSystem?: NumberingSystem | Record<string, NumberingSystem>
  registerGlobals?: boolean
  persist?: false | 'localStorage' | 'cookie'
  persistKey?: string
}
```

يحفظ `persist` (افتراضيًا `false`) اللغة في المتصفح عند كل استدعاء لـ`setLocale()` ويستعيدها عند إنشاء `createRtl()` التالي، تحت مفتاح التخزين `persistKey` (افتراضيًا `'rtl-locale'`). ولا تُستعاد إلا لغة مهيّأة — ومع عدم تحديد `locales`، أي وسم يقبله `Intl.getCanonicalLocales` — ويبقى `dir` المثبّت مثبّتًا. تُتجاهل أخطاء التخزين، ولا يعمل شيء وقت الاستيراد أو على الخادم، ويوقف `dispose()` الكتابة. يستخدم وضع ملف تعريف الارتباط `path=/` و`SameSite=Lax` و`max-age` لمدة سنة واسمًا وقيمة مرمّزين. وتستبعد وحدة Nuxt كلا الخيارين وتحفظ عبر خيار `cookie` الخاص بها بدلًا منهما.

### ResolvedRtlOptions

```ts
interface ResolvedRtlOptions
  extends Required<Omit<RtlOptions, 'numberingSystem' | 'dir' | 'locales'>> {
  locales: LocaleMap
  dir: Direction
  numberingSystem?: NumberingSystem | Record<string, NumberingSystem>
}
```

### DirectionContext

```ts
interface DirectionContext {
  readonly dir: Ref<Direction>
  readonly isRtl: ComputedRef<boolean>
  readonly isLtr: ComputedRef<boolean>
  readonly locale: Ref<string>
  readonly startSide: ComputedRef<'left' | 'right'>
  readonly endSide: ComputedRef<'left' | 'right'>
  readonly sign: ComputedRef<1 | -1>
  setDirection: (dir: Direction) => void
  toggleDirection: () => Direction
  setLocale: (locale: string) => void
  htmlAttrs: () => { dir: Direction, lang: string }
  readonly isRoot: boolean
}
```

### RtlInstance

```ts
interface RtlInstance extends DirectionContext {
  readonly isRoot: true
  readonly options: ResolvedRtlOptions
  install: (app: App) => void
  dispose: () => void
}
```

### DirectionState وDirectionStateOptions

```ts
type DirectionState = Omit<DirectionContext, 'isRoot'>

interface DirectionStateOptions {
  dir: Direction
  locale: string
  locales?: LocaleMap
  pinned?: boolean
}
```

## أنواع الدوال التركيبية

### UseLogicalStylesReturn

```ts
interface UseLogicalStylesReturn {
  dir: ComputedRef<Direction>
  isRtl: ComputedRef<boolean>
  startSide: ComputedRef<'left' | 'right'>
  endSide: ComputedRef<'left' | 'right'>
  sign: ComputedRef<1 | -1>
  toLogical: (style: StyleObject, options?: LogicalStyleOptions) => StyleObject
  toPhysical: (style: StyleObject, dir?: Direction) => StyleObject
  property: (name: string, options?: LogicalStyleOptions) => string
  mirror: (value: number) => number
  arrow: (event: KeyboardEvent) => LogicalArrow | null
}
```

### UseInlineScrollOptions وUseInlineScrollReturn

```ts
interface UseInlineScrollOptions {
  tolerance?: number
}

interface UseInlineScrollReturn {
  readonly offset: Readonly<Ref<number>>
  readonly max: Readonly<Ref<number>>
  readonly atStart: Readonly<Ref<boolean>>
  readonly atEnd: Readonly<Ref<boolean>>
  scrollTo: (offset: number, options?: ScrollInlineOptions) => void
  scrollBy: (delta: number, options?: ScrollInlineOptions) => void
  scrollToStart: (options?: ScrollInlineOptions) => void
  scrollToEnd: (options?: ScrollInlineOptions) => void
}
```

### BoundFormatters

```ts
interface BoundFormatters {
  locale: string
  dir: Direction
  formatNumber: (value: number, options?: NumberFormatOptions) => string
  formatCurrency: (
    value: number,
    currency: string,
    options?: NumberFormatOptions,
  ) => string
  formatDate: (
    value: Date | number | string,
    options?: DateFormatOptions,
  ) => string
  formatList: (items: Iterable<string>, options?: ListFormatOptions) => string
  formatRelativeTime: (
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
    options?: RelativeTimeFormatOptions,
  ) => string
  formatPlural: (count: number, forms: PluralForms, options?: FormatPluralOptions) => string
  parseNumber: (text: string, options?: ParseNumberOptions) => number
}
```

### أنواع خيارات التنسيق

```ts
interface FormatOptionsBase {
  locale?: string
  numberingSystem?: NumberingSystem
  isolate?: boolean | DirectionOrAuto
}

type NumberFormatOptions = FormatOptionsBase & Intl.NumberFormatOptions
type DateFormatOptions = FormatOptionsBase & Intl.DateTimeFormatOptions
type ListFormatOptions = FormatOptionsBase & Intl.ListFormatOptions
type RelativeTimeFormatOptions = FormatOptionsBase & Intl.RelativeTimeFormatOptions
type FormatPluralOptions = FormatOptionsBase & { type?: 'cardinal' | 'ordinal' }

interface PluralForms extends Partial<Record<'zero' | 'one' | 'two' | 'few' | 'many' | 'other', string>> {
  other: string
}

interface ParseNumberOptions {
  locale?: string
  numberingSystem?: NumberingSystem
}
```

## نوع النص ثنائي الاتجاه

```ts
interface BidiRun {
  text: string
  dir: Direction
  isolated: boolean
  hasStrong: boolean
}
```

## أنواع الأنماط المنطقية

```ts
type LogicalArrow = 'next' | 'previous' | 'first' | 'last' | 'up' | 'down'

interface LogicalStyleOptions {
  size?: boolean
  values?: boolean
  shorthands?: boolean
}

type StyleObject = Record<string, string | number | undefined>
```

## أنواع التمرير السطري

```ts
interface ScrollInlineOptions {
  behavior?: ScrollBehavior
}

interface ScrollInlineEdges {
  atStart: boolean
  atEnd: boolean
}
```

## أنواع البحث

```ts
interface SearchOptions {
  taMarbuta?: boolean
  alefMaqsura?: boolean
  digits?: boolean
}

interface SearchMatch {
  start: number
  end: number
}
```

## نوع التوجيه

```ts
type RtlDirectiveValue =
  | DirectionOrAuto
  | boolean
  | undefined
  | null
  | { dir?: DirectionOrAuto, isolate?: boolean }
```

## الخاصية العامة في Vue

يؤدي تثبيت `createRtl()` أيضًا إلى توسيع `ComponentCustomProperties` في Vue بإضافة:

```ts
$rtl: RtlInstance
```

يتيح ذلك استخدام `this.$rtl` في مكونات Options API. أما في `<script setup>`، فيُفضّل استخدام `useRtl()` أو `useDirection()`.
