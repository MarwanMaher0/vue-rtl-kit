# Formatting durations

Video lengths, delivery estimates and timers are usually built by joining numbers and words by hand:

```ts
const label = `${hours} ساعة و ${minutes} دقيقة`
// '2 ساعة و 3 دقيقة'
```

That is not Arabic. Two hours is the dual `ساعتان`, written without a number; three minutes takes the plural `دقائق`; eleven minutes goes back to the singular (`11 دقيقة`); the conjunction `و` is attached to the word after it; and an Egyptian or Saudi page may want `٣` where the template wrote `3`. CLDR already has every one of these forms for every locale.

`formatDuration` is a pure helper (zero Vue imports, no DOM access) that asks `Intl.DurationFormat` for them, with a fallback built from `Intl.NumberFormat` and `Intl.ListFormat` for runtimes that do not have it yet.

```ts
import { formatDuration } from 'vue-rtl-kit'

const ar = { locale: 'ar', numberingSystem: 'latn' }
const eg = { locale: 'ar-EG', numberingSystem: 'arab' }

formatDuration({ hours: 2, minutes: 3 }, ar) // 'ساعتان و3 دقائق'
formatDuration({ hours: 11, minutes: 2 }, eg) // '١١ ساعة ودقيقتان'
formatDuration(3_723_000, { ...eg, style: 'digital' }) // '١:٠٢:٠٣'
```

The first argument is an object of units (`years`, `months`, `weeks`, `days`, `hours`, `minutes`, `seconds`, `milliseconds`) or a number of milliseconds. The second is optional; `locale` defaults to `'en'` and `style` to `'long'`.

## Arabic plural forms

An Arabic noun changes with its count: no number for one and two, the plural for 3 to 10, the singular for 11 and up, with a tanwin on some nouns from 11 to 99.

| Count | Hours | Minutes | Days |
| --- | --- | --- | --- |
| 1 | `ساعة` | `دقيقة` | `يوم` |
| 2 | `ساعتان` | `دقيقتان` | `يومان` |
| 3 | `3 ساعات` | `3 دقائق` | `3 أيام` |
| 10 | `10 ساعات` | `10 دقائق` | `10 أيام` |
| 11 | `11 ساعة` | `11 دقيقة` | `11 يومًا` |
| 100 | `100 ساعة` | `100 دقيقة` | `100 يوم` |

```ts
const ar = { locale: 'ar', numberingSystem: 'latn' }

formatDuration({ hours: 1 }, ar)   // 'ساعة'
formatDuration({ hours: 2 }, ar)   // 'ساعتان'
formatDuration({ hours: 3 }, ar)   // '3 ساعات'
formatDuration({ hours: 10 }, ar)  // '10 ساعات'
formatDuration({ hours: 11 }, ar)  // '11 ساعة'
formatDuration({ hours: 100 }, ar) // '100 ساعة'
formatDuration({ days: 11 }, ar)   // '11 يومًا'
```

Every locale brings its own rules. Persian has one form for every count, Hebrew has a dual for most units, and each joins the units its own way:

```ts
formatDuration({ days: 3, hours: 11 }, { locale: 'fa' }) // '۳ روز و ۱۱ ساعت'
formatDuration({ days: 2, hours: 2 }, { locale: 'he' })  // 'יומיים, שעתיים'
formatDuration({ days: 3, hours: 11 }, { locale: 'en' }) // '3 days, 11 hours'
```

The forms are the nominative ones CLDR ships. They read correctly as a value next to a label (`مدة التوصيل: يومان`); after a preposition Arabic wants the genitive (`خلال يومين`), which no `Intl` API produces, so keep the duration out of that position.

## Digit shapes

`numberingSystem` picks the digits: `'latn'` for `0123`, `'arab'` for `٠١٢٣`, `'arabext'` for the Persian `۰۱۲۳`. Without it the digits are the locale's own, and those depend on the CLDR version of the runtime: `ar-EG` and `ar-SA` use Arabic-Indic digits, while plain `ar` uses Western digits in current engines and Arabic-Indic digits in older ones. Pass `numberingSystem` whenever the design calls for one shape, and always when the page is rendered on a server and hydrated in a browser.

```ts
formatDuration({ days: 3, hours: 11 }, { locale: 'ar-EG' })                          // '٣ أيام و١١ ساعة'
formatDuration({ days: 3, hours: 11 }, { locale: 'ar-EG', numberingSystem: 'latn' }) // '3 أيام و11 ساعة'
formatDuration({ days: 3, hours: 11 }, { locale: 'ar-SA', numberingSystem: 'arab' }) // '٣ أيام و١١ ساعة'
formatDuration({ days: 3, hours: 11 }, { locale: 'ar', numberingSystem: 'arab' })    // '٣ أيام و١١ ساعة'
```

