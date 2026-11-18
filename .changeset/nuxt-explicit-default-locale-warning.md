---
"vue-rtl-kit": patch
---

Warn about an explicit Nuxt `defaultLocale` without calling it the module default. The Nuxt module now distinguishes a user-provided `defaultLocale: 'en'` (through `rtl` config or inline module options, including the imported module) from the inherited module default, so the warning only suggests setting `rtl.defaultLocale` when it was not set.
