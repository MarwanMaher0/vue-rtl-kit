# vue-rtl-kit

## Unreleased

- Add `compareText` and `sortByLocale` for locale-aware comparison and stable, non-mutating sorting. Numeric collation compares `طلب ٢` and `طلب ۲` equally and puts both before `طلب ١٠` by default. Both helpers are also available on `useFormat()` and follow the current scope locale.
- Add `v-digits` for normalizing typed or pasted Arabic-Indic and Persian digits in form fields. Use `{ decimal: true }` to convert `١٬٢٣٤٫٥` to `1234.5` before `v-model` reads it.
- Add `truncateText(text, maxLength, options?)`, a pure grapheme-aware truncation helper (zero Vue imports): counts and cuts by extended grapheme clusters with `Intl.Segmenter`, never splits tashkeel, niqqud, emoji ZWJ sequences or flags, trims trailing whitespace and tatweel before the ellipsis, counts the ellipsis inside `maxLength`, supports `unit: 'word'` with a grapheme fallback, and wraps the result in `FSI ... PDI` with `isolate: true` on every return path — fitting text, truncated text, and the ellipsis-only result — so the ellipsis stays at the logical end of RTL text inside LTR layouts. An invalid `locale` tag falls back to the runtime default locale. Without `Intl.Segmenter` it falls back to code points (surrogate pairs intact), with word mode cutting at the last whitespace boundary that fits; invalid `maxLength` throws `TypeError` in development and returns the ellipsis in production (isolated when requested). Exported with the `TruncateOptions` type; covered by unit, SSR and real-Chromium layout tests, a `{ truncateText }` tree-shake budget under 2 kB gzip, and English/Arabic guide and API docs.

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