An unknown numbering system falls back to `'latn'`. A `-u-nu-` extension already in the locale tag wins over the option.

## Styles

| Style | `ar` with `latn` | `ar-EG` with `arab` | `en` |
| --- | --- | --- | --- |
| `'long'` (default) | `ساعة، و45 دقيقة، و30 ثانية` | `ساعة، و٤٥ دقيقة، و٣٠ ثانية` | `1 hour, 45 minutes, 30 seconds` |
| `'short'` | `1 س، و45 د، و30 ث` | `١ س، و٤٥ د، و٣٠ ث` | `1 hr, 45 min, 30 sec` |
| `'narrow'` | `1 س و45 د و30 ث` | `١ س و٤٥ د و٣٠ ث` | `1h 45m 30s` |
| `'digital'` | `1:45:30` | `١:٤٥:٣٠` | `1:45:30` |

```ts
const length = { hours: 1, minutes: 45, seconds: 30 }

formatDuration(length, { locale: 'ar', numberingSystem: 'latn', style: 'short' })     // '1 س، و45 د، و30 ث'
formatDuration(length, { locale: 'ar-EG', numberingSystem: 'arab', style: 'narrow' }) // '١ س و٤٥ د و٣٠ ث'
formatDuration(length, { locale: 'ar-EG', numberingSystem: 'arab', style: 'digital' }) // '١:٤٥:٣٠'
```

## Units and balancing

An object of whole numbers is written as given, like `Intl.DurationFormat` does. A number of milliseconds is balanced: it is split from days down to milliseconds. `largestUnit` and `smallestUnit` balance an object too, and move the two ends.

```ts
const ar = { locale: 'ar', numberingSystem: 'latn' }

formatDuration({ minutes: 90 }, ar)                                    // '90 دقيقة' — written as given
formatDuration(5_400_000, ar)                                          // 'ساعة و30 دقيقة' — a number is balanced
formatDuration({ minutes: 90 }, { ...ar, largestUnit: 'hours' })       // 'ساعة و30 دقيقة'
formatDuration({ days: 2, hours: 3 }, { ...ar, largestUnit: 'hours' }) // '51 ساعة' — days are folded into hours
formatDuration(5_531_000, { ...ar, smallestUnit: 'minutes' })          // 'ساعة و32 دقيقة' — 11 seconds are rounded away
formatDuration(864_000_000, { ...ar, largestUnit: 'weeks' })           // 'أسبوع و3 أيام'
formatDuration(3_456_000_000, ar)                                      // '40 يومًا' — days are the default largest unit
formatDuration(3_456_000_000, { ...ar, largestUnit: 'months', smallestUnit: 'days' }) // 'شهر و10 أيام'
```

- `largestUnit` defaults to `'days'` for a number and to the largest non-zero field for an object. `smallestUnit` defaults to `'milliseconds'`.
- Weeks take part only when the object has a `weeks` field or one of the two options names them.
- 1000 ms, 60 s, 60 min, 24 h, 7 days and 12 months are exact. A month counts as 30.4375 days and a year as 365.25 days, so a conversion between months and days is nominal; pass calendar-exact fields when the date matters.
- What is left below `smallestUnit` is rounded half away from zero. A unit that rounds up to a full unit of the one above is carried into it, so the result is `ساعة`, never `60 دقيقة`.

## maxUnits

`maxUnits` keeps that many units, counted from the first non-zero one, and rounds the last. The plural form follows the rounded number.

```ts
const ar = { locale: 'ar', numberingSystem: 'latn' }

formatDuration(5_531_000, ar)                      // 'ساعة، و32 دقيقة، و11 ثانية'
formatDuration(5_531_000, { ...ar, maxUnits: 2 })  // 'ساعة و32 دقيقة'
formatDuration(5_531_000, { ...ar, maxUnits: 1 })  // 'ساعتان' — 1 h 32 min rounds up to the dual
formatDuration(250_000_000, { ...ar, maxUnits: 1 }) // '3 أيام' — 2 days 21 hours
formatDuration({ hours: 1, minutes: 59, seconds: 40 }, { ...ar, maxUnits: 2 }) // 'ساعتان' — the rounding carries
formatDuration({ days: 1, minutes: 5 }, { ...ar, maxUnits: 2 })               // 'يوم' — the two units are days and hours
```

