---
"vue-rtl-kit": minor
---

Add `truncateText(text, maxLength, options?)`, a pure grapheme-aware truncation helper (zero Vue imports) that stops `slice()` from mangling RTL text and emoji:

- Counts and cuts by extended grapheme clusters with `Intl.Segmenter`, so a cut never separates a base letter from its tashkeel or Hebrew niqqud, an emoji ZWJ sequence, or a regional-indicator flag. Lam-alef ligatures and Arabic-Indic / Persian digits count as single clusters.
- The ellipsis (default `U+2026`, configurable via `ellipsis`) counts inside `maxLength`; trailing whitespace and tatweel (`U+0640`) are trimmed before it. Text that fits is returned unchanged.
- `unit: 'word'` cuts at the last word boundary whose cumulative grapheme count fits and falls back to a grapheme cut when one word is longer than the limit; `locale` is passed to `Intl.Segmenter` for locale-sensitive word boundaries.
- `isolate: true` wraps the result in `FSI ... PDI` (`U+2068` / `U+2069`), reusing the `isolate()` helper, on every return path for valid input — fitting text, truncated text, and the ellipsis-only result — and the ellipsis returned for an invalid `maxLength` in production, so the ellipsis stays at the logical end of RTL text inside an LTR paragraph (the visual left end) and the reverse. The isolate controls do not count towards `maxLength`.
- An invalid `locale` tag (e.g. `'!!'`) falls back to the runtime default locale for both grapheme and word segmenters instead of throwing `RangeError`.
- Without `Intl.Segmenter` the helper falls back to Unicode code points via `Array.from` — surrogate pairs are never split, but marks and ZWJ sequences may separate. Word mode still cuts at the last whitespace boundary that fits (the longest whole-word prefix, ellipsis counted) and falls back to the code-point cut for over-long words (documented).
- `maxLength` below 1 or not an integer throws `TypeError` in development and returns the ellipsis string in production (wrapped in `FSI ... PDI` when `isolate: true`).
- Exported from the package root with the `TruncateOptions` type; SSR-safe, tree-shakeable under 2 kB gzip without pulling in Vue, and documented in the README, API reference, a new guide page with an Arabic twin, and `llms-full.txt`.