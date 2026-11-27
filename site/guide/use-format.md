# useFormat

`useFormat()` binds number, currency, date, list, relative-time, and plural formatters, the `formatDateRange()` and `formatNumberRange()` range formatters, the `formatDisplayName()` display-name helper, and the `parseNumber()` number parser, to the current scope's locale and direction. It also applies the `numberingSystem` configured on the root `createRtl()` instance. The `compareText()` and `sortByLocale()` methods follow the scope locale for comparison and sorting.

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
| `formatNumberRange` | `(start: number \| bigint, end: number \| bigint, options?: NumberFormatOptions) => string` |
| `formatDate` | `(value: Date \| number \| string, options?: DateFormatOptions) => string` |
| `formatDateRange` | `(start: Date \| number \| string, end: Date \| number \| string, options?: DateFormatOptions) => string` |
| `formatList` | `(items: Iterable<string>, options?: ListFormatOptions) => string` |
| `formatRelativeTime` | `(value: number, unit: Intl.RelativeTimeFormatUnit, options?: RelativeTimeFormatOptions) => string` |
| `formatPlural` | `(count: number, forms: PluralForms, options?: FormatPluralOptions) => string` |
| `formatDisplayName` | `(code: string, options: FormatDisplayNameOptions) => string` |
| `parseNumber` | `(text: string, options?: ParseNumberOptions) => number` |
| `compareText` | `(a: string, b: string, options?: CompareOptions) => number` |
| `sortByLocale` | `<T>(items: readonly T[], options?: CompareOptions & { key?: (item: T) => string }) => T[]` |

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

## Date and number ranges {#ranges}

`formatDateRange()` and `formatNumberRange()` wrap `Intl.DateTimeFormat.prototype.formatRange` and `Intl.NumberFormat.prototype.formatRange`. Joining two formatted values with a hyphen — the usual booking, schedule, and pricing shortcut — repeats the shared month or currency, uses the wrong range separator for the locale, and breaks the visual order in RTL: a hyphen-minus between Western digits keeps the whole range one LTR run, so the start endpoint renders on the left inside an RTL card. `formatRange` applies the locale's own range pattern instead: shared parts collapse, and the separator (an en dash, or `تا` in Persian) resolves correctly in an RTL paragraph, with the start endpoint read first on the right.

```ts
function formatDateRange(
  start: Date | number | string,
  end: Date | number | string,
  options?: DateFormatOptions,
): string

function formatNumberRange(
  start: number | bigint,
  end: number | bigint,
  options?: NumberFormatOptions,
): string
```

`formatDateRange()` accepts a `Date`, a timestamp, or an ISO string for each end and the same options as `formatDate()` — including `calendar` and `timeZone`. `formatNumberRange()` accepts `number` or `bigint` ends and the same options as `formatNumber()` (currency, unit, compact). Both share the existing `formatDate` / `formatNumber` formatter caches, so a range call reuses the same `Intl` instance and `formatterCacheStats()` gains no new key.

```ts
formatDateRange('2024-03-03', '2024-03-05', { locale: 'ar-EG', dateStyle: 'long', timeZone: 'UTC' }) // '٣–٥ مارس ٢٠٢٤' — one month, one year
formatDateRange('2024-03-03', '2024-03-05', { locale: 'en', dateStyle: 'long', timeZone: 'UTC' }) // 'March 3 – 5, 2024'
formatDateRange('2024-03-03', '2024-03-05', { locale: 'fa', dateStyle: 'long', timeZone: 'UTC' }) // '۱۳ تا ۱۵ اسفند ۱۴۰۲'
formatDateRange('2023-12-30', '2024-01-02', { locale: 'ar-EG', dateStyle: 'long', timeZone: 'UTC' }) // '٣٠ ديسمبر ٢٠٢٣ – ٢ يناير ٢٠٢٤'

formatNumberRange(100, 250, { locale: 'ar-EG', numberingSystem: 'latn' }) // '100–250'
formatNumberRange(100, 250, { locale: 'ar-EG', numberingSystem: 'latn', style: 'currency', currency: 'EGP' }) // one ج.م. symbol for the whole range
formatNumberRange(5, 12, { locale: 'en', style: 'unit', unit: 'kilometer' }) // '5–12 km'
formatNumberRange(1200, 3500, { locale: 'en', notation: 'compact' }) // '1.2K – 3.5K'
formatNumberRange(10n, 25n, { locale: 'en' }) // '10–25'

// Bound to the scope locale and the configured numbering system.
format.value.formatDateRange(checkIn, checkOut, { dateStyle: 'long' })
format.value.formatNumberRange(minPrice, maxPrice, { style: 'currency', currency: 'EGP' })
```

