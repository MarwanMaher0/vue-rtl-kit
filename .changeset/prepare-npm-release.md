---
"vue-rtl-kit": patch
---

Prepare the initial npm release:

- Strip embedded Unicode bidi control characters in `<BidiText>` when using the default `element` strategy, matching `strategy="chars"` and `isolateRuns()`.
- Replace literal Unicode bidi control characters across source, playground, and tests with `\uXXXX` escapes or named constants, and enforce `bidi/no-bidi-control-chars` in ESLint.
- Fall back to `'latn'` when an unrecognized or empty `numberingSystem` is passed to formatting helpers or configured on `createRtl()`.
- Update package metadata (`homepage`, `engines.node >=20.11`) and English/Arabic documentation for npm installation and Nuxt `registerGlobals` forwarding.
