---
"vue-rtl-kit": minor
---

Add `formatPlural(count, forms, options)` over `Intl.PluralRules`, so apps stop shipping `n === 1 ? a : b` — which is wrong for Arabic's six plural categories (`0` zero, `1` one, `2` two, `3`–`10` few, `11`–`99` many, `100` other):

- `forms` is `Partial<Record<'zero' | 'one' | 'two' | 'few' | 'many' | 'other', string>>` with `other` required. The category comes from the locale's CLDR rules, and a category without a form falls back to `other`. Hebrew `two`, Persian `one` for `0`, and English ordinals work too.
- Every `{count}` in the chosen form is replaced with `formatNumber(count, options)`, so `numberingSystem` and `isolate` keep working inside the sentence. Text without `{count}` is returned as is.
- `options` takes the shared `locale`, `numberingSystem` and `isolate` plus `type: 'cardinal' | 'ordinal'`. Locale tags get the same underscore normalization and language-subtag / `en` fallback as the other formatters, and invalid numbering systems fall back to `'latn'`.
- `NaN`, `Infinity`, negative and fractional counts select the category the rules report without throwing. An empty `forms.other`, or a runtime without `Intl.PluralRules`, returns an empty string.
- Rules instances are cached per locale and `type` in an LRU bounded by `FORMATTER_CACHE_LIMIT`.
- `useFormat()` now exposes a bound `formatPlural` that follows `setLocale()` and the configured `numberingSystem`; the `PluralForms` and `FormatPluralOptions` types are exported from `vue-rtl-kit`.