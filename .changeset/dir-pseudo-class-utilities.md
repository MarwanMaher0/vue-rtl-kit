---
"vue-rtl-kit": patch
---

Fix the direction utilities in `styles.css` to key off the element's own direction with `:dir(rtl)` / `:dir(ltr)` instead of any ancestor `[dir]`, so `.ltr-only`, `.rtl-only`, `.rtl-flip`, `.rtl-noflip`, and `.rtl-scroll-x` behave correctly inside a `dir="ltr"` island on an RTL page (and vice versa). `.rtl-flip` now mirrors with the independent `scale: -1 1` property, so it no longer overwrites a `transform` the element already carries. No class names changed.
