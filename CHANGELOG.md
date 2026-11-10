# vue-rtl-kit

## 0.2.0

### Minor Changes

- 4c424a3: Handle CSS shorthands in the logical style helpers:

  - `toPhysicalStyle` now expands 1- and 2-value logical shorthands (`marginInline`, `paddingInline`, `insetInline`, `insetBlock`, `borderInlineWidth`/`Style`/`Color`, `scrollMarginInline`, `scrollPaddingInline`, plus their block-axis and scroll counterparts) to the physical sides for the given direction instead of returning them unchanged.
  - `toLogicalStyle` accepts opt-in `{ shorthands: true }` to expand 1–4-value (or numeric) physical `margin`, `padding`, `inset`, `borderWidth`, `borderStyle`, `borderColor`, and `borderRadius` into logical longhands. Values containing `var()`, `calc()`, `!important`, or a top-level `border-radius` slash are left untouched; other functions such as `rgb()`, `hsl()`, and `env()` are preserved and split only at top-level whitespace.
  - Default output is unchanged when the new option is off, and exports are unchanged.

- 8e14c48: Add opt-in direction/locale persistence to the Nuxt module:

  - New `rtl.cookie` module option: `false` (default), a cookie name string, or `{ name, maxAge, sameSite }` (defaults: name `'vue-rtl-kit'`, `maxAge` one year, `sameSite: 'lax'`).
  - The runtime plugin reads the cookie with `useCookie`, seeds `createRtl` with the saved locale/direction, and writes the current `locale:dir` pair back on `setLocale`, `setDirection`, and `toggleDirection`, so returning Arabic users get `dir="rtl"` in server-rendered HTML.
  - Saved bare locales (`ar`), directions (`rtl`), and `locale:dir` pairs are accepted; unknown values are ignored and the configured defaults apply. Default behaviour with `cookie: false` is unchanged, and no new package exports were added.

### Patch Changes

- a9b6630: Bound the `Intl` formatter caches and make the composables safe outside `setup()`:

  - `formatNumber`, `formatCurrency` and `formatDate` now cache `Intl.NumberFormat` / `Intl.DateTimeFormat` instances in a small fixed-size LRU (32 entries per kind) instead of unbounded `Map`s, so long-running servers and locale-switching SPAs cannot grow the caches without limit. Hot formatters are refreshed on access and the least recently used entry is evicted.
  - `useDirection()` and `useFormat()` can be called outside a component `setup()` (plain modules, router guards, tests) without triggering Vue's `inject()` warning; they fall back to a detached, per-app or global direction context instead.

- 3c99a0d: Ship types for CommonJS consumers: bundled `.d.ts`/`.d.cts` per entry point, types for `./styles.css`, and a scoped arethetypeswrong check.
- e8b1cee: Fix the direction utilities in `styles.css` to key off the element's own direction with `:dir(rtl)` / `:dir(ltr)` instead of any ancestor `[dir]`, so `.ltr-only`, `.rtl-only`, `.rtl-flip`, `.rtl-noflip`, and `.rtl-scroll-x` behave correctly inside a `dir="ltr"` island on an RTL page (and vice versa). `.rtl-flip` now mirrors with the independent `scale: -1 1` property, so it no longer overwrites a `transform` the element already carries.

  The own-direction behavior requires Chrome 120+, Firefox 49+, or Safari 16.4+ (`:dir()`); the independent `scale` property requires Chrome 104+, Firefox 72+, or Safari 14.1+. Browsers without `:dir()` use the previous ancestor selectors and `transform: scaleX(-1)` via an `@supports not selector(:dir(rtl))` fallback, retaining the old nested-island and transform-overwrite limitations. In browsers with `:dir()`, `.rtl-only` now hides on pages with no `dir` attribute (HTML defaults to LTR). No class names changed.

