---
"vue-rtl-kit": patch
---

Align the Nuxt module documentation with the implementation and warn about invalid configuration:

- Document that `registerGlobals` is forwarded to the runtime store and takes effect under Nuxt, while `components: false` only disables Nuxt's own component registration; the runtime store still registers globals unless `registerGlobals: false` is also set.
- Warn through the Nuxt logger when the merged `defaultLocale` matches neither a configured tag nor its language subtag (`ar-EG` matches `ar`), including when replacing `locales` leaves the inherited `en` unlisted (the message now marks it as the module default and points to `rtl.defaultLocale`) and when options are passed inline in `modules`; keep the untouched defaults quiet. The `dir` warning now reads `rtl.dir must be "rtl" or "ltr"; received "..."`.
- Cover `registerGlobals: false`, `components: false`, `css: false`, and the logger warnings with Nuxt fixtures.
