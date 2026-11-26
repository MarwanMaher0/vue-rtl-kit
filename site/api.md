# API reference

Every export from `src/index.ts` is listed below. Import these names from `vue-rtl-kit` unless a guide shows the separate `vue-rtl-kit/nuxt` or `vue-rtl-kit/styles.css` entry point.

```ts
import { createRtl } from 'vue-rtl-kit'
import type { Direction } from 'vue-rtl-kit'
```

## Store and composables

| Export | Signature | Description |
| --- | --- | --- |
| `createRtl` | `(options?: RtlOptions) => RtlInstance` | Create the root direction store and Vue plugin. |
| `createDirectionState` | `(options: DirectionStateOptions) => DirectionState` | Create standalone reactive direction state. |
| `useDirection` | `() => DirectionContext` | Resolve the nearest scope, root store, or detached fallback. |
| `useRtl` | `() => RtlInstance` | Resolve the root store; throws when the plugin is absent. |
| `useLogicalStyles` | `() => UseLogicalStylesReturn` | Direction-bound logical style helpers. |
| `useFormat` | `() => ComputedRef<BoundFormatters>` | Locale-bound number, currency, date, list, relative-time, and plural formatters, plus `parseNumber`. |
| `useInlineScroll` | `(target: MaybeRefOrGetter<Element \| null \| undefined>, options?: UseInlineScrollOptions) => UseInlineScrollReturn` | Logical inline scroll state and controls for horizontal scrollers in LTR and RTL; SSR-safe. |

