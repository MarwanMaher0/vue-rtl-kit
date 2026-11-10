---
"vue-rtl-kit": patch
---

Type the globals that `createRtl()` registers: the declarations now augment Vue's `GlobalComponents` with `BidiText` and `RtlProvider` and `GlobalDirectives` with `vRtl`, so `vue-tsc` and the Vue language tools check their props, slot props and the `v-rtl` value in templates without a per-file import. Types only — runtime output, exports and signatures are unchanged.
