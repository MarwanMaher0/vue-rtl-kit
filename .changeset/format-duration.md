---
"vue-rtl-kit": minor
---

Add `formatDuration(duration, options?)`, a pure locale-aware duration formatter (zero Vue imports) that stops hand-joined numbers and words from getting Arabic plural forms and digit shapes wrong in video lengths, delivery estimates and timers:

- Takes an object of units (`years`, `months`, `weeks`, `days`, `hours`, `minutes`, `seconds`, `milliseconds`) or a number of milliseconds, and returns the locale's own plural forms, conjunction and digits: `ساعتان و3 دقائق`, `١١ ساعة ودقيقتان`, `11 يومًا`.
- `style` is `'long'` (default), `'short'`, `'narrow'`, or `'digital'` for `h:mm:ss` in the digits of the locale (`١:٠٢:٠٣`). `numberingSystem` picks `'latn'`, `'arab'` or any other CLDR numbering system.
- `largestUnit` and `smallestUnit` balance the duration between two units; `maxUnits` keeps that many units, counted from the first non-zero one, and rounds the last, so the plural form follows the rounded number.
- An object of whole numbers is written as given. A number of milliseconds and an object with fractional or mixed-sign fields are balanced; fractions are carried into the smaller units, the last unit is rounded half away from zero and carries upward (`ساعة`, never `60 دقيقة`).
- A negative duration gets one sign in front, written as the locale's minus sign. Units that are zero are left out, and a duration that is zero or rounds to zero is written as zero of the smallest unit.
- Uses `Intl.DurationFormat` when the runtime has it. Without it (Node.js before 23, Chrome before 129, Firefox before 136, Safari before 16.4) each unit is formatted with `Intl.NumberFormat` unit style and the units are joined with `Intl.ListFormat`, which returns the same strings for `'long'`, `'short'` and `'narrow'`; the fallback's `'digital'` always separates with `:`.
- Invalid input throws `TypeError` in development and returns an empty string in production.

Also exports the `DurationInput`, `DurationUnit`, `DurationStyle` and `FormatDurationOptions` types. No existing API changes.