See [createRtl](/guide/create-rtl), [useDirection](/guide/use-direction), [useLogicalStyles](/guide/use-logical-styles) (including [Inline scrolling](/guide/use-logical-styles#inline-scrolling)), and [useFormat](/guide/use-format) for examples.

## Components and directives

| Export | Signature | Description |
| --- | --- | --- |
| `BidiText` | `const BidiText: DefineComponent` | Component that isolates reorderable text runs. |
| `RtlProvider` | `const RtlProvider: DefineComponent` | Component that provides a nested direction scope. |
| `vRtl` | `const vRtl: ObjectDirective<HTMLElement, RtlDirectiveValue>` | SSR-aware `v-rtl` implementation. |
| `rtlDirective` | `const rtlDirective: ObjectDirective<HTMLElement, RtlDirectiveValue>` | Alias of `vRtl`. |

The `DefineComponent` values expose the props documented under [BidiText](/guide/bidi-text#props) and [RtlProvider](/guide/rtl-provider#props).

## Injection keys

| Export | Signature | Description |
| --- | --- | --- |
| `rtlInstanceKey` | `InjectionKey<RtlInstance>` | Provide/inject key for the root store. |
| `directionScopeKey` | `InjectionKey<DirectionContext>` | Provide/inject key for the nearest scope. |

## Bidirectional text

| Export | Signature | Description |
| --- | --- | --- |
| `classifyChar` | `(char: string) => 'L' \| 'R' \| 'EN' \| 'AN' \| 'N'` | Classify one character using the library's simplified bidi classes. |
| `detectDirection` | `(text: string, fallback?: Direction) => Direction` | Detect first-strong direction; fallback defaults to `'ltr'`. |
| `hasRtlCharacters` | `(text: string) => boolean` | Test for a strong RTL character. |
| `isMixedDirection` | `(text: string) => boolean` | Test for both strong LTR and RTL characters. |
| `stripBidiControls` | `(text: string) => string` | Remove Unicode bidi control characters. |
| `splitBidiRuns` | `(text: string, baseDir?: Direction) => BidiRun[]` | Split text and mark runs requiring isolation. |
| `isolate` | `(text: string, dir?: DirectionOrAuto) => string` | Wrap a whole string in one isolate; default is `'auto'`. |
| `isolateRuns` | `(text: string, baseDir?: Direction) => string` | Isolate only runs that would be reordered. |
| `LRI` | `'\u2066'` | Left-to-right isolate. |
| `RLI` | `'\u2067'` | Right-to-left isolate. |
| `FSI` | `'\u2068'` | First-strong isolate. |
| `PDI` | `'\u2069'` | Pop directional isolate. |
| `LRM` | `'\u200e'` | Left-to-right mark. |
| `RLM` | `'\u200f'` | Right-to-left mark. |

```ts
import { isolate, isolateRuns, splitBidiRuns } from 'vue-rtl-kit'

isolate('feature/rtl')
isolateRuns('الإصدار v1.2.3 متاح الآن', 'rtl')
splitBidiRuns('آخر تحديث 12-05-2024', 'rtl')
```

## Logical styles

| Export | Signature | Description |
| --- | --- | --- |
| `logicalProperty` | `(property: string, options?: LogicalStyleOptions) => string` | Convert one physical property name while preserving casing. |
| `toLogicalStyle` | `<T extends StyleObject>(style: T, options?: LogicalStyleOptions) => StyleObject` | Convert a physical style object to logical properties. |
| `toPhysicalStyle` | `<T extends StyleObject>(style: T, dir: Direction) => StyleObject` | Resolve logical properties for a direction. |
| `logicalArrow` | `(key: string, dir: Direction) => LogicalArrow \| null` | Map an arrow, `Home`, or `End` key to a direction-aware WAI-ARIA navigation step. |

```ts
import { logicalArrow, logicalProperty, toLogicalStyle, toPhysicalStyle } from 'vue-rtl-kit'

logicalProperty('marginLeft') // marginInlineStart
toLogicalStyle({ textAlign: 'left' }) // { textAlign: 'start' }
toPhysicalStyle({ marginInlineStart: '8px' }, 'rtl')
logicalArrow('ArrowRight', 'rtl') // 'previous'
```

## Inline scroll

Pure, Vue-free helpers that normalise horizontal `scrollLeft` into a single `0..max` scale from inline-start to inline-end in both LTR and RTL. Direction comes from `getComputedStyle(el).direction`, so `dir` islands, `v-rtl`, and `<RtlProvider>` work automatically. Horizontal writing modes (`writing-mode: horizontal-tb`) only. No overflow returns `0` and `{ atStart: true, atEnd: true }`; `null`, SSR, `NaN`, and `Infinity` return `0` or no-op and never throw.

| Export | Signature | Description |
| --- | --- | --- |
| `getScrollInline` | `(el: Element \| null \| undefined) => number` | Distance scrolled from inline-start in px, clamped to `0..max`. |
| `getScrollInlineMax` | `(el: Element \| null \| undefined) => number` | Maximum scrollable inline distance: `max(0, scrollWidth - clientWidth)`. |
| `scrollToInline` | `(el: Element \| null \| undefined, offset: number, options?: ScrollInlineOptions) => void` | Clamp `offset` and call `el.scrollTo` with physical `left`. |
| `scrollByInline` | `(el: Element \| null \| undefined, delta: number, options?: ScrollInlineOptions) => void` | Scroll by signed inline `delta` (positive moves toward inline-end). |
| `scrollInlineEdges` | `(el: Element \| null \| undefined, tolerance?: number) => ScrollInlineEdges` | Report `{ atStart, atEnd }` within `tolerance` px (default `1`). |

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

## Locale helpers

| Export | Signature | Description |
| --- | --- | --- |
| `directionOfLocale` | `(locale: string \| undefined \| null, fallback?: Direction) => Direction` | Infer direction from a BCP-47 language tag; use fallback only for empty or invalid tags. |
| `normaliseLocales` | `(locales: string[] \| LocaleMap \| undefined) => LocaleMap` | Normalize a locale list or map to an explicit map. |
| `resolveDirection` | `(locale: string, locales: LocaleMap, fallback?: Direction) => Direction` | Resolve an exact-tag map override, then a language override, then built-in inference. |
| `oppositeDirection` | `(dir: Direction) => Direction` | Return the opposite direction. |
| `RTL_LANGUAGES` | `ReadonlySet<string>` | Language subtags whose default direction is right-to-left. |

Built-in inference gives an explicit script in the language portion precedence over the language's default direction. Only scripts before the first singleton (a one-character subtag such as `u` or `x`) count. Extensions such as `-u-` and private-use subtags after `-x-` do not supply scripts. Explicit locale-map overrides take precedence over this inference, including explicit scripts.

| Locale input | Built-in direction | Rule |
| --- | --- | --- |
| `az-Arab`, `ha-Arab`, `ku-Arab` | `rtl` | An explicit RTL script wins. |
| `ar-Latn`, `ku-Latn` | `ltr` | An explicit non-RTL script wins. |
| `ar-u-nu-latn`, `he-x-abcd` | `rtl` | Extension and private-use subtags do not override the language's default. |
| `ha`, `ku` | `ltr` | Hausa and Kurdish default to Latin script. |
| `pnb`, `mzn`, `lrc`, `glk`, `bal`, `sdh` | `rtl` | These languages have RTL defaults. |
| `fr`, `qaa` | `ltr` | Well-formed non-RTL or unrecognized languages return `ltr`, even with an `rtl` fallback. |
| `''`, `null`, `undefined`, `en--US` | `fallback` | Empty or invalid tags use the fallback, which defaults to `ltr`. |

Unpinned stores infer direction even for locales absent from their map. An unpinned `RtlProvider` with `locale="fr"` likewise resolves to `ltr` inside an RTL parent unless a map override applies. Locale changes do not change a pinned direction. See [createRtl](/guide/create-rtl#locale-direction-rules) for store behavior.

```ts
import { directionOfLocale, oppositeDirection, resolveDirection } from 'vue-rtl-kit'

directionOfLocale('az-Arab') // rtl
directionOfLocale('ku-Latn') // ltr
oppositeDirection('rtl') // ltr
resolveDirection('ar-EG', { ar: 'rtl' }) // rtl
```

## Search helpers {#search-helpers}

Pure, Vue-free helpers for client-side search across Arabic, Persian, Hebrew, and mixed-script text. Stored strings with hamza variants, harakat, tatweel, Hebrew points, presentation ligatures, or local digits match queries typed with bare letters and ASCII digits. None of the functions ever throws, and **no stemming, root extraction, or fuzzy matching** is performed. See [Text helpers](/guide/text-helpers#search-helpers) for full mapping rules.

| Export | Signature | Description |
| --- | --- | --- |
| `foldSearchText` | `(text: string \| null \| undefined, options?: SearchOptions) => string` | Return the normalised search key (`NFKC`, strip harakat, tatweel, Hebrew points, and bidi controls, fold orthography variants and digits, lowercase Latin, collapse whitespace runs to `' '`). |
| `matchesSearch` | `(text: string \| null \| undefined, query: string \| null \| undefined, options?: SearchOptions) => boolean` | Return `true` when folded `text` contains folded `query`. An empty or marks-only `query` returns `true`; `null` or `undefined` `text` returns `false`. |
| `findSearchMatches` | `(text: string \| null \| undefined, query: string \| null \| undefined, options?: SearchOptions) => SearchMatch[]` | Sorted, non-overlapping UTF-16 `{ start, end }` ranges in the original `text`, with `end` extended over trailing combining marks so `<mark>` never splits a letter from its harakat or niqqud. |

```ts
import { findSearchMatches, foldSearchText, matchesSearch } from 'vue-rtl-kit'

foldSearchText('أَحْمَد عـبـدالله ١٢٣') // 'احمد عبدالله 123'
matchesSearch('فاطمة مصطفى', 'فاطمه مصطفي') // true
matchesSearch('فاطمة', 'فاطمه', { taMarbuta: false }) // false
findSearchMatches('مرحبا مُحَمَّدٌ!', 'محمد') // [{ start: 6, end: 15 }]
```

## Formatting

| Export | Signature | Description |
| --- | --- | --- |
| `formatNumber` | `(value: number, options?: NumberFormatOptions) => string` | Format with `Intl.NumberFormat`. |
| `formatCurrency` | `(value: number, currency: string, options?: NumberFormatOptions) => string` | Format an ISO 4217 currency amount. |
| `formatDate` | `(value: Date \| number \| string, options?: DateFormatOptions) => string` | Format with `Intl.DateTimeFormat`. |
| `formatList` | `(items: Iterable<string>, options?: ListFormatOptions) => string` | Join items with `Intl.ListFormat`; `isolate` wraps each item and the result. |
| `formatRelativeTime` | `(value: number, unit: Intl.RelativeTimeFormatUnit, options?: RelativeTimeFormatOptions) => string` | Format with `Intl.RelativeTimeFormat`; returns `''` for a non-finite value. |
| `formatPlural` | `(count: number, forms: PluralForms, options?: FormatPluralOptions) => string` | Pick the CLDR plural form with `Intl.PluralRules` and replace every `{count}` with `formatNumber(count, options)`; missing categories fall back to `forms.other`. Returns `''` for an empty `forms.other` or when `Intl.PluralRules` is unavailable. |
| `parseNumber` | `(text: string, options?: ParseNumberOptions) => number` | Inverse of `formatNumber`: read a number written with the locale's digits and separators. Returns `NaN` for empty or invalid text; never throws. |
| `transliterateDigits` | `(text: string, to: 'latn' \| 'arab' \| 'arabext') => string` | Convert only digits in an existing string. |
| `withNumberingSystem` | `(locale: string, numberingSystem?: NumberingSystem) => string` | Add a Unicode `-u-nu-` locale extension. |

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

`formatPlural` selects the category with `Intl.PluralRules` for the locale — Arabic uses all six (`zero`, `one`, `two`, `few`, `many`, `other`), so `11` is `many`, not `few` — and `type: 'ordinal'` switches to ordinal rules (English `1st`, `2nd`, `3rd`). `NaN`, `Infinity`, negative, and fractional counts select the category the rules report without throwing. See [Plural forms](/guide/use-format#plural-forms).

`parseNumber` reads its group separator, decimal separator, and minus sign from `Intl.NumberFormat` `formatToParts()` for `locale` and `numberingSystem` (default `'en'`), cached per locale tag. It accepts Western, Arabic-Indic, and Persian digits, ignores bidi marks, isolates, and spaces, accepts `-` or U+2212 as minus and a leading `+`, and divides by 100 for a trailing `%` or `٪`. Group separators are accepted only between digits of the integer part. See [Parsing numbers](/guide/use-format#parsing-numbers) for the full rules.

## Environment

| Export | Signature | Description |
| --- | --- | --- |
| `isClient` | `boolean` | `true` when both `window` and `document` exist. |
| `isServer` | `boolean` | The inverse of `isClient`. |

## Core types

### Direction and locale

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

`persist` (default `false`) saves the locale in the browser on every `setLocale()` and restores it on the next `createRtl()`, under the `persistKey` storage key (default `'rtl-locale'`). Only a configured locale is restored — with no `locales`, any tag `Intl.getCanonicalLocales` accepts — and a pinned `dir` stays pinned. Storage errors are ignored, nothing runs at import time or on the server, and `dispose()` stops the writes. The cookie mode uses `path=/`, `SameSite=Lax`, a one-year `max-age`, and an encoded name and value. The Nuxt module excludes both options and persists through its own `cookie` option instead.

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

### DirectionState and DirectionStateOptions

```ts
type DirectionState = Omit<DirectionContext, 'isRoot'>

interface DirectionStateOptions {
  dir: Direction
  locale: string
  locales?: LocaleMap
  pinned?: boolean
}
```

## Composable types

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

### UseInlineScrollOptions and UseInlineScrollReturn

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

### Format option types

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

## Bidirectional text type

```ts
interface BidiRun {
  text: string
  dir: Direction
  isolated: boolean
  hasStrong: boolean
}
```

## Logical style types

```ts
type LogicalArrow = 'next' | 'previous' | 'first' | 'last' | 'up' | 'down'

interface LogicalStyleOptions {
  size?: boolean
  values?: boolean
  shorthands?: boolean
}

type StyleObject = Record<string, string | number | undefined>
```

## Inline scroll types

```ts
interface ScrollInlineOptions {
  behavior?: ScrollBehavior
}

interface ScrollInlineEdges {
  atStart: boolean
  atEnd: boolean
}
```

## Search types

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

## Directive type

```ts
type RtlDirectiveValue =
  | DirectionOrAuto
  | boolean
  | undefined
  | null
  | { dir?: DirectionOrAuto, isolate?: boolean }
```

## Vue global property

Installing `createRtl()` also augments Vue's `ComponentCustomProperties` with:

```ts
$rtl: RtlInstance
```

This supports `this.$rtl` in Options API components. In `<script setup>`, prefer `useRtl()` or `useDirection()`.
