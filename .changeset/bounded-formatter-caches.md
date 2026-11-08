---
"vue-rtl-kit": patch
---

Bound the `Intl` formatter caches and make the composables safe outside `setup()`:

- `formatNumber`, `formatCurrency` and `formatDate` now cache `Intl.NumberFormat` / `Intl.DateTimeFormat` instances in a small fixed-size LRU (32 entries per kind) instead of unbounded `Map`s, so long-running servers and locale-switching SPAs cannot grow the caches without limit. Hot formatters are refreshed on access and the least recently used entry is evicted.
- `useDirection()` and `useFormat()` can be called outside a component `setup()` (plain modules, router guards, tests) without triggering Vue's `inject()` warning; they fall back to a detached, per-app or global direction context instead.
