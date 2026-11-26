---
"vue-rtl-kit": minor
---

Add `compareText` and `sortByLocale` for locale-aware text ordering with a bounded cache of `Intl.Collator` instances. By default, numeric collation puts `طلب ٢` before `طلب ١٠` and treats `طلب 2`, `طلب ٢`, and `طلب ۲` as equal. Only Arabic tashkeel and tatweel are stripped by default; hamza and madda forms, Latin accents, and case keep their locale-specific ordering.

`sortByLocale` returns a stable new array and accepts a `key` callback for objects. Empty strings stay first in both directions; `null` and `undefined` keys throw `TypeError` in development and stay last in production. The standalone helpers default to `en` and are not Nuxt auto-imports. Their `useFormat()` counterparts follow the scope locale and accept a locale tag or ordered locale array as a per-call override.