- **Reversed ranges**: a `start` greater than `end` is formatted as given, exactly like `Intl` — no throw and no silent swap.
- **Equal ends**: `Intl` collapses them — a same-day date range prints one date, and equal numbers use the locale's approximate pattern (such as `~100` in English).
- **Invalid input**: an invalid date or a non-finite number (`NaN`, `Infinity`) throws a `TypeError` in development and returns an empty string in production.
- **Fallback**: on runtimes without `formatRange`, both ends are formatted and joined with the locale's range separator — a spaced en dash for dates (` تا ` in Persian), an unspaced en dash for numbers — and each end is wrapped in a first-strong isolate (FSI ... PDI) so the endpoints keep their reading order in an RTL paragraph.

## Plural forms {#plural-forms}

`formatPlural()` picks the message form for a count with `Intl.PluralRules`, instead of `n === 1 ? singular : plural`, which is wrong for Arabic: Arabic has six plural categories, and `11` takes `many`, not `few`. Hebrew has a `two` category, Persian counts `0` as `one`, and English ordinals (`1st`, `2nd`, `3rd`) are a different rule set again.

```ts
function formatPlural(count: number, forms: PluralForms, options?: FormatPluralOptions): string

interface PluralForms extends Partial<Record<'zero' | 'one' | 'two' | 'few' | 'many' | 'other', string>> {
  other: string
}

type FormatPluralOptions = FormatOptionsBase & { type?: 'cardinal' | 'ordinal' }
```

`forms` maps CLDR plural categories to message text; `other` is the only required form, and any category without a form of its own falls back to it. Every `{count}` in the chosen form is replaced with `formatNumber(count, options)`, so the bound numbering system applies and `isolate` wraps the number inside the sentence. Text without `{count}` is returned as is.

| Count (`ar`) | Category | Example form |
| --- | --- | --- |
| `0` | `zero` | `لا ملفات` |
| `1` | `one` | `ملف واحد` |
| `2` | `two` | `ملفان` |
| `3`–`10` | `few` | `{count} ملفات` |
| `11`–`99` | `many` | `{count} ملفًا` |
| `100`, `101`, … | `other` | `{count} ملف` |

```ts
const files = {
  zero: 'لا ملفات',
  one: 'ملف واحد',
  two: 'ملفان',
  few: '{count} ملفات',
  many: '{count} ملفًا',
  other: '{count} ملف',
}

formatPlural(0, files, { locale: 'ar' }) // 'لا ملفات'
formatPlural(1, files, { locale: 'ar' }) // 'ملف واحد'
formatPlural(2, files, { locale: 'ar' }) // 'ملفان'
formatPlural(3, files, { locale: 'ar' }) // '3 ملفات'
formatPlural(11, files, { locale: 'ar' }) // '11 ملفًا'
formatPlural(100, files, { locale: 'ar' }) // '100 ملف'
formatPlural(3, files, { locale: 'ar-EG' }) // '٣ ملفات'
formatPlural(11, files, { locale: 'ar-EG', numberingSystem: 'latn' }) // '11 ملفًا'

// Missing categories fall back to other.
formatPlural(11, { other: '{count} ملف' }, { locale: 'ar' }) // '11 ملف'

// Ordinal rules: English 1st, 2nd, 3rd, 4th…
formatPlural(3, { few: '{count}rd', other: '{count}th' }, { type: 'ordinal' }) // '3rd'

// Bound to the scope locale and the configured numbering system.
format.value.formatPlural(11, files)
```

