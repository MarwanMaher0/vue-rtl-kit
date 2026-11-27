---
"vue-rtl-kit": minor
---

Add `formatDateRange(start, end, options)` and `formatNumberRange(start, end, options)` for booking, schedule and pricing ranges on Arabic pages. Joining two formatted values with a hyphen repeats the shared month or currency, uses the wrong range separator for the locale, and breaks the visual order in RTL; the new helpers call `Intl.DateTimeFormat.prototype.formatRange` and `Intl.NumberFormat.prototype.formatRange` instead:

- Shared parts collapse the way the locale's range pattern says: `٣–٥ مارس ٢٠٢٤` (one month, one year), `۱۳ تا ۱۵ اسفند ۱۴۰۲` in Persian, and one `ج.م.` symbol for a whole Arabic price range.
- `formatDateRange` accepts `Date`, timestamp or ISO string ends and the same options as `formatDate` (including `calendar` and `timeZone`); `formatNumberRange` accepts `number` or `bigint` ends and the same options as `formatNumber` (currency, unit, compact).
- Both reuse the existing `formatDate` / `formatNumber` LRU formatter caches (`formatterCacheStats` gains no new key) and the same locale and numbering-system resolution and fallbacks, and are exported from `vue-rtl-kit` and bound on `useFormat()`.
- A reversed range (`start` greater than `end`) is formatted as given, exactly like `Intl`, without throwing. An invalid date or a non-finite number throws a `TypeError` in development and returns an empty string in production.
- On runtimes without `formatRange`, both ends are formatted and joined with the locale's range separator — a spaced en dash for dates (` تا ` in Persian), an en dash for numbers — with each end wrapped in a first-strong isolate (FSI ... PDI) so the endpoints keep their reading order in an RTL paragraph.