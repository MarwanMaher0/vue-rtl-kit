# vue-rtl-kit

## 0.1.2

### Patch Changes

- 3c99a0d: Ship types for CommonJS consumers: bundled `.d.ts`/`.d.cts` per entry point, types for `./styles.css`, and a scoped arethetypeswrong check.
- 9524ff1: Harden runtime direction switching, nested direction providers, SSR/Nuxt hydration, and unmount cleanup across composables, directives, and components:

  - Ensure `createRtl` reference-counts installed apps and cleans up document watchers only when the last installed app unmounts (`app.onUnmount` / `app.unmount`) or `dispose()` is called, evaluates `document` availability at runtime for server-only environments, and avoids duplicate global registration warnings.
  - Fix `RtlProvider` locale inheritance and direction derivation so `setLocale` updates unpinned providers, dynamically cleared `dir`/`locale` props fall back to the parent context, and parent locale switches propagate cleanly.
  - Move `BidiText` default slot invocation inside the render function to avoid Vue slot-invocation warnings and track reactive slot updates across direction switches.
  - Support reactive refs, computed values, and `true` bindings in `v-rtl`, restore `unicode-bidi` and clean up empty `style` attributes when `isolate` flips or unmounts, and preserve pre-existing `dir`/`style` across SSR hydration.
  - Complete logical-to-physical and physical-to-logical CSS property mappings (`scrollMarginTop`/`Bottom`, `scrollPaddingTop`/`Bottom`, `overflowInline`/`Block`, logical sizing properties, `captionSide`, `resize`) and avoid `-0` in `useLogicalStyles().mirror(0)`.
  - Key the detached `useDirection` fallback per Vue `App` via a `WeakMap` so SSR requests without the plugin cannot leak direction state across renders, guard `useDirection` and `useFormat` with `hasInjectionContext()` so calling them outside `setup()` does not emit Vue warnings, and update the Nuxt runtime plugin to pass a reactive head getter with `htmlClass` support and forward `registerGlobals`.
  - Add CI bundle size budgets (`npm run check:size`) for every published entry point.

- 3c99a0d: Import Nuxt APIs explicitly so the Nuxt module works under SSR, skip empty runtime-config values, and cover it with a Nuxt SSR test.

## 0.1.1 - 2026-09-15

Tag `v0.1.1`.

- Build on install so the package can be used from GitHub before it is published to npm (`b40c5b4`, `c6fd7f1`).
- Docs: contributing guide, security policy, and issue/PR templates (`a93076f`).
- Docs: LTR/RTL mirror screenshot in the CSS utilities section (`35394d7`).

## 0.1.0 - 2026-09-15

Tag `v0.1.0`. First release.

- Direction store, plugin and `useDirection` composable (`aab3326`).
- `BidiText` and the bidirectional run splitter with Unicode isolation (`e10631a`).
- `RtlProvider` scoping and the `v-rtl` directive (`413171e`).
- Logical-property helpers, `Intl` formatters and the CSS utilities (`dbbfd55`).
- Nuxt module with SSR-correct `html` attributes (`3b7e2b3`).
- Playground, README and CI (`d08c197`, `c53b9f3`).
