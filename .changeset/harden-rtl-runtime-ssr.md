---
"vue-rtl-kit": patch
---

Harden runtime direction switching, nested direction providers, SSR/Nuxt hydration, and unmount cleanup across composables, directives, and components:

- Ensure `createRtl` reference-counts installed apps and cleans up document watchers only when the last installed app unmounts (`app.onUnmount` / `app.unmount`) or `dispose()` is called, evaluates `document` availability at runtime for server-only environments, and avoids duplicate global registration warnings.
- Fix `RtlProvider` locale inheritance and direction derivation so `setLocale` updates unpinned providers, dynamically cleared `dir`/`locale` props fall back to the parent context, and parent locale switches propagate cleanly.
- Move `BidiText` default slot invocation inside the render function to avoid Vue slot-invocation warnings and track reactive slot updates across direction switches.
- Support reactive refs, computed values, and `true` bindings in `v-rtl`, restore `unicode-bidi` and clean up empty `style` attributes when `isolate` flips or unmounts, and preserve pre-existing `dir`/`style` across SSR hydration.
- Complete logical-to-physical and physical-to-logical CSS property mappings (`scrollMarginTop`/`Bottom`, `scrollPaddingTop`/`Bottom`, `overflowInline`/`Block`, logical sizing properties, `captionSide`, `resize`) and avoid `-0` in `useLogicalStyles().mirror(0)`.
- Key the detached `useDirection` fallback per Vue `App` via a `WeakMap` so SSR requests without the plugin cannot leak direction state across renders, guard `useDirection` and `useFormat` with `hasInjectionContext()` so calling them outside `setup()` does not emit Vue warnings, and update the Nuxt runtime plugin to pass a reactive head getter with `htmlClass` support and forward `registerGlobals`.
- Add CI bundle size budgets (`npm run check:size`) for every published entry point.
