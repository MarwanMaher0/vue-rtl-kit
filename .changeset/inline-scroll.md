---
"vue-rtl-kit": minor
---

Add logical inline scroll helpers and `useInlineScroll` so horizontal scrollers, carousels, and edge checks work identically in LTR and RTL without fighting negative RTL `scrollLeft`:

- Add pure `src/scroll.ts` (zero Vue imports, horizontal writing modes only): `getScrollInline(el)`, `getScrollInlineMax(el)`, `scrollToInline(el, offset, options?)`, `scrollByInline(el, delta, options?)`, and `scrollInlineEdges(el, tolerance = 1)` (plus `ScrollInlineOptions` and `ScrollInlineEdges` types). Direction is read from `getComputedStyle(el).direction`, so nested `dir` islands, `v-rtl`, and `<RtlProvider>` scopes resolve automatically. Non-overflowing elements report `0` and both edges `true`; `null` targets, SSR, `NaN`, and `Infinity` return `0` or no-op and never throw.
- Add `useInlineScroll(target, options?)` (plus `UseInlineScrollOptions` and `UseInlineScrollReturn` types) returning readonly `offset`, `max`, `atStart`, and `atEnd` refs along with `scrollTo`, `scrollBy`, `scrollToStart`, and `scrollToEnd`. Attaches a passive `scroll` listener and `ResizeObserver`, re-reads on `target` and `useDirection().dir` changes, removes listeners on dispose, and is SSR-safe.
