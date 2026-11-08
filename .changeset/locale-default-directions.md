---
"vue-rtl-kit": patch
---

Fix locale-to-direction detection without changing the public API:

- Recognize script subtags only in the language portion of well-formed locale tags, never inside Unicode extensions or private-use suffixes. Arabic numbering-system extensions and Hebrew private-use tags retain RTL direction.
- Default Hausa (`ha`) and Kurdish (`ku`) to LTR, while explicit RTL scripts still take precedence. Add RTL defaults for `pnb`, `mzn`, `lrc`, `glk`, `bal`, and `sdh`.
- Return LTR for well-formed non-RTL languages and reserve the fallback for empty or invalid tags, so unlisted locales such as French correctly switch unpinned stores and provider scopes from RTL to LTR.
- Add table-driven detection, locale-switching, and provider regressions, and document these rules in the English and Arabic locale guides and README.
