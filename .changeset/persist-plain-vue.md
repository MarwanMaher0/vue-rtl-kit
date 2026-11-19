---
"vue-rtl-kit": minor
---

Add opt-in locale persistence to plain Vue. Closes #1.

- New `RtlOptions.persist`: `false` (default), `'localStorage'`, or `'cookie'`. When set, `createRtl()` reads the stored locale in the browser before creating the store and starts from it only when it is a configured locale (with no `locales`, only when `Intl.getCanonicalLocales` accepts it); unknown values fall back to `defaultLocale`. A pinned `dir` option stays pinned.
- New `RtlOptions.persistKey` (default `'rtl-locale'`): the localStorage item name or cookie name. The cookie is written with `path=/`, `SameSite=Lax`, a one-year `max-age`, and an encoded name and value.
- Every `setLocale()` writes the locale through the existing effect scope, so `dispose()` stops persistence writes along with document sync. Storage access is wrapped in try/catch and never throws; nothing runs at import time or on the server, and without `persist` behaviour is unchanged.
- The Nuxt module excludes `persist` and `persistKey` from `ModuleOptions`; Nuxt keeps persisting through its SSR-aware `cookie` option.