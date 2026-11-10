---
"vue-rtl-kit": patch
---

Fix the direction utilities in `styles.css` to key off the element's own direction with `:dir(rtl)` / `:dir(ltr)` instead of any ancestor `[dir]`, so `.ltr-only`, `.rtl-only`, `.rtl-flip`, `.rtl-noflip`, and `.rtl-scroll-x` behave correctly inside a `dir="ltr"` island on an RTL page (and vice versa). `.rtl-flip` now mirrors with the independent `scale: -1 1` property, so it no longer overwrites a `transform` the element already carries.

The own-direction behavior requires Chrome 120+, Firefox 49+, or Safari 16.4+ (`:dir()`); the independent `scale` property requires Chrome 104+, Firefox 72+, or Safari 14.1+. Browsers without `:dir()` use the previous ancestor selectors and `transform: scaleX(-1)` via an `@supports not selector(:dir(rtl))` fallback, retaining the old nested-island and transform-overwrite limitations. In browsers with `:dir()`, `.rtl-only` now hides on pages with no `dir` attribute (HTML defaults to LTR). No class names changed.
