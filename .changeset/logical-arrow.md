---
"vue-rtl-kit": minor
---

Add direction-aware keyboard navigation helpers for WAI-ARIA composite widgets:

- Export pure `logicalArrow(key, dir)` (and `LogicalArrow`) from `src/logical.ts` and `vue-rtl-kit` to map `ArrowLeft`, `ArrowRight`, `Home`, `End`, `ArrowUp`, and `ArrowDown` to `'next' | 'previous' | 'first' | 'last' | 'up' | 'down' | null` (`ArrowRight` resolves to `'previous'` and `ArrowLeft` to `'next'` in `'rtl'`, while `Home`/`End` stay `'first'`/`'last'`).
- Add `arrow(event)` to `useLogicalStyles()` using the nearest direction scope (so `<RtlProvider dir="ltr">` on an RTL page resolves LTR) and returning `null` when `Ctrl`, `Alt`, or `Meta` is held.
