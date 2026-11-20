---
"vue-rtl-kit": minor
---

Add `parseNumber(text, options)`, the inverse of `formatNumber` for form input. `Number()` returns `NaN` for what `formatNumber` writes in `ar-EG`, `fa-IR`, `he`, `de` or `fr`; `parseNumber` reads it back:

- `options` takes `locale` (default `'en'`) and `numberingSystem`. The group separator, decimal separator and minus sign are read from `Intl.NumberFormat` `formatToParts()` for that locale and numbering system rather than from a table, cached in an LRU bounded by `FORMATTER_CACHE_LIMIT`. Locale tags and numbering systems get the same normalization and fallbacks as `formatNumber`.
- Western, Arabic-Indic and Persian digits are accepted in every locale, along with the locale's own digits.
- U+061C, U+200E, U+200F, the isolates U+2066–U+2069, NBSP, U+202F and spaces are ignored, so `isolate: true` output and space-grouped numbers parse.
- An ASCII hyphen or U+2212 is a minus sign and a leading `+` is allowed; a trailing `%` or `٪` (U+066A) divides the result by 100.
- Group separators are accepted only between digits of the integer part; group sizes are not checked, so `en-IN` lakh grouping parses. Where the locale groups with a space (`fr`, `sv`), a space between two digits is the group separator, so `1 234,5` parses and `1,2 3` is `NaN`.
- Returns `NaN` for empty text, letters, a second decimal separator, a separator on its own or any other invalid input, and never throws.
- `useFormat()` now exposes a bound `parseNumber` that follows `setLocale()` and the configured `numberingSystem`; the `ParseNumberOptions` type is exported from `vue-rtl-kit`.
