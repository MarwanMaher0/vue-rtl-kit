# useFormat

`useFormat()` binds number, currency, date, list, and relative-time formatters to the current scope's locale and direction. It also applies the `numberingSystem` configured on the root `createRtl()` instance.

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

The computed ref is unwrapped in templates. In script, call methods through `format.value`.

## BoundFormatters

| Member | Signature |
| --- | --- |
| `locale` | `string` |
| `dir` | `Direction` |
| `formatNumber` | `(value: number, options?: NumberFormatOptions) => string` |
| `formatCurrency` | `(value: number, currency: string, options?: NumberFormatOptions) => string` |
| `formatDate` | `(value: Date \| number \| string, options?: DateFormatOptions) => string` |
| `formatList` | `(items: Iterable<string>, options?: ListFormatOptions) => string` |
| `formatRelativeTime` | `(value: number, unit: Intl.RelativeTimeFormatUnit, options?: RelativeTimeFormatOptions) => string` |

Per-call options override the bound locale and numbering system. The bound formatters are recomputed when `setLocale()` changes the scope's locale. `NumberFormatOptions`, `DateFormatOptions`, `ListFormatOptions`, and `RelativeTimeFormatOptions` extend their corresponding `Intl` options with:

| Option | Type | Effect |
| --- | --- | --- |
| `locale` | `string` | BCP-47 locale tag. |
| `numberingSystem` | `NumberingSystem` | For example `'latn'`, `'arab'`, or `'arabext'`. |
| `isolate` | `boolean \| DirectionOrAuto` | Wrap the formatted result in a Unicode isolate. `true` uses first-strong detection. |

```ts
const isolated = format.value.formatDate(updatedAt, {
  locale: 'ar-EG',
  numberingSystem: 'latn',
  dateStyle: 'long',
  isolate: 'ltr',
})
```

## Lists and relative time

`formatList()` wraps `Intl.ListFormat` and accepts its `type` (`'conjunction'`, `'disjunction'`, `'unit'`) and `style` options. `formatRelativeTime()` wraps `Intl.RelativeTimeFormat` and accepts its `numeric` and `style` options; negative values are in the past. Both use the bound locale and numbering system, so Arabic locales get the Arabic conjunction and Arabic-Indic digits unless `numberingSystem: 'latn'` is configured.

With `isolate` set, `formatList()` formats the plain items first, so conjunctions that depend on the next item (Spanish `e`/`u`, Hebrew `ו`) stay correct, then wraps every item in the result in a first-strong isolate, so a Latin name cannot swap places with its Arabic neighbours, and then isolates the whole result with the requested direction.

```ts
formatList(['Ahmed', 'Sara', 'Omar'], { locale: 'ar' }) // 'Ahmed وSara وOmar'
formatList(['PDF', 'CSV'], { locale: 'en', type: 'disjunction' }) // 'PDF or CSV'
formatRelativeTime(-3, 'day', { locale: 'ar-EG' }) // 'قبل ٣ أيام'
formatRelativeTime(-3, 'day', { locale: 'ar-EG', numberingSystem: 'latn' }) // 'قبل 3 أيام'
formatRelativeTime(1, 'day', { locale: 'en', numeric: 'auto' }) // 'tomorrow'

// Each item gets its own first-strong isolate, then the whole list is isolated.
format.value.formatList(['Ahmed Ali', 'سارة'], { isolate: 'rtl' })
```

## Input fallbacks

Underscores in locale tags are normalized to hyphens, so `ar_EG` formats as `ar-EG`. If a tag is invalid, the formatter tries its language subtag and then falls back to `en`. Numbering systems are inserted before a private-use `-x-` section, so `en-x-foo` with `numberingSystem: 'arab'` produces Arabic-Indic digits; unrecognized or empty `numberingSystem` values safely fall back to `'latn'`. `formatDate()` returns an empty string for invalid dates instead of throwing, and `formatRelativeTime()` does the same for a non-finite value such as `NaN` or `Infinity`.

```ts
formatNumber(12, { locale: 'ar_EG' }) // '١٢'
formatNumber(12, { locale: 'en-x-foo', numberingSystem: 'arab' }) // '١٢'
formatNumber(12, { locale: 'ar-EG', numberingSystem: 'invalid' }) // '12'
formatDate('not a date') // ''
formatRelativeTime(NaN, 'day') // ''
```

## Standalone helpers

The same formatting primitives can be used without a component context:

```ts
import {
  formatCurrency,
  formatDate,
  formatList,
  formatNumber,
  formatRelativeTime,
  transliterateDigits,
  withNumberingSystem,
} from 'vue-rtl-kit'

formatNumber(1234.5, { locale: 'ar-EG', numberingSystem: 'latn' })
formatCurrency(2500, 'EGP', { locale: 'ar-EG' })
formatDate('2024-05-12', { locale: 'ar-SA', calendar: 'islamic-umalqura' })
formatList(['PDF', 'CSV'], { locale: 'en', type: 'disjunction' })
formatRelativeTime(2, 'hour', { locale: 'ar-EG' })
transliterateDigits('طلب رقم 4821', 'arab')
withNumberingSystem('ar-EG', 'latn')
```
