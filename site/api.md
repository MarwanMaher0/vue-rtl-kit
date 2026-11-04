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
| `useFormat` | `() => ComputedRef<BoundFormatters>` | Locale-bound number, currency, and date formatters. |

See [createRtl](/guide/create-rtl), [useDirection](/guide/use-direction), [useLogicalStyles](/guide/use-logical-styles), and [useFormat](/guide/use-format) for examples.

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

```ts
import { logicalProperty, toLogicalStyle, toPhysicalStyle } from 'vue-rtl-kit'

logicalProperty('marginLeft') // marginInlineStart
toLogicalStyle({ textAlign: 'left' }) // { textAlign: 'start' }
toPhysicalStyle({ marginInlineStart: '8px' }, 'rtl')
```

## Locale helpers

| Export | Signature | Description |
| --- | --- | --- |
| `directionOfLocale` | `(locale: string \| undefined \| null, fallback?: Direction) => Direction` | Resolve a BCP-47 language and script tag. |
| `normaliseLocales` | `(locales: string[] \| LocaleMap \| undefined) => LocaleMap` | Normalize a locale list or map to an explicit map. |
| `resolveDirection` | `(locale: string, locales: LocaleMap, fallback?: Direction) => Direction` | Resolve exact, language, then script-based direction. |
| `oppositeDirection` | `(dir: Direction) => Direction` | Return the opposite direction. |
| `RTL_LANGUAGES` | `ReadonlySet<string>` | Language subtags written right-to-left. |

```ts
import { directionOfLocale, oppositeDirection, resolveDirection } from 'vue-rtl-kit'

directionOfLocale('az-Arab') // rtl
directionOfLocale('ku-Latn') // ltr
oppositeDirection('rtl') // ltr
resolveDirection('ar-EG', { ar: 'rtl' }) // rtl
```

## Formatting

| Export | Signature | Description |
| --- | --- | --- |
| `formatNumber` | `(value: number, options?: NumberFormatOptions) => string` | Format with `Intl.NumberFormat`. |
| `formatCurrency` | `(value: number, currency: string, options?: NumberFormatOptions) => string` | Format an ISO 4217 currency amount. |
| `formatDate` | `(value: Date \| number \| string, options?: DateFormatOptions) => string` | Format with `Intl.DateTimeFormat`. |
| `transliterateDigits` | `(text: string, to: 'latn' \| 'arab' \| 'arabext') => string` | Convert only digits in an existing string. |
| `withNumberingSystem` | `(locale: string, numberingSystem?: NumberingSystem) => string` | Add a Unicode `-u-nu-` locale extension. |

```ts
import { formatCurrency, formatNumber, transliterateDigits } from 'vue-rtl-kit'

formatNumber(1234.5, { locale: 'ar-EG', numberingSystem: 'latn' })
formatCurrency(2500, 'EGP', { locale: 'ar-EG', isolate: true })
transliterateDigits('طلب رقم 4821', 'arab')
```

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

### Format option types

```ts
interface FormatOptionsBase {
  locale?: string
  numberingSystem?: NumberingSystem
  isolate?: boolean | DirectionOrAuto
}

type NumberFormatOptions = FormatOptionsBase & Intl.NumberFormatOptions
type DateFormatOptions = FormatOptionsBase & Intl.DateTimeFormatOptions
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
interface LogicalStyleOptions {
  size?: boolean
  values?: boolean
}

type StyleObject = Record<string, string | number | undefined>
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
