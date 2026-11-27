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
| `useFormat` | `() => ComputedRef<BoundFormatters>` | Locale-bound number, currency, date, list, relative-time, and plural formatters, the `formatDateRange` and `formatNumberRange` range formatters, plus `formatDisplayName`, `parseNumber`, `compareText`, and `sortByLocale`. |
| `useInlineScroll` | `(target: MaybeRefOrGetter<Element \| null \| undefined>, options?: UseInlineScrollOptions) => UseInlineScrollReturn` | Logical inline scroll state and controls for horizontal scrollers in LTR and RTL; SSR-safe. |
| `useLogicalPlacement` | `(placement: MaybeRefOrGetter<LogicalPlacement>, target?: Ref<HTMLElement \| null>) => ComputedRef<PhysicalPlacement>` | Resolve a reactive [logical placement](#logical-placement) against the target's computed direction, or the current direction scope when no target is mounted or during SSR. |

See [createRtl](/guide/create-rtl), [useDirection](/guide/use-direction), [useLogicalStyles](/guide/use-logical-styles) (including [Inline scrolling](/guide/use-logical-styles#inline-scrolling)), and [useFormat](/guide/use-format) for examples.

## Components and directives

| Export | Signature | Description |
| --- | --- | --- |
| `BidiText` | `const BidiText: DefineComponent` | Component that isolates reorderable text runs. |
| `RtlProvider` | `const RtlProvider: DefineComponent` | Component that provides a nested direction scope. |
| `vRtl` | `const vRtl: ObjectDirective<HTMLElement, RtlDirectiveValue>` | SSR-aware `v-rtl` implementation. |
| `rtlDirective` | `const rtlDirective: ObjectDirective<HTMLElement, RtlDirectiveValue>` | Alias of `vRtl`. |
| `vDigits` | `v-digits` or `v-digits="{ to, decimal }"` | Convert digits on input and paste before `v-model` reads the field. See the [v-digits guide](/guide/v-digits). |
| `digitsDirective` | `typeof vDigits` | Alias of `vDigits`. |

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

## Logical placement {#logical-placement}

Use these helpers for tooltips, menus, and popovers in horizontal writing modes. The two converters are pure and do not import Vue.

| Export | Signature | Description |
| --- | --- | --- |
| `resolvePlacement` | `(placement: LogicalPlacement \| PhysicalPlacement, dir: Direction) => PhysicalPlacement` | Map `inline-start`/`inline-end` to physical sides; interpret shared `top`/`bottom` suffixes as logical. |
| `toLogicalPlacement` | `(physical: PhysicalPlacement, dir: Direction) => LogicalPlacement` | Convert a physical placement to the logical placement that resolves back to it for the same direction. |

`inline-start` is left in LTR and right in RTL; `inline-end` is the opposite. On these sides, `-start`/`-end` align vertically and do not swap. Explicit `left`/`right` placements pass through unchanged. For `top` and `bottom`, the side does not change, but RTL swaps `-start` and `-end`; even though the names are shared between the two types, `resolvePlacement` treats their suffixes as logical. Invalid placement strings throw a `TypeError` in development and fall back to `'bottom'` in production.

```ts
import { resolvePlacement, toLogicalPlacement } from 'vue-rtl-kit'

resolvePlacement('inline-end-start', 'rtl') // 'left-start'
resolvePlacement('right-start', 'rtl') // 'right-start'
resolvePlacement('bottom-start', 'rtl') // 'bottom-end'
toLogicalPlacement('left-start', 'rtl') // 'inline-end-start'
toLogicalPlacement('bottom-end', 'rtl') // 'bottom-start'
```

`useLogicalPlacement(placement, target?)` accepts a value, ref, or getter. Pass the anchor's template ref as `target` to use its computed CSS `direction`. The composable reacts to `dir`, `class`, and `style` changes on the target or its ancestors. It does not watch stylesheets: adding, editing, or toggling a stylesheet rule without changing those attributes does not trigger a placement update. For a live CSS override, toggle a class on the target or an ancestor instead. Without a mounted target, including on the server, it uses the direction from `useDirection()` (the nearest provider, then the app store or detached fallback).

**Floating UI:** Pass a logical `top`/`bottom` suffix (such as `'bottom-start'`) directly when the floating element has the intended direction: Floating UI interprets the suffix using that element's direction. To pass an already resolved `top`/`bottom` suffix, set `direction: ltr` on the positioning wrapper and set the intended direction on an inner content element to avoid a second flip. See the [Floating UI example](https://github.com/MarwanMaher0/vue-rtl-kit#floating-ui-example).

```ts
type Placement<Side extends string> = Side | `${Side}-${'start' | 'end'}`
type LogicalPlacement = Placement<'top' | 'bottom' | 'inline-start' | 'inline-end'>
type PhysicalPlacement = Placement<'top' | 'bottom' | 'left' | 'right'>
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

## Locale-aware sorting {#locale-aware-sorting}

Pure helpers for comparing or sorting display text with a bounded cache of `Intl.Collator` instances. They preserve the locale's letter ordering instead of applying [search folding](#search-helpers). Import the standalone helpers explicitly in Nuxt.

| Export | Signature | Description |
| --- | --- | --- |
| `compareText` | `(a: string, b: string, options?: CompareOptions) => number` | Negative if `a` comes before `b`, zero if they compare equally, and positive otherwise. Only the sign is guaranteed, not exact values such as `-1` or `1`. |
| `sortByLocale` | `<T>(items: readonly T[], options?: CompareOptions & { key?: (item: T) => string }) => T[]` | Return a new array without modifying the input. Equal keys keep their input order. A string item is its own key; for objects pass a `key` callback. |

### CompareOptions

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `locale` | `string \| string[]` | `'en'` for standalone calls | A BCP-47 tag or an ordered list of preferred tags. The methods on `useFormat().value` default to the current scope locale; pass either form to override it for one call. |
| `numeric` | `boolean` | `true` | Compare digit runs by value, treating Western (`0`–`9`), Arabic-Indic (`٠`–`٩`), and Persian (`۰`–`۹`) digits with the same value as equal. Set `false` to use text ordering rather than numeric ordering. |
| `ignoreDiacritics` | `boolean` | `true` | Strip only Arabic tashkeel (`U+064B`–`U+0652`, `U+0670`) and tatweel (`U+0640`) before comparing. Set `false` to skip stripping. Plain alef, hamza forms, madda, Latin accents, and case all follow the locale's rules in either mode. |
| `caseFirst` | `'upper' \| 'lower' \| 'false'` | `'false'` | Give uppercase or lowercase priority when letters otherwise compare equally. `'false'` sets no case priority but still compares case. |
| `direction` | `'asc' \| 'desc'` | `'asc'` | Ascending or descending comparison. Actual empty strings (`''`) always come first. `null` or `undefined` keys throw `TypeError` in development and always come last in production, even when descending. |

```ts
import { compareText, sortByLocale } from 'vue-rtl-kit'

compareText('مُحَمَّد', 'مـحمد', { locale: 'ar' }) // 0
compareText('احمد', 'أحمد', { locale: 'ar' }) !== 0 // true
compareText('طلب 2', 'طلب ۲', { locale: 'ar' }) // 0
sortByLocale(['طلب ٢', '', 'طلب ١٠'], { locale: ['ar-EG', 'ar', 'en'], direction: 'desc' })
// ['', 'طلب ١٠', 'طلب ٢']
```

See [Text helpers](/guide/text-helpers#locale-aware-sorting) for examples with object keys and [useFormat](/guide/use-format#locale-aware-sorting) for reactive sorting.

## Truncation {#truncate-text}

Pure, Vue-free truncation that counts and cuts by grapheme clusters with `Intl.Segmenter`, so a cut never separates a base letter from its tashkeel or niqqud, an emoji ZWJ sequence, or a flag. The ellipsis counts inside `maxLength`; trailing whitespace and tatweel (`U+0640`) are trimmed before it. See [Truncating text](/guide/truncate-text) for the full guide.

| Export | Signature | Description |
| --- | --- | --- |
| `truncateText` | `(text: string, maxLength: number, options?: TruncateOptions) => string` | Shorten `text` to at most `maxLength` grapheme clusters, ellipsis included. Text that fits is returned unchanged. `unit: 'word'` cuts at the last word boundary that fits with a grapheme fallback; `isolate: true` wraps every result — fitting text, truncated text, and the ellipsis-only result — in `FSI ... PDI`. An invalid `locale` tag falls back to the runtime default locale. Without `Intl.Segmenter` it falls back to code points (surrogate pairs stay intact), with word mode cutting at the last whitespace boundary that fits. `maxLength` below 1 or not an integer throws `TypeError` in development and returns the ellipsis in production (isolated when requested). |

```ts
import { truncateText } from 'vue-rtl-kit'

truncateText('مُحَمَّدٌ عَبْدُ اللَّهِ', 5) // 'مُحَمَّدٌ…'
truncateText('مرحبا بالعالم يا أصدقاء', 14, { unit: 'word' }) // 'مرحبا بالعالم…'
truncateText('الإصدار v1.2.3 متاح الآن', 12, { unit: 'word', isolate: true }) // '\u2068الإصدار\u2026\u2069'
truncateText('👨‍👩‍👧‍👦🇪🇬🎉🎉', 3) // '👨‍👩‍👧‍👦🇪🇬…'
```

## Formatting

| Export | Signature | Description |
| --- | --- | --- |
| `formatNumber` | `(value: number, options?: NumberFormatOptions) => string` | Format with `Intl.NumberFormat`. |
| `formatCurrency` | `(value: number, currency: string, options?: NumberFormatOptions) => string` | Format an ISO 4217 currency amount. |
| `formatNumberRange` | `(start: number \| bigint, end: number \| bigint, options?: NumberFormatOptions) => string` | Format a range with `Intl.NumberFormat` `formatRange`; collapses shared parts such as the currency symbol. Falls back to an isolated join without `formatRange`. |
| `formatDate` | `(value: Date \| number \| string, options?: DateFormatOptions) => string` | Format with `Intl.DateTimeFormat`. |
| `formatDateRange` | `(start: Date \| number \| string, end: Date \| number \| string, options?: DateFormatOptions) => string` | Format a range with `Intl.DateTimeFormat` `formatRange`; shared month/year parts are not repeated. Falls back to an isolated join without `formatRange`. |
| `formatDisplayName` | `(code: string, options: FormatDisplayNameOptions) => string` | Name a language, region, currency, script, calendar, or date-time field code with `Intl.DisplayNames`. Unknown or invalid codes return the code itself, or `''` with `fallback: 'none'`; never throws. |
| `formatList` | `(items: Iterable<string>, options?: ListFormatOptions) => string` | Join items with `Intl.ListFormat`; `isolate` wraps each item and the result. |
| `formatRelativeTime` | `(value: number, unit: Intl.RelativeTimeFormatUnit, options?: RelativeTimeFormatOptions) => string` | Format with `Intl.RelativeTimeFormat`; returns `''` for a non-finite value. |
| `formatPlural` | `(count: number, forms: PluralForms, options?: FormatPluralOptions) => string` | Pick the CLDR plural form with `Intl.PluralRules` and replace every `{count}` with `formatNumber(count, options)`; missing categories fall back to `forms.other`. Returns `''` for an empty `forms.other` or when `Intl.PluralRules` is unavailable. |
| `parseNumber` | `(text: string, options?: ParseNumberOptions) => number` | Inverse of `formatNumber`: read a number written with the locale's digits and separators. Returns `NaN` for empty or invalid text; never throws. |
| `transliterateDigits` | `(text: string, to: 'latn' \| 'arab' \| 'arabext') => string` | Convert only digits in an existing string. |
| `withNumberingSystem` | `(locale: string, numberingSystem?: NumberingSystem) => string` | Add a Unicode `-u-nu-` locale extension. |

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

`formatPlural` selects the category with `Intl.PluralRules` for the locale — Arabic uses all six (`zero`, `one`, `two`, `few`, `many`, `other`), so `11` is `many`, not `few` — and `type: 'ordinal'` switches to ordinal rules (English `1st`, `2nd`, `3rd`). `NaN`, `Infinity`, negative, and fractional counts select the category the rules report without throwing. See [Plural forms](/guide/use-format#plural-forms).

`formatDateRange` and `formatNumberRange` call `Intl.DateTimeFormat.prototype.formatRange` and `Intl.NumberFormat.prototype.formatRange`, so ranges use the locale's range separator and collapse shared parts (`٣–٥ مارس ٢٠٢٤`, one `ج.م.` for an Arabic price range) instead of joining two formatted values with a hyphen. They take the same options as `formatDate` / `formatNumber`, share their formatter caches, and are bound on `useFormat()`. A reversed range (`start` greater than `end`) formats as given, like `Intl`. An invalid date or non-finite number throws a `TypeError` in development and returns `''` in production. Without `formatRange` in the runtime, both ends are formatted and joined with the locale's range separator, each end wrapped in a first-strong isolate (FSI ... PDI). See [Date and number ranges](/guide/use-format#ranges).

`formatDisplayName` names codes in the locale's own words — `العربية` instead of `Arabic`, `مصر` instead of `Egypt` — so language and country pickers stay localized. `type` is required; `style` (`'long' | 'short' | 'narrow'`) and `languageDisplay` (`'dialect' | 'standard'`) are forwarded to `Intl.DisplayNames`. Unknown codes return the code itself (`fallback: 'code'`, the default) or `''` (`fallback: 'none'`); invalid codes and runtimes without `Intl.DisplayNames` return the same fallback instead of throwing. On older runtimes whose `Intl.DisplayNames` ignores `fallback: 'none'`, a name that equals its code (for example `second` in English or `US` with `style: 'narrow'`) cannot be told apart from an unknown code, so it also returns `''`. See [Display names](/guide/use-format#display-names).

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

## Directive types {#directive-type}

## Truncation types

```ts
interface TruncateOptions {
  ellipsis?: string // default '…' (U+2026); counts inside maxLength
  unit?: 'grapheme' | 'word' // default 'grapheme'
  locale?: string // BCP 47 locale for Intl.Segmenter; invalid tags fall back to the runtime default
  isolate?: boolean // default false; wrap the result in FSI ... PDI
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

type DigitsDirectiveValue = { to?: 'latn' | 'arab' | 'arabext'; decimal?: boolean } | undefined
```

`v-digits` defaults to `to: 'latn'` and `decimal: false`. With `decimal: true`, `١٬٢٣٤٫٥` becomes `'1234.5'` with the default target. Other text, including leading zeros, is preserved; use `v-model.number` only if you want Vue to coerce the result.

## Vue global property

Installing `createRtl()` also augments Vue's `ComponentCustomProperties` with:

```ts
$rtl: RtlInstance
```

This supports `this.$rtl` in Options API components. In `<script setup>`, prefer `useRtl()` or `useDirection()`.
