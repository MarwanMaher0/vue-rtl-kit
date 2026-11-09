---
"vue-rtl-kit": minor
---

Add opt-in direction/locale persistence to the Nuxt module:

- New `rtl.cookie` module option: `false` (default), a cookie name string, or `{ name, maxAge, sameSite }` (defaults: name `'vue-rtl-kit'`, `maxAge` one year, `sameSite: 'lax'`).
- The runtime plugin reads the cookie with `useCookie`, seeds `createRtl` with the saved locale/direction, and writes the current `locale:dir` pair back on `setLocale`, `setDirection`, and `toggleDirection`, so returning Arabic users get `dir="rtl"` in server-rendered HTML.
- Saved bare locales (`ar`), directions (`rtl`), and `locale:dir` pairs are accepted; unknown values are ignored and the configured defaults apply. Default behaviour with `cookie: false` is unchanged, and no new package exports were added.
