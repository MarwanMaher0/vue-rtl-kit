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
| `useFormat` | `() => ComputedRef<BoundFormatters>` | أدوات تنسيق الأرقام والعملات والتواريخ والقوائم والأزمنة النسبية وصيغ الجمع المرتبطة باللغة، ومنسّقا النطاقات `formatDateRange` و`formatNumberRange`، ومعها `formatDisplayName` و`parseNumber` و`compareText` و`sortByLocale`. |
| `useInlineScroll` | `(target: MaybeRefOrGetter<Element \| null \| undefined>, options?: UseInlineScrollOptions) => UseInlineScrollReturn` | حالة التمرير السطري المنطقي وأوامر التحكم فيه في LTR وRTL، وآمنة مع SSR. |
| `useLogicalPlacement` | `(placement: MaybeRefOrGetter<LogicalPlacement>, target?: Ref<HTMLElement \| null>) => ComputedRef<PhysicalPlacement>` | تحويل [موضع منطقي](#logical-placement) تفاعلي بحسب اتجاه العنصر المحسوب، أو بحسب نطاق الاتجاه الحالي عند غياب العنصر أو أثناء العرض على الخادم. |

راجع [createRtl](/ar/guide/create-rtl) و[useDirection](/ar/guide/use-direction) و[useLogicalStyles](/ar/guide/use-logical-styles) (بما في ذلك [التمرير السطري](/ar/guide/use-logical-styles#inline-scrolling)) و[useFormat](/ar/guide/use-format) للاطلاع على أمثلة.

## المكونات والتوجيهات

| التصدير | التوقيع | الوصف |
| --- | --- | --- |
| `BidiText` | `const BidiText: DefineComponent` | مكوّن يعزل مقاطع النص القابلة لإعادة الترتيب. |
| `RtlProvider` | `const RtlProvider: DefineComponent` | مكوّن يوفّر نطاق اتجاه متداخلًا. |
| `vRtl` | `const vRtl: ObjectDirective<HTMLElement, RtlDirectiveValue>` | تنفيذ `v-rtl` متوافق مع العرض من جهة الخادم. |
| `rtlDirective` | `const rtlDirective: ObjectDirective<HTMLElement, RtlDirectiveValue>` | اسم بديل لـ `vRtl`. |
| `vDigits` | `v-digits` أو `v-digits="{ to, decimal }"` | يحوّل الأرقام عند الكتابة واللصق قبل أن يقرأ `v-model` قيمة الحقل. راجع [دليل توحيد الأرقام](/ar/guide/v-digits). |
| `digitsDirective` | `typeof vDigits` | اسم بديل لـ `vDigits`. |

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

## تحديد الموضع المنطقي {#logical-placement}

استخدم هذه الدوال لتحديد مواضع التلميحات والقوائم والنوافذ المنبثقة في أوضاع الكتابة الأفقية. دالتا التحويل نقيّتان ولا تستوردان Vue.

| التصدير | التوقيع | الوصف |
| --- | --- | --- |
| `resolvePlacement` | `(placement: LogicalPlacement \| PhysicalPlacement, dir: Direction) => PhysicalPlacement` | تحويل كل من `inline-start` و`inline-end` إلى الجانب الفعلي المناسب، وتفسير لواحق `top` و`bottom` بوصفها محاذاة منطقية. |
| `toLogicalPlacement` | `(physical: PhysicalPlacement, dir: Direction) => LogicalPlacement` | تحويل موضع فعلي إلى موضع منطقي يعود إلى الموضع الفعلي نفسه عند التحويل في الاتجاه ذاته. |

تعني `inline-start` اليسار في LTR واليمين في RTL، بينما تعني `inline-end` العكس. على هذين الجانبين، تحدد اللاحقتان `-start` و`-end` المحاذاة الرأسية من دون أن تتأثّرا باتجاه الكتابة. وتبقى المواضع المحددة صراحةً بـ`left` أو `right` كما هي. أما `top` و`bottom` فيبقيان في الأعلى والأسفل، لكن اللاحقتين `-start` و`-end` تتبادلان دوريهما في RTL. ورغم أن الاسمين مشتركان بين النوعين، تتعامل `resolvePlacement` مع لاحقتيهما على أنهما منطقيتان. إذا كانت سلسلة الموضع غير صالحة، ترمي الدالة خطأ `TypeError` في وضع التطوير وتعيد `'bottom'` في وضع الإنتاج.

```ts
import { resolvePlacement, toLogicalPlacement } from 'vue-rtl-kit'

resolvePlacement('inline-end-start', 'rtl') // 'left-start'
resolvePlacement('right-start', 'rtl') // 'right-start'
resolvePlacement('bottom-start', 'rtl') // 'bottom-end'
toLogicalPlacement('left-start', 'rtl') // 'inline-end-start'
toLogicalPlacement('bottom-end', 'rtl') // 'bottom-start'
```

تقبل `useLogicalPlacement(placement, target?)` قيمةً أو مرجعًا تفاعليًا (`ref`) أو دالةً تُرجع القيمة. مرّر مرجع عنصر الارتكاز في القالب إلى `target` لقراءة قيمة `direction` المحسوبة من CSS. تستجيب الدالة لتغيّر `dir` أو `class` أو `style` على العنصر أو أحد أسلافه. لا تراقب الدالة أوراق الأنماط: لا تؤدي إضافة قاعدة CSS أو تعديلها أو تفعيلها أو تعطيلها إلى تحديث الموضع ما لم تتغيّر إحدى هذه السمات. لتغيير الاتجاه مباشرةً عبر CSS، بدّل صنفًا (`class`) على العنصر أو أحد أسلافه. قبل تركيب العنصر أو عند غيابه، بما في ذلك أثناء العرض على الخادم، تستخدم الاتجاه الذي تعيده `useDirection()` (أقرب مزوّد للاتجاه، ثم مخزن التطبيق أو القيمة الاحتياطية المستقلة).

**Floating UI:** إذا كان اتجاه العنصر العائم هو المطلوب، فمرّر محاذاة `top` أو `bottom` المنطقية مباشرةً، مثل `'bottom-start'`؛ إذ تفسّر Floating UI اللاحقة بحسب اتجاه ذلك العنصر. إذا مرّرت لاحقة محوّلة مسبقًا، فاضبط `direction: ltr` على العنصر الحاوي الذي يحدّد الموضع، واضبط الاتجاه المطلوب على عنصر المحتوى الداخلي حتى لا تنعكس المحاذاة مرتين. راجع [مثال Floating UI بالإنجليزية](https://github.com/MarwanMaher0/vue-rtl-kit#floating-ui-example).

```ts
type Placement<Side extends string> = Side | `${Side}-${'start' | 'end'}`
type LogicalPlacement = Placement<'top' | 'bottom' | 'inline-start' | 'inline-end'>
type PhysicalPlacement = Placement<'top' | 'bottom' | 'left' | 'right'>
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

## الفرز حسب اللغة {#locale-aware-sorting}

دوال نقية لمقارنة النص المعروض أو فرزه، تستخدم ذاكرة مؤقتة محدودة لنسخ `Intl.Collator`. تحافظ على ترتيب الحروف بحسب اللغة بدلًا من [طيّها كما في البحث](#search-helpers). في Nuxt، استورد الدالتين المستقلتين صراحةً.

| التصدير | التوقيع | الوصف |
| --- | --- | --- |
| `compareText` | `(a: string, b: string, options?: CompareOptions) => number` | قيمة سالبة إذا سبق `a` القيمة `b`، وصفر إذا تساويا في الترتيب، وقيمة موجبة خلاف ذلك. الإشارة وحدها مضمونة، لا القيمتان `-1` و`1` بعينهما. |
| `sortByLocale` | `<T>(items: readonly T[], options?: CompareOptions & { key?: (item: T) => string }) => T[]` | تعيد مصفوفة جديدة دون تعديل المدخلات. وتحافظ العناصر ذات المفاتيح المتساوية على ترتيبها الأصلي. السلسلة النصية هي مفتاحها، وللكائنات مرّر دالة `key`. |

### CompareOptions

| الخيار | النوع | الافتراضي | الأثر |
| --- | --- | --- | --- |
| `locale` | `string \| string[]` | `'en'` للدالتين المستقلتين | وسم لغة وفق BCP-47 أو مصفوفة وسوم مرتّبة حسب الأولوية. يتبع التابعان في `useFormat().value` لغة النطاق الحالي افتراضيًا؛ مرّر وسمًا أو مصفوفة لتجاوزها في استدعاء واحد. |
| `numeric` | `boolean` | `true` | يقارن تتابعات الأرقام بقيمتها العددية، فتتساوى الأرقام الغربية (`0`–`9`) والعربية الهندية (`٠`–`٩`) والفارسية (`۰`–`۹`) إذا تساوت قيمتها. استخدم `false` للترتيب النصي بدلًا من العددي. |
| `ignoreDiacritics` | `boolean` | `true` | يحذف قبل المقارنة التشكيل العربي (`U+064B`–`U+0652`، `U+0670`) والتطويل (`U+0640`) فقط. استخدم `false` لتخطّي الحذف. في الحالتين، تتبع الألف المجرّدة وأشكال الهمزة والمدّة وعلامات النبر اللاتينية وحالة الحروف قواعد الفرز في اللغة المحدّدة. |
| `caseFirst` | `'upper' \| 'lower' \| 'false'` | `'false'` | يعطي الحروف الكبيرة أو الصغيرة الأولوية عند تساوي الحروف في ما عدا حالتها. لا تعطي `'false'` الأولوية لأيٍّ منهما، لكن حالة الحروف تظلّ مؤثّرة في المقارنة. |
| `direction` | `'asc' \| 'desc'` | `'asc'` | مقارنة تصاعدية أو تنازلية. تأتي السلسلة الفارغة فعليًا (`''`) أولًا دائمًا. ترمي المفاتيح `null` أو `undefined` خطأ `TypeError` في التطوير، وتأتي دائمًا في النهاية في الإنتاج حتى عند الفرز التنازلي. |

```ts
import { compareText, sortByLocale } from 'vue-rtl-kit'

compareText('مُحَمَّد', 'مـحمد', { locale: 'ar' }) // 0
compareText('احمد', 'أحمد', { locale: 'ar' }) !== 0 // true
compareText('طلب 2', 'طلب ۲', { locale: 'ar' }) // 0
sortByLocale(['طلب ٢', '', 'طلب ١٠'], { locale: ['ar-EG', 'ar', 'en'], direction: 'desc' })
// ['', 'طلب ١٠', 'طلب ٢']
```

راجع [دوال النص](/ar/guide/text-helpers#locale-aware-sorting) لأمثلة على مفاتيح الكائنات، و[useFormat](/ar/guide/use-format#locale-aware-sorting) لإعادة الفرز عند تغيير اللغة.

## اختصار النص {#truncate-text}

اختصار نصي نقي دون أي استيراد من Vue يعدّ ويقصّ بعناقيد المحارف عبر `Intl.Segmenter`، فلا يفصل القصّ حرفًا أساسيًا عن تشكيله أو نقاط التشكيل العبرية، ولا متتالية ZWJ في رمز تعبيري، ولا علمًا. تُحسب علامة الحذف ضمن `maxLength`؛ وتُزال المسافات البيضاء والتطويل (`U+0640`) من النهاية قبلها. راجع [اختصار النص](/ar/guide/truncate-text) للاطلاع على الدليل الكامل.

| التصدير | التوقيع | الوصف |
| --- | --- | --- |
| `truncateText` | `(text: string, maxLength: number, options?: TruncateOptions) => string` | اختصار `text` إلى `maxLength` عنقود محارف على الأكثر، بما فيها علامة الحذف. النص الذي يسع الحد يُعاد كما هو. يقصّ `unit: 'word'` عند آخر حدّ كلمة يسع الحد مع العودة إلى العناقيد عند الحاجة؛ ويغلف `isolate: true` كل النتائج — النص الذي يسع الحد والنص المقطوع ونتيجة علامة الحذف وحدها — بـ `FSI ... PDI`. ويعود وسم `locale` غير الصالح إلى اللغة الافتراضية لبيئة التشغيل. وعند غياب `Intl.Segmenter` يعود إلى نقاط الترميز (دون فصل أزواج الوكلاء)، مع قصّ وضع الكلمات عند آخر حدّ مسافة بيضاء يسع الحد. ترمي `maxLength` الأقل من 1 أو غير الصحيحة `TypeError` في التطوير وتعيد علامة الحذف في الإنتاج (معزولة عند الطلب). |

```ts
import { truncateText } from 'vue-rtl-kit'

truncateText('مُحَمَّدٌ عَبْدُ اللَّهِ', 5) // 'مُحَمَّدٌ…'
truncateText('مرحبا بالعالم يا أصدقاء', 14, { unit: 'word' }) // 'مرحبا بالعالم…'
truncateText('الإصدار v1.2.3 متاح الآن', 12, { unit: 'word', isolate: true }) // '\u2068الإصدار\u2026\u2069'
truncateText('👨‍👩‍👧‍👦🇪🇬🎉🎉', 3) // '👨‍👩‍👧‍👦🇪🇬…'
```

## المدد الزمنية {#format-duration}

تنسيق نقي للمدد الزمنية دون أي استيراد من Vue، مبني على `Intl.DurationFormat`، فتأتي صيغ الجمع وواو العطف والأرقام من CLDR لا من سلسلة مضمومة يدويًا: تكتب العربية المثنى دون رقم (`ساعتان`)، وتستخدم الجمع من 3 إلى 10 (`3 ساعات`) والمفرد من 11 فما فوق (`11 ساعة`). راجع [تنسيق المدد الزمنية](/ar/guide/format-duration) للاطلاع على الدليل الكامل.

| التصدير | التوقيع | الوصف |
| --- | --- | --- |
| `formatDuration` | `(duration: DurationInput \| number, options?: FormatDurationOptions) => string` | تنسيق كائن من الوحدات، أو عدد من الميلي ثانية، بكلمات اللغة `locale` وصيغ جمعها وأرقامها (الافتراضي `'en'`). قيمة `style` هي `'long'` (الافتراضي) أو `'short'` أو `'narrow'`، أو `'digital'` لصيغة `h:mm:ss`. يُكتب كائن الأعداد الصحيحة كما هو؛ أما العدد، والكائن ذو الحقول الكسرية أو المختلفة الإشارة، وكل استدعاء فيه `largestUnit` أو `smallestUnit` أو `maxUnits` فيُوازَن أولًا. وعند غياب `Intl.DurationFormat` تُنسَّق كل وحدة بنمط الوحدات في `Intl.NumberFormat` ثم تُربط عبر `Intl.ListFormat`. ترمي المدخلات غير الصالحة `TypeError` في التطوير وتعيد `''` في الإنتاج. |

```ts
import { formatDuration } from 'vue-rtl-kit'

formatDuration({ hours: 2, minutes: 3 }, { locale: 'ar', numberingSystem: 'latn' }) // 'ساعتان و3 دقائق'
formatDuration({ hours: 11, minutes: 2 }, { locale: 'ar-EG', numberingSystem: 'arab' }) // '١١ ساعة ودقيقتان'
formatDuration(3_723_000, { locale: 'ar-EG', numberingSystem: 'arab', style: 'digital' }) // '١:٠٢:٠٣'
formatDuration(5_531_000, { locale: 'ar', numberingSystem: 'latn', maxUnits: 1 }) // 'ساعتان'
formatDuration({ minutes: 90 }, { locale: 'ar', numberingSystem: 'latn', largestUnit: 'hours' }) // 'ساعة و30 دقيقة'
formatDuration(0, { locale: 'ar-EG', numberingSystem: 'arab' }) // '٠ ثانية'
```

### سلوك المدد الزمنية

| الحالة | النتيجة |
| --- | --- |
| الموازنة | يُقسَّم المجموع من `largestUnit` (الافتراضي `'days'` مع العدد، وأكبر حقل غير صفري مع الكائن) نزولًا إلى `smallestUnit` (الافتراضي `'milliseconds'`). ولا تدخل الأسابيع إلا إذا تضمّن الكائن `weeks` أو سمّاها أحد الخيارات. ويُحسب الشهر 30.4375 يومًا والسنة 365.25 يومًا. |
| القيم الكسرية | تُرحَّل إلى الوحدات الأصغر؛ وما يتبقى دون `smallestUnit` يُقرَّب إلى الأقرب والنصف بعيدًا عن الصفر، والوحدة التي يبلغ تقريبها وحدة كاملة مما فوقها تُرحَّل إليها. |
| القيم السالبة | إشارة واحدة في بداية المدة كلها، تُكتب بعلامة السالب الخاصة باللغة مع محرف الاتجاه المصاحب لها؛ والحقول المختلفة الإشارة تُجمع أولًا. |
| الصفر | تُحذف الوحدات الصفرية. والمدة التي تساوي صفرًا أو تُقرَّب إليه تُكتب صفرًا من `smallestUnit`؛ وإلا فمن أصغر حقل في الكائن، أو صفرًا من الثواني مع العدد ومع `{}`. ولا يحمل الصفر إشارة أبدًا. |
| `maxUnits` | يُبقي هذا العدد من الوحدات، محسوبًا من أول وحدة غير صفرية، ويقرّب الأخيرة؛ وتتبع صيغة الجمع العدد بعد التقريب. |
| `style: 'digital'` | صيغة `h:mm:ss` بأرقام اللغة: تظهر الساعات دائمًا، وتُضم الوحدات الأكبر إلى الساعات، وتُقرَّب الميلي ثانية إلى الثانية. ولا تُستخدم `largestUnit` و`smallestUnit` و`maxUnits`. |
| البديل | عند غياب `Intl.DurationFormat` (Node.js قبل 23، وChrome قبل 129، وFirefox قبل 136، وSafari قبل 16.4) تعيد الأنماط `'long'` و`'short'` و`'narrow'` السلاسل نفسها؛ أما `'digital'` فيفصل دائمًا بالنقطتين `:`، في حين يستخدم `Intl.DurationFormat` فاصل اللغة. |
| المدخلات غير الصالحة | مدة ليست عددًا منتهيًا ولا كائنًا عاديًا من أعداد منتهية، أو قيمة غير معروفة لوحدة أو لـ `style` أو `largestUnit` أو `smallestUnit`، أو `largestUnit` أصغر من `smallestUnit`، أو `maxUnits` ليس عددًا صحيحًا لا يقل عن 1، أو `locale` ليس سلسلة نصية: `TypeError` في التطوير و`''` في الإنتاج. أما وسم اللغة غير السليم فيعود إلى رمز اللغة فيه ثم إلى `'en'`. |

## أرقام الهاتف {#phone}

دوال نقية بلا أي استيراد من Vue وبلا اعتماديات خارجية لتطبيع أرقام الهاتف والتحقق منها وتنسيقها بعزل ثنائي الاتجاه لثماني مناطق عربية (`SA` و`AE` و`KW` و`QA` و`BH` و`OM` و`EG` و`JO`). راجع [أرقام الهاتف](/ar/guide/phone-numbers) للاطلاع على الدليل الكامل ومراجع خطط الترقيم الوطنية.

| التصدير | التوقيع | الوصف |
| --- | --- | --- |
| `normalizePhone` | `(value: string, options?: NormalizePhoneOptions) => string` | تحويل الأرقام العربية الهندية والفارسية، وإزالة محارف الاتجاه والمسافات والشرطات والنقاط والأقواس، وقبول `+` و`00` وصفر الاتصال المحلي، ورفض الحروف، وإرجاع صيغة E.164 القياسية (مثل `'+966501234567'`) أو `''`. |
| `validatePhone` | `(value: string, options?: ValidatePhoneOptions) => PhoneValidationResult` | التحقق من الرقم وفق خطة الترقيم لكل هيئة تنظيمية (CST وTDRA وCITRA وCRA وTRA البحرين وTRA عُمان وNTRA وTRC). تعيد `{ valid, e164, region?, type?, reason? }` وتدعم `regions` و`mobileOnly` و`defaultRegion`. |
| `formatPhone` | `(e164: string, options?: FormatPhoneOptions) => string` | تجميع الأرقام وفق اصطلاح كل منطقة، وتطبيق أرقام `locale` أو `numberingSystem`، وتغليف الناتج بـ `U+2066 LRI` ... `U+2069 PDI` عندما يكون `isolate` بقيمة `true` (الافتراضي) فتبقى علامة `+` على اليسار داخل النص العربي. تعيد `''` للمدخلات غير الصالحة. |

```ts
import { formatPhone, normalizePhone, validatePhone } from 'vue-rtl-kit'

normalizePhone('٠٥٠ ١٢٣ ٤٥٦٧', { defaultRegion: 'SA' }) // '+966501234567'
validatePhone('0020 (0)10-1234-5678', { mobileOnly: true })
// { valid: true, e164: '+201012345678', region: 'EG', type: 'mobile' }
formatPhone('+966501234567', { locale: 'ar-EG', numberingSystem: 'arab' })
// '\u2066+٩٦٦ ٥٠ ١٢٣ ٤٥٦٧\u2069'
```

## التنسيق

| التصدير | التوقيع | الوصف |
| --- | --- | --- |
| `formatNumber` | `(value: number, options?: NumberFormatOptions) => string` | التنسيق باستخدام `Intl.NumberFormat`. |
| `formatCurrency` | `(value: number, currency: string, options?: NumberFormatOptions) => string` | تنسيق مبلغ بعملة وفق ISO 4217. |
| `formatNumberRange` | `(start: number \| bigint, end: number \| bigint, options?: NumberFormatOptions) => string` | تنسيق نطاق عددي عبر `formatRange` في `Intl.NumberFormat`؛ يدمج الأجزاء المشتركة مثل رمز العملة. وعند غياب `formatRange` يضم الطرفين معزولين. |
| `formatDate` | `(value: Date \| number \| string, options?: DateFormatOptions) => string` | التنسيق باستخدام `Intl.DateTimeFormat`. |
| `formatDateRange` | `(start: Date \| number \| string, end: Date \| number \| string, options?: DateFormatOptions) => string` | تنسيق نطاق زمني عبر `formatRange` في `Intl.DateTimeFormat`؛ لا تتكرر أجزاء الشهر والسنة المشتركة. وعند غياب `formatRange` يضم الطرفين معزولين. |
| `formatDisplayName` | `(code: string, options: FormatDisplayNameOptions) => string` | تسمية رمز لغة أو منطقة أو عملة أو خط كتابة أو تقويم أو حقل تاريخ ووقت عبر `Intl.DisplayNames`. يعيد الرمز نفسه للرموز غير المعروفة أو غير الصالحة، أو `''` مع `fallback: 'none'`؛ ولا يرمي استثناء أبدًا. |
| `formatList` | `(items: Iterable<string>, options?: ListFormatOptions) => string` | ضم العناصر باستخدام `Intl.ListFormat`؛ ويعزل `isolate` كل عنصر ثم النتيجة كاملة. |
| `formatRelativeTime` | `(value: number, unit: Intl.RelativeTimeFormatUnit, options?: RelativeTimeFormatOptions) => string` | التنسيق باستخدام `Intl.RelativeTimeFormat`؛ ويعيد `''` للقيم غير المنتهية. |
| `formatPlural` | `(count: number, forms: PluralForms, options?: FormatPluralOptions) => string` | اختيار صيغة الجمع وفق CLDR عبر `Intl.PluralRules` واستبدال كل `{count}` بقيمة `formatNumber(count, options)`؛ وتعود الفئات غير المزوّدة بصيغة إلى `forms.other`. يعيد `''` حين تكون `forms.other` فارغة أو حين لا تتوفر `Intl.PluralRules`. |
| `parseNumber` | `(text: string, options?: ParseNumberOptions) => number` | معكوس `formatNumber`: قراءة عدد مكتوب بأرقام اللغة وفواصلها. يعيد `NaN` للنص الفارغ أو غير الصالح ولا يرمي استثناء. |
| `transliterateDigits` | `(text: string, to: 'latn' \| 'arab' \| 'arabext') => string` | تحويل الأرقام فقط في سلسلة نصية موجودة. |
| `withNumberingSystem` | `(locale: string, numberingSystem?: NumberingSystem) => string` | إضافة امتداد اللغة `-u-nu-` في Unicode. |

```ts
import {
  formatCurrency,
  formatDateRange,
  formatDisplayName,
  formatList,
  formatNumber,
  formatNumberRange,
  formatPlural,
  formatRelativeTime,
  parseNumber,
  transliterateDigits,
} from 'vue-rtl-kit'

formatNumber(1234.5, { locale: 'ar-EG', numberingSystem: 'latn' })
formatCurrency(2500, 'EGP', { locale: 'ar-EG', isolate: true })
formatDateRange('2024-03-03', '2024-03-05', { locale: 'ar-EG', dateStyle: 'long', timeZone: 'UTC' }) // '٣–٥ مارس ٢٠٢٤'
formatNumberRange(100, 250, { locale: 'ar-EG', numberingSystem: 'latn', style: 'currency', currency: 'EGP' })
formatList(['Ahmed', 'Sara', 'Omar'], { locale: 'ar', isolate: true })
formatRelativeTime(-3, 'day', { locale: 'ar-EG', numberingSystem: 'latn' })
formatPlural(11, { many: '{count} ملفًا', other: '{count} ملف' }, { locale: 'ar' }) // '11 ملفًا'
formatPlural(3, { few: '{count}rd', other: '{count}th' }, { type: 'ordinal' }) // '3rd'
formatDisplayName('ar', { type: 'language', locale: 'ar' }) // 'العربية'
formatDisplayName('EG', { type: 'region', locale: 'ar' }) // 'مصر'
parseNumber('١٬٢٣٤٫٥', { locale: 'ar-EG' }) // 1234.5
parseNumber('12abc') // NaN
transliterateDigits('طلب رقم 4821', 'arab')
```

تختار `formatPlural` الفئة عبر `Intl.PluralRules` بحسب اللغة — وتستخدم العربية الفئات الست جميعها (`zero` و`one` و`two` و`few` و`many` و`other`)، فالعدد `11` فئته `many` لا `few` — ويحوّل `type: 'ordinal'` إلى قواعد الترتيب (الإنجليزية `1st` و`2nd` و`3rd`). وتختار القيم `NaN` و`Infinity` والسالبة والكسرية الفئة التي تعلنها القواعد دون رمي استثناء. راجع [صيغ الجمع](/ar/guide/use-format#plural-forms).

تستدعي `formatDateRange` و`formatNumberRange` الدالتين `Intl.DateTimeFormat.prototype.formatRange` و`Intl.NumberFormat.prototype.formatRange`، فتستخدم النطاقات فاصل النطاقات الخاص باللغة وتدمج الأجزاء المشتركة (`٣–٥ مارس ٢٠٢٤`، ورمز `ج.م.` واحد لنطاق أسعار عربي كامل) بدل ضم قيمتين منسّقتين بشرطة. وتقبلان الخيارات نفسها الخاصة بـ`formatDate` / `formatNumber`، وتتشاركان ذاكرتي المنسّقات نفسهما، وهما مرتبطتان على `useFormat()`. ويُنسَّق النطاق المعكوس (حين تكون `start` أكبر من `end`) كما هو، مثل `Intl`. أما التاريخ غير الصالح أو العدد غير المنتهي فيرمي `TypeError` في التطوير ويعيد `''` في الإنتاج. وعند غياب `formatRange` في بيئة التشغيل، يُنسَّق الطرفان ويضمان بفاصل النطاقات الخاص باللغة، مع لف كل طرف في معزل يعتمد أول حرف قوي (FSI ... PDI). راجع [نطاقات التواريخ والأرقام](/ar/guide/use-format#ranges).

تسمّي `formatDisplayName` الرموز بكلمات اللغة نفسها — `العربية` بدل `Arabic` و`مصر` بدل `Egypt` — فتبقى قوائم اختيار اللغات والبلدان مترجمة. الخيار `type` مطلوب؛ ويمرَّر `style` (`'long' | 'short' | 'narrow'`) و`languageDisplay` (`'dialect' | 'standard'`) إلى `Intl.DisplayNames`. تعيد الرموز غير المعروفة الرمز نفسه (`fallback: 'code'`، وهو الافتراضي) أو `''` (`fallback: 'none'`)؛ والرموز غير الصالحة وبيئات التشغيل بلا `Intl.DisplayNames` تعيد البديل نفسه بدل رمي استثناء. وفي بيئات التشغيل الأقدم التي يتجاهل فيها `Intl.DisplayNames` الخيار `fallback: 'none'`، لا يمكن تمييز اسم يساوي رمزه (مثل `second` بالإنجليزية أو `US` مع `style: 'narrow'`) عن رمز غير معروف، فيعيد هو أيضًا `''`. راجع [أسماء العرض](/ar/guide/use-format#display-names).

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
  formatNumberRange: (
    start: number | bigint,
    end: number | bigint,
    options?: NumberFormatOptions,
  ) => string
  formatDate: (
    value: Date | number | string,
    options?: DateFormatOptions,
  ) => string
  formatDateRange: (
    start: Date | number | string,
    end: Date | number | string,
    options?: DateFormatOptions,
  ) => string
  formatList: (items: Iterable<string>, options?: ListFormatOptions) => string
  formatRelativeTime: (
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
    options?: RelativeTimeFormatOptions,
  ) => string
  formatPlural: (count: number, forms: PluralForms, options?: FormatPluralOptions) => string
  formatDisplayName: (code: string, options: FormatDisplayNameOptions) => string
  parseNumber: (text: string, options?: ParseNumberOptions) => number
  compareText: typeof compareText
  sortByLocale: typeof sortByLocale
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

interface FormatDisplayNameOptions {
  type: 'language' | 'region' | 'currency' | 'script' | 'calendar' | 'dateTimeField'
  locale?: string
  style?: 'long' | 'short' | 'narrow'
  languageDisplay?: 'dialect' | 'standard'
  fallback?: 'code' | 'none'
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

## أنواع التوجيهات {#نوع-التوجيه}

## أنواع الاختصار

```ts
interface TruncateOptions {
  ellipsis?: string // الافتراضي '…' (U+2026)؛ تُحسب ضمن maxLength
  unit?: 'grapheme' | 'word' // الافتراضي 'grapheme'
  locale?: string // لغة BCP 47 تُمرَّر إلى Intl.Segmenter؛ يعود الوسم غير الصالح إلى الافتراضي لبيئة التشغيل
  isolate?: boolean // الافتراضي false؛ تغليف النتيجة بـ FSI ... PDI
}
```

## أنواع المدد الزمنية

```ts
type DurationUnit = 'years' | 'months' | 'weeks' | 'days' | 'hours' | 'minutes' | 'seconds' | 'milliseconds'
type DurationInput = Partial<Record<DurationUnit, number>>
type DurationStyle = 'long' | 'short' | 'narrow' | 'digital'

interface FormatDurationOptions {
  locale?: string // الافتراضي 'en'؛ يعود الوسم غير السليم إلى رمز اللغة فيه ثم إلى 'en'
  style?: DurationStyle // الافتراضي 'long'
  numberingSystem?: string // الافتراضي: أرقام اللغة نفسها؛ والنظام غير المعروف يعود إلى 'latn'
  largestUnit?: DurationUnit // الافتراضي 'days' مع العدد، وأكبر حقل غير صفري مع الكائن
  smallestUnit?: DurationUnit // الافتراضي 'milliseconds'؛ وهي أيضًا الوحدة التي تُكتب بها المدة الصفرية
  maxUnits?: number // عدد صحيح لا يقل عن 1
}
```

## أنواع أرقام الهاتف

```ts
type PhoneRegion = 'SA' | 'AE' | 'KW' | 'QA' | 'BH' | 'OM' | 'EG' | 'JO'
type PhoneType = 'mobile' | 'fixed'
type PhoneInvalidReason = 'empty' | 'letters' | 'length' | 'prefix' | 'region'

interface NormalizePhoneOptions {
  defaultRegion?: PhoneRegion // المنطقة المفترضة عند غياب + أو 00
}

interface ValidatePhoneOptions {
  regions?: readonly PhoneRegion[] // تقييد المناطق المقبولة؛ وتعمل القائمة ذات العنصر الواحد كـ defaultRegion أيضًا
  mobileOnly?: boolean // الافتراضي false؛ رفض أرقام الهاتف الثابت عند true
  defaultRegion?: PhoneRegion
}

interface PhoneValidationResult {
  valid: boolean
  e164: string // صيغة E.164 القياسية عند الصلاحية (مثل '+966501234567') أو ''
  region?: PhoneRegion
  type?: PhoneType
  reason?: PhoneInvalidReason
}

interface FormatPhoneOptions {
  locale?: string // الافتراضي 'en'
  numberingSystem?: string // 'latn' أو 'arab' أو 'arabext' أو أي نظام أرقام في CLDR
  isolate?: boolean // الافتراضي true؛ تغليف الناتج بـ U+2066 LRI ... U+2069 PDI
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

type DigitsDirectiveValue = { to?: 'latn' | 'arab' | 'arabext'; decimal?: boolean } | undefined
```

الإعدادان الافتراضيان للتوجيه `v-digits` هما `to: 'latn'` و`decimal: false`. إذا فعّلت `decimal: true` مع الإبقاء على الأرقام الغربية، تحوّلت `١٬٢٣٤٫٥` إلى النص `'1234.5'`. يحافظ التوجيه على الأصفار في بداية النص؛ لا تستخدم `v-model.number` إلا إذا أردت أن تحوّل Vue الناتج إلى عدد.

## الخاصية العامة في Vue

يؤدي تثبيت `createRtl()` أيضًا إلى توسيع `ComponentCustomProperties` في Vue بإضافة:

```ts
$rtl: RtlInstance
```

يتيح ذلك استخدام `this.$rtl` في مكونات Options API. أما في `<script setup>`، فيُفضّل استخدام `useRtl()` أو `useDirection()`.
