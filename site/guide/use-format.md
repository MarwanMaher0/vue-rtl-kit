# useFormat

`useFormat()` binds number, currency, date, list, and relative-time formatters, and the `parseNumber()` number parser, to the current scope's locale and direction. It also applies the `numberingSystem` configured on the root `createRtl()` instance.

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
| `parseNumber` | `(text: string, options?: ParseNumberOptions) => number` |

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

## Parsing numbers {#parsing-numbers}

`parseNumber()` is the inverse of `formatNumber()` for form input. `Number()` returns `NaN` for what `formatNumber()` writes in `ar-EG`, `fa-IR`, `he`, `de`, or `fr`, because of the digits, the separators, or an invisible bidi mark before the minus sign. `parseNumber()` reads that text back, and returns `NaN` instead of throwing when it is not a number.

```ts
function parseNumber(text: string, options?: ParseNumberOptions): number

interface ParseNumberOptions {
  locale?: string
  numberingSystem?: NumberingSystem
}
```

The group separator, decimal separator, and minus sign are read from `Intl.NumberFormat` `formatToParts()` for the locale and numbering system, and cached per locale tag; there is no separator table. Pass the same `locale` and `numberingSystem` you format with. The bound `format.value.parseNumber()` already does.

- **Digits**: Western (`0-9`), Arabic-Indic (`٠-٩`), and Persian (`۰-۹`) digits are read in every locale, along with the digits of the locale's own numbering system.
- **Ignored characters**: the bidi marks U+061C, U+200E, and U+200F, the isolates U+2066 to U+2069, the no-break space, the narrow no-break space U+202F, and ordinary spaces are removed first. That covers the marks `Intl` adds, the isolates `isolate: true` adds, and space group separators. Embeddings and overrides (U+202A to U+202E) are not removed, because an override can display `12` for text that reads `21`.
- **Sign**: a leading ASCII hyphen, U+2212, or the locale's minus sign makes the number negative. A leading `+` is allowed.
- **Percent**: a trailing `%` or `٪` (U+066A) divides the result by 100. The decimal point is moved exactly, so `5.6%` gives `0.056`.
- **Group separators** are accepted only between two digits of the integer part. Group sizes are not checked, so `en-IN` lakh grouping such as `12,34,567` parses, and so does `1,2` (as `12`). In `de`, `1.5` is `15`, because `.` groups.
- **Space group separators**: where the locale groups with a space, as `fr` and `sv` do, a space, no-break space, or narrow no-break space between two digits is the group separator and follows the same rule, so `1 234,5` parses and `1,2 3` is `NaN`. Spaces anywhere else, such as before a percent sign, are still ignored.
- **Decimal separator**: at most one. `.5` and `5.` are accepted, as `Number()` accepts them.
- **`NaN`** for an empty string, letters, currency symbols, exponents such as `1e5`, a separator the locale does not use, a second decimal separator, a separator on its own, a sign or percent sign in the wrong place, and anything that is not a string.

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

An Arabic locale formatted with Arabic-Indic digits separates with `٬` and `٫`, so `1,234.5` is not a number there. Integers typed with Western digits still parse. If the field should accept Western-style separators, parse with `numberingSystem: 'latn'`, or set it once in `createRtl()` so that formatting and parsing agree.

Bind the text of an input and read the number from a computed value:

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

## Input fallbacks

Underscores in locale tags are normalized to hyphens, so `ar_EG` formats as `ar-EG`. If a tag is invalid, the formatter tries its language subtag and then falls back to `en`. Numbering systems are inserted before a private-use `-x-` section, so `en-x-foo` with `numberingSystem: 'arab'` produces Arabic-Indic digits; unrecognized or empty `numberingSystem` values safely fall back to `'latn'`. `formatDate()` returns an empty string for invalid dates instead of throwing, and `formatRelativeTime()` does the same for a non-finite value such as `NaN` or `Infinity`. `parseNumber()` uses the same locale and numbering-system fallbacks and returns `NaN` for text it cannot read.

```ts
formatNumber(12, { locale: 'ar_EG' }) // '١٢'
formatNumber(12, { locale: 'en-x-foo', numberingSystem: 'arab' }) // '١٢'
formatNumber(12, { locale: 'ar-EG', numberingSystem: 'invalid' }) // '12'
formatDate('not a date') // ''
formatRelativeTime(NaN, 'day') // ''
parseNumber('١٢', { locale: 'ar_EG' }) // 12
parseNumber('not a number') // NaN
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
  parseNumber,
  transliterateDigits,
  withNumberingSystem,
} from 'vue-rtl-kit'

formatNumber(1234.5, { locale: 'ar-EG', numberingSystem: 'latn' })
formatCurrency(2500, 'EGP', { locale: 'ar-EG' })
formatDate('2024-05-12', { locale: 'ar-SA', calendar: 'islamic-umalqura' })
formatList(['PDF', 'CSV'], { locale: 'en', type: 'disjunction' })
formatRelativeTime(2, 'hour', { locale: 'ar-EG' })
parseNumber('١٬٢٣٤٫٥', { locale: 'ar-EG' })
transliterateDigits('طلب رقم 4821', 'arab')
withNumberingSystem('ar-EG', 'latn')
```