A unit that is zero still counts: one day and five minutes at `maxUnits: 2` is one day, because the second unit is the hours. An object is not promoted above its largest field unless `largestUnit` says so: `{ minutes: 59, seconds: 59 }` at `maxUnits: 1` is `60 دقيقة`, and `ساعة` with `largestUnit: 'hours'`.

## Digital style

`style: 'digital'` writes `h:mm:ss` in the digits of the locale. Hours are always shown, minutes and seconds are padded to two digits, days and larger units are folded into the hours without grouping separators, and milliseconds are rounded to the second. `largestUnit`, `smallestUnit` and `maxUnits` are not used.

```ts
formatDuration(125_000, { locale: 'ar-EG', numberingSystem: 'arab', style: 'digital' }) // '٠:٠٢:٠٥'
formatDuration(125_000, { locale: 'fa', style: 'digital' })                             // '۰:۰۲:۰۵'
formatDuration(59_500, { locale: 'ar', numberingSystem: 'latn', style: 'digital' })     // '0:01:00' — rounds to the second
formatDuration({ days: 1, hours: 1, minutes: 1, seconds: 1 }, { locale: 'ar', numberingSystem: 'latn', style: 'digital' }) // '25:01:01'
```

Digits separated by colons stay in `h:mm:ss` order on their own line in an RTL card, in both digit shapes. Inside a sentence, wrap the time in `<bdi>` or [`<BidiText>`](/guide/bidi-text) like any other number run, so the text around it cannot reorder it.

## Negative, fractional and zero values

```ts
const ar = { locale: 'ar', numberingSystem: 'latn' }

formatDuration({ hours: -3 }, { locale: 'en' })            // '-3 hours'
formatDuration({ hours: -1, minutes: -30 }, ar)            // '\u200E-ساعة و30 دقيقة' — one sign, in front
formatDuration({ hours: 1, minutes: -30 }, ar)             // '30 دقيقة' — mixed signs are added up
formatDuration({ hours: 1.5 }, ar)                         // 'ساعة و30 دقيقة'
formatDuration({ days: 2.5 }, ar)                          // 'يومان و12 ساعة'
formatDuration(1500, { ...ar, smallestUnit: 'seconds' })   // 'ثانيتان' — 1.5 s rounds away from zero
formatDuration(0, ar)                                      // '0 ثانية'
formatDuration({ minutes: 0 }, ar)                         // '0 دقيقة'
formatDuration(20_000, { ...ar, smallestUnit: 'minutes' }) // '0 دقيقة' — rounds to zero
formatDuration(0, { ...ar, style: 'digital' })             // '0:00:00'
```

- **Negative.** The sign of the whole duration is written once, in front, as the locale's own minus sign with its bidi mark (`U+200E` before `-` in Arabic with Western digits, `U+061C` with Arabic-Indic digits); the units are formatted without it. `Intl.DurationFormat` on its own drops the sign in Arabic and Hebrew, whose forms for one and two have no number to carry it. Fields with different signs are added up first. A countdown that must not go below zero should clamp its input: `Math.max(0, remaining)`.
- **Fractional.** A fraction is carried into the smaller units, and what is left below `smallestUnit` is rounded half away from zero.
- **Zero.** Units that are zero are left out. A duration that is zero, or rounds to zero, is written as zero of `smallestUnit`; without that option it is zero of the smallest field the object has, and zero seconds for a number and for `{}`. A zero never carries a sign.

## In a component

`formatDuration` is a standalone function: it does not read the direction store, so pass it the current locale, and the numbering system when the app pins one. In Nuxt it is not auto-imported; import it from `vue-rtl-kit`.

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { formatDuration, useDirection } from 'vue-rtl-kit'

const props = defineProps<{ lengthMs: number, deliveryDays: number }>()
const { locale } = useDirection()

const length = computed(() =>
  formatDuration(props.lengthMs, { locale: locale.value, numberingSystem: 'arab', style: 'digital' }))
const delivery = computed(() =>
  formatDuration({ days: props.deliveryDays }, { locale: locale.value, numberingSystem: 'arab' }))
</script>

<template>
  <article class="card">
    <h3>مدة الفيديو</h3>
    <bdi>{{ length }}</bdi>
    <p>مدة التوصيل: {{ delivery }}</p>
  </article>