- 9524ff1: Harden runtime direction switching, nested direction providers, SSR/Nuxt hydration, and unmount cleanup across composables, directives, and components:

  - Ensure `createRtl` reference-counts installed apps and cleans up document watchers only when the last installed app unmounts (`app.onUnmount` / `app.unmount`) or `dispose()` is called, evaluates `document` availability at runtime for server-only environments, and avoids duplicate global registration warnings.
  - Fix `RtlProvider` locale inheritance and direction derivation so `setLocale` updates unpinned providers, dynamically cleared `dir`/`locale` props fall back to the parent context, and parent locale switches propagate cleanly.
  - Move `BidiText` default slot invocation inside the render function to avoid Vue slot-invocation warnings and track reactive slot updates across direction switches.
  - Support reactive refs, computed values, and `true` bindings in `v-rtl`, restore `unicode-bidi` and clean up empty `style` attributes when `isolate` flips or unmounts, and preserve pre-existing `dir`/`style` across SSR hydration.
  - Complete logical-to-physical and physical-to-logical CSS property mappings (`scrollMarginTop`/`Bottom`, `scrollPaddingTop`/`Bottom`, `overflowInline`/`Block`, logical sizing properties, `captionSide`, `resize`) and avoid `-0` in `useLogicalStyles().mirror(0)`.
  - Key the detached `useDirection` fallback per Vue `App` via a `WeakMap` so SSR requests without the plugin cannot leak direction state across renders, guard `useDirection` and `useFormat` with `hasInjectionContext()` so calling them outside `setup()` does not emit Vue warnings, and update the Nuxt runtime plugin to pass a reactive head getter with `htmlClass` support and forward `registerGlobals`.
  - Add CI bundle size budgets (`npm run check:size`) for every published entry point.

- 42d9e83: Fix locale-to-direction detection without changing the public API:

  - Recognize script subtags only in the language portion of well-formed locale tags, never inside Unicode extensions or private-use suffixes. Arabic numbering-system extensions and Hebrew private-use tags retain RTL direction.
  - Default Hausa (`ha`) and Kurdish (`ku`) to LTR, while explicit RTL scripts still take precedence. Add RTL defaults for `pnb`, `mzn`, `lrc`, `glk`, `bal`, and `sdh`.
  - Return LTR for well-formed non-RTL languages and reserve the fallback for empty or invalid tags, so unlisted locales such as French correctly switch unpinned stores and provider scopes from RTL to LTR.
  - Add table-driven detection, locale-switching, and provider regressions, and document these rules in the English and Arabic locale guides and README.

- 3c99a0d: Import Nuxt APIs explicitly so the Nuxt module works under SSR, skip empty runtime-config values, and cover it with a Nuxt SSR test.
- c21a1fc: Resolve paired brackets (`()`, `[]`, `{}`) in `splitBidiRuns` and `isolateRuns` using Unicode Bidirectional Algorithm paired-bracket logic (N0) so matched brackets enclosing opposite-direction content stay together inside the isolate, mixed-direction bracket pairs stay outside in the base direction, and unmatched brackets remain neutral.
- 098510e: Harden number and date formatting: normalize underscore locale separators, fall back from invalid locale tags to the language subtag and then `en`, insert numbering-system extensions before private-use subtags, and return an empty string for invalid dates. Applies to standalone helpers and `useFormat()` without changing exports or signatures.
- c402bfc: Mark component factories, injection keys, and formatter caches as side-effect free so a bundler can drop them. Importing `isolateRuns`, `toLogicalStyle`, or `directionOfLocale` no longer pulls in Vue, and importing `formatNumber` no longer pulls in component or directive code. Runtime behaviour and exports are unchanged.
- 5bb7898: Type the globals that `createRtl()` registers: the declarations now augment Vue's `GlobalComponents` with `BidiText` and `RtlProvider` and `GlobalDirectives` with `vRtl`, so `vue-tsc` and the Vue language tools check their props, slot props and the `v-rtl` value in templates without a per-file import. Types only — runtime output, exports and signatures are unchanged.

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
