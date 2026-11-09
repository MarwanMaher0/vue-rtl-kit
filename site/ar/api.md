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
| `useFormat` | `() => ComputedRef<BoundFormatters>` | أدوات تنسيق الأرقام والعملات والتواريخ المرتبطة باللغة. |

راجع [createRtl](/ar/guide/create-rtl) و[useDirection](/ar/guide/use-direction) و[useLogicalStyles](/ar/guide/use-logical-styles) و[useFormat](/ar/guide/use-format) للاطلاع على أمثلة.

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

```ts
import { logicalProperty, toLogicalStyle, toPhysicalStyle } from 'vue-rtl-kit'

logicalProperty('marginLeft') // marginInlineStart
toLogicalStyle({ textAlign: 'left' }) // { textAlign: 'start' }
toPhysicalStyle({ marginInlineStart: '8px' }, 'rtl')
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

## التنسيق

| التصدير | التوقيع | الوصف |
| --- | --- | --- |
| `formatNumber` | `(value: number, options?: NumberFormatOptions) => string` | التنسيق باستخدام `Intl.NumberFormat`. |
| `formatCurrency` | `(value: number, currency: string, options?: NumberFormatOptions) => string` | تنسيق مبلغ بعملة وفق ISO 4217. |
| `formatDate` | `(value: Date \| number \| string, options?: DateFormatOptions) => string` | التنسيق باستخدام `Intl.DateTimeFormat`. |
| `transliterateDigits` | `(text: string, to: 'latn' \| 'arab' \| 'arabext') => string` | تحويل الأرقام فقط في سلسلة نصية موجودة. |
| `withNumberingSystem` | `(locale: string, numberingSystem?: NumberingSystem) => string` | إضافة امتداد اللغة `-u-nu-` في Unicode. |

```ts
import { formatCurrency, formatNumber, transliterateDigits } from 'vue-rtl-kit'

formatNumber(1234.5, { locale: 'ar-EG', numberingSystem: 'latn' })
formatCurrency(2500, 'EGP', { locale: 'ar-EG', isolate: true })
transliterateDigits('طلب رقم 4821', 'arab')
```

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
}
```

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
  toPhysical: (style: StyleObject) => StyleObject
  property: (name: string, options?: LogicalStyleOptions) => string
  mirror: (value: number) => number
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
interface LogicalStyleOptions {
  size?: boolean
  values?: boolean
  shorthands?: boolean
}

type StyleObject = Record<string, string | number | undefined>
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
