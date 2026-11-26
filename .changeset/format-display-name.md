---
"vue-rtl-kit": minor
---

Add `formatDisplayName(code, options)` over `Intl.DisplayNames`, so language and country pickers on Arabic, Persian and Hebrew pages stop showing English names — `العربية` instead of `Arabic`, `مصر` instead of `Egypt`:

- `options.type` is required: `'language' | 'region' | 'currency' | 'script' | 'calendar' | 'dateTimeField'`. `style` (`'long' | 'short' | 'narrow'`) and `languageDisplay` (`'dialect' | 'standard'`, e.g. `ar-EG` as "Arabic (Egypt)") are forwarded to `Intl`.
- An unknown code returns the code itself (`fallback: 'code'`, the default) or an empty string (`fallback: 'none'`). Structurally invalid codes, and runtimes without `Intl.DisplayNames`, return the same fallback instead of throwing.
- Locale tags get the same underscore normalization and language-subtag / `en` fallback as the other formatters, and instances are cached per locale and options in an LRU bounded by `FORMATTER_CACHE_LIMIT` (counted by `formatterCacheStats()` as `displayName`).
- `useFormat()` now exposes a bound `formatDisplayName` that follows `setLocale()`; display names are words, so the bound `numberingSystem` and `isolate` do not apply. The `FormatDisplayNameOptions` type is exported from `vue-rtl-kit`.