`NaN`, `Infinity`, negative, and fractional counts select the category `Intl.PluralRules` reports (usually `other`) without throwing. An empty `forms.other`, or a runtime without `Intl.PluralRules`, returns an empty string. The rules instances are cached per locale and `type` in the same bounded LRU as the other formatters.

## Display names {#display-names}

`formatDisplayName()` wraps `Intl.DisplayNames` so language and country pickers show names in the page's language instead of English: `العربية` rather than `Arabic`, `مصر` rather than `Egypt`.

```ts
function formatDisplayName(code: string, options: FormatDisplayNameOptions): string

interface FormatDisplayNameOptions {
  type: 'language' | 'region' | 'currency' | 'script' | 'calendar' | 'dateTimeField'
  locale?: string
  style?: 'long' | 'short' | 'narrow'
  languageDisplay?: 'dialect' | 'standard'
  fallback?: 'code' | 'none'
}
```

`type` is required and says what the code identifies. `style` shortens the name where the locale has a shorter form; `languageDisplay` applies to `type: 'language'` only — `'dialect'` (the default) prefers dialect names such as "American English", `'standard'` composes "English (United States)".

```ts
formatDisplayName('ar', { type: 'language', locale: 'ar' }) // 'العربية'
formatDisplayName('fa', { type: 'language', locale: 'fa' }) // 'فارسی'
formatDisplayName('he', { type: 'language', locale: 'he' }) // 'עברית'
formatDisplayName('EG', { type: 'region', locale: 'ar' }) // 'مصر'
formatDisplayName('EGP', { type: 'currency', locale: 'ar' }) // 'جنيه مصري'
formatDisplayName('Arab', { type: 'script', locale: 'en' }) // 'Arabic'
formatDisplayName('ar-EG', { type: 'language', locale: 'en', languageDisplay: 'standard' }) // 'Arabic (Egypt)'
```

An unknown code returns the code itself (`fallback: 'code'`, the default) or an empty string (`fallback: 'none'`). A structurally invalid code, or a runtime without `Intl.DisplayNames`, returns the same fallback instead of throwing. Locale tags get the same underscore normalization and language-subtag / `en` fallback as the other formatters, and instances are cached per locale and options in the same bounded LRU.

The bound `format.value.formatDisplayName()` follows `setLocale()`, so by default it names codes in the current locale. A language picker usually wants autonyms instead — each option named in its own language, whatever the current locale — so pass `locale: tag` per call. Display names are words, not numbers: the bound `numberingSystem` and `isolate` do not apply.

```vue
<script setup lang="ts">
import { useDirection, useFormat } from 'vue-rtl-kit'

const { locale, setLocale } = useDirection()
const format = useFormat()
const locales = ['ar', 'en', 'fa', 'he']
</script>

<template>
  <select :value="locale" @change="setLocale($event.target.value)">
    <option v-for="tag in locales" :key="tag" :value="tag">
      {{ format.formatDisplayName(tag, { type: 'language', locale: tag }) }}
    </option>
  </select>
</template>
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

For digit conversion as the user types, see [`v-digits`](/guide/v-digits). To keep the original text in the field and parse a number separately, bind the text and read the number from a computed value:

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

## Locale-aware sorting {#locale-aware-sorting}

`format.value.compareText()` and `format.value.sortByLocale()` follow the current scope locale. Read them through `format.value` inside a computed getter to re-sort when `setLocale()` changes that locale. To sort for a different locale without changing the scope, pass a locale tag or an ordered locale array for that call.

```ts
import { computed } from 'vue'
import { useFormat } from 'vue-rtl-kit'

