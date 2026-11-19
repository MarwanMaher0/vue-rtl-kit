---
"vue-rtl-kit": minor
---

Add `formatList(items, options)` and `formatRelativeTime(value, unit, options)` over `Intl.ListFormat` and `Intl.RelativeTimeFormat`:

- Both accept the same `locale`, `numberingSystem` and `isolate` options as `formatNumber` / `formatDate`, plus the matching `Intl` options (`type` and `style` for lists; `numeric` and `style` for relative time). Locale tags get the same underscore normalization and language-subtag / `en` fallback, and invalid numbering systems fall back to `'latn'`.
- With `isolate` set, `formatList` wraps every item in a first-strong isolate and then isolates the whole result, so Latin names cannot reorder inside an Arabic list.
- `formatRelativeTime` returns an empty string for a non-finite value, like `formatDate` does for an invalid date.
- Each kind is cached in its own LRU bounded by `FORMATTER_CACHE_LIMIT`.
- `useFormat()` now exposes bound `formatList` and `formatRelativeTime` that follow `setLocale()` and the configured `numberingSystem`; the `ListFormatOptions` and `RelativeTimeFormatOptions` types are exported from `vue-rtl-kit`.