</template>
```

With `locale` set to `ar-EG`, a 12 minute 34 second video and a three-day delivery render as `٠:١٢:٣٤` and `مدة التوصيل: ٣ أيام`. The helper never touches the DOM, so the same call works in any SSR render; the words come from the `Intl` data of whichever runtime formats them.

## Options

```ts
type DurationUnit = 'years' | 'months' | 'weeks' | 'days' | 'hours' | 'minutes' | 'seconds' | 'milliseconds'
type DurationInput = Partial<Record<DurationUnit, number>>
type DurationStyle = 'long' | 'short' | 'narrow' | 'digital'

interface FormatDurationOptions {
  locale?: string // default 'en'
  style?: DurationStyle // default 'long'
  numberingSystem?: string // default: the digits of the locale
  largestUnit?: DurationUnit // default 'days' for a number, the largest non-zero field for an object
  smallestUnit?: DurationUnit // default 'milliseconds'
  maxUnits?: number // an integer of at least 1
}

function formatDuration(duration: DurationInput | number, options?: FormatDurationOptions): string
```

| Option | Default | Description |
| --- | --- | --- |
| `locale` | `'en'` | BCP 47 locale. `ar_EG` is read as `ar-EG`; a malformed tag falls back to its language subtag, then to `'en'`, instead of throwing. |
| `style` | `'long'` | `'long'`, `'short'` or `'narrow'` unit names, or `'digital'` for `h:mm:ss`. |
| `numberingSystem` | the locale's own | `'latn'`, `'arab'`, `'arabext'` or any other CLDR numbering system; an unknown one falls back to `'latn'`. |
| `largestUnit` | `'days'` for a number, the largest non-zero field for an object | Largest unit to show; anything larger is folded into it. Not used by `'digital'`. |
| `smallestUnit` | `'milliseconds'` | Smallest unit to show; the rest is rounded into it. Also the unit a zero duration is written in. Not used by `'digital'`. |
| `maxUnits` | all units | Show at most this many units, counted from the first non-zero one, and round the last. Not used by `'digital'`. |

## Fallback without Intl.DurationFormat

`Intl.DurationFormat` shipped in Chrome 129, Firefox 136, Safari 16.4 and Node.js 23. Where it is missing, `formatDuration` takes the route the specification itself describes: each unit is formatted with `Intl.NumberFormat` in `style: 'unit'`, which picks the plural form and the digits, and the units are joined with `Intl.ListFormat` in `type: 'unit'`. Node.js 20 and 22 always take this path.

- For `'long'`, `'short'` and `'narrow'` the two paths return the same string; the browser test compares them in Chromium for `ar`, `ar-EG`, `ar-SA`, `fa`, `he` and `en`.
- For `'digital'` the fallback always separates with `:`. `Intl.DurationFormat` uses the separator of the locale, which is also `:` in Arabic, Persian, Hebrew and English but `.` in a few others (`1.02.03` in Finnish and Danish).
- The fallback also runs when `Intl.DurationFormat` rejects a value that is outside its range, such as five billion years.
- It needs `Intl.NumberFormat` unit style (Chrome 77, Firefox 78, Safari 14.1) and `Intl.ListFormat` (Chrome 72, Firefox 78, Safari 14.1). Formatters are cached in a small LRU, so repeated calls do not rebuild them.

Balancing, rounding, the sign and the zero rule are computed before either path runs, so they do not depend on the runtime.

## Invalid input

In development invalid input throws a `TypeError` that names what is wrong. In production (`NODE_ENV === 'production'`, or a browser build with no `process` global) the helper returns an empty string instead, so a bad value leaves a gap rather than crashing a render.

```ts
formatDuration(Number.NaN)                                              // TypeError in development; '' in production
formatDuration({ hour: 1 })                                             // TypeError — units are plural: hours
formatDuration({ hours: Number.POSITIVE_INFINITY })                     // TypeError — every field must be a finite number
formatDuration(1000, { style: 'medium' })                               // TypeError — not a style
formatDuration(1000, { maxUnits: 0 })                                   // TypeError — an integer of at least 1
formatDuration(1000, { largestUnit: 'seconds', smallestUnit: 'hours' }) // TypeError — largestUnit is the smaller one
```

Invalid means: a duration that is not a finite number or a plain object of finite numbers, an unknown unit name, an unknown `style`, `largestUnit` or `smallestUnit`, a `largestUnit` smaller than `smallestUnit`, a `maxUnits` that is not an integer of at least 1, or a `locale` that is not a string. A malformed locale tag is not an error; it falls back as described above.

See the [API reference](/api#format-duration) for the full signature.