const format = useFormat()
const contacts = [{ name: 'سارة' }, { name: 'بدر' }, { name: 'ليلى' }]
const sortedContacts = computed(() =>
  format.value.sortByLocale(contacts, { key: (contact) => contact.name }),
)

format.value.compareText('طلب ٢', 'طلب ١٠', { locale: ['ar-EG', 'ar', 'en'] }) < 0 // true
```

These methods use the locale, not the layout direction or configured `numberingSystem`. By default, they strip only Arabic tashkeel and tatweel before comparing; hamza and madda forms still follow the locale's rules. See [Locale-aware sorting in Text helpers](/guide/text-helpers#locale-aware-sorting) for numeric comparison, empty keys, and standalone usage.

## Input fallbacks

Underscores in locale tags are normalized to hyphens, so `ar_EG` formats as `ar-EG`. If a tag is invalid, the formatter tries its language subtag and then falls back to `en`. Numbering systems are inserted before a private-use `-x-` section, so `en-x-foo` with `numberingSystem: 'arab'` produces Arabic-Indic digits; unrecognized or empty `numberingSystem` values safely fall back to `'latn'`. `formatDate()` returns an empty string for invalid dates instead of throwing, and `formatRelativeTime()` does the same for a non-finite value such as `NaN` or `Infinity`. `formatDateRange()` and `formatNumberRange()` use the same locale fallbacks, but reject an invalid date or non-finite number with a `TypeError` in development and an empty string in production. `formatPlural()` uses the same locale fallbacks and returns an empty string when `forms.other` is empty or `Intl.PluralRules` is unavailable. `formatDisplayName()` uses the same locale fallbacks and returns the code itself (or `''` with `fallback: 'none'`) for unknown or invalid codes and on runtimes without `Intl.DisplayNames`. `parseNumber()` uses the same locale and numbering-system fallbacks and returns `NaN` for text it cannot read.

```ts
formatNumber(12, { locale: 'ar_EG' }) // '١٢'
formatNumber(12, { locale: 'en-x-foo', numberingSystem: 'arab' }) // '١٢'
formatNumber(12, { locale: 'ar-EG', numberingSystem: 'invalid' }) // '12'
formatDate('not a date') // ''
formatRelativeTime(NaN, 'day') // ''
formatPlural(1, { other: '' }) // ''
formatDisplayName('zz', { type: 'language' }) // 'zz'
formatDisplayName('!!', { type: 'region', fallback: 'none' }) // ''
parseNumber('١٢', { locale: 'ar_EG' }) // 12
parseNumber('not a number') // NaN
```

## Standalone helpers

The same formatting primitives can be used without a component context:

```ts
import {
  formatCurrency,
  formatDate,
  formatDateRange,
  formatDisplayName,
  formatList,
  formatNumber,
  formatNumberRange,
  formatPlural,
  formatRelativeTime,
  parseNumber,
  transliterateDigits,
  withNumberingSystem,
} from 'vue-rtl-kit'

formatNumber(1234.5, { locale: 'ar-EG', numberingSystem: 'latn' })
formatCurrency(2500, 'EGP', { locale: 'ar-EG' })
formatDate('2024-05-12', { locale: 'ar-SA', calendar: 'islamic-umalqura' })
formatDateRange('2024-03-03', '2024-03-05', { locale: 'ar-EG', dateStyle: 'long', timeZone: 'UTC' })
formatNumberRange(100, 250, { locale: 'ar-EG', style: 'currency', currency: 'EGP' })
formatList(['PDF', 'CSV'], { locale: 'en', type: 'disjunction' })
formatRelativeTime(2, 'hour', { locale: 'ar-EG' })
formatPlural(2, { one: '{count} يوم', other: '{count} أيام' }, { locale: 'ar' })
formatDisplayName('ar', { type: 'language', locale: 'ar' })
parseNumber('١٬٢٣٤٫٥', { locale: 'ar-EG' })
transliterateDigits('طلب رقم 4821', 'arab')
withNumberingSystem('ar-EG', 'latn')
```
