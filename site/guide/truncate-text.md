# Truncating text

Cards, tables and menus shorten long names with `name.slice(0, max) + '…'`. That counts UTF-16 code units, so it cuts a base letter away from its tashkeel (`مُحَمَّدٌ` becomes `مُحَمّ` + a dangling mark), splits an emoji ZWJ sequence (`👨‍👩‍👧‍👦`) or a flag (`🇪🇬`) into garbage, and — when RTL text is cut inside an LTR layout — strands the ellipsis at the visual *right* end, far from where the text actually ended.

`truncateText` is a pure helper (zero Vue imports) that counts and cuts by grapheme clusters with `Intl.Segmenter`, trims trailing whitespace and tatweel before the ellipsis, counts the ellipsis inside the limit, and can wrap the result in an isolate so the ellipsis stays at the logical end in either paragraph direction.

```ts
import { truncateText } from 'vue-rtl-kit'

truncateText('مُحَمَّدٌ عَبْدُ اللَّهِ', 5) // 'مُحَمَّدٌ…' — never orphans a shadda
truncateText('مرحبا بالعالم', 20)          // 'مرحبا بالعالم' — fits, returned unchanged
```

## Grapheme clusters, not code units

One cluster is what a reader calls one character: a base letter with all its marks, an emoji ZWJ sequence, a regional-indicator flag pair. The cut never lands inside one.

```ts
truncateText('مُحَمَّدٌ عَبْدُ اللَّهِ', 5) // 'مُحَمَّدٌ…' (4 clusters + ellipsis)
truncateText('שָׁלוֹם עֲלֵיכֶם', 5)         // 'שָׁלוֹם…' — Hebrew niqqud stays attached
truncateText('ﻻ إله إلا الله', 2)          // 'ﻻ…' — the lam-alef ligature is one cluster
truncateText('١٢٣٤٥٦', 4)                  // '١٢٣…' — Arabic-Indic digits count one each
truncateText('۱۲۳۴۵', 3)                   // '۱۲…' — Persian digits too
truncateText('👨‍👩‍👧‍👦🇪🇬🎉🎉', 3)             // '👨‍👩‍👧‍👦🇪🇬…' — family and flag stay whole
truncateText('الإصدار v1.2.3 متاح الآن', 10) // 'الإصدار v…' — mixed Arabic and English
```

Trailing whitespace and tatweel (`U+0640`) are trimmed before the ellipsis, so a cut never ends with `مرحباـــ…` or a hanging space:

```ts
truncateText('مرحبا بالعالم', 7)      // 'مرحبا…' not 'مرحبا …'
truncateText('مرحباـــ بالعالم', 8)   // 'مرحبا…' not 'مرحباـــ…'
```

## The ellipsis counts inside maxLength

The result is never longer than `maxLength` clusters, marker included. The default marker is the single character `U+2026`; pass `ellipsis` to change it, and its own clusters count against the limit. When the ellipsis alone fills the limit, it is returned by itself.

```ts
truncateText('abcdefgh', 5, { ellipsis: '...' }) // 'ab...' (2 + 3 = 5)
truncateText('مرحبا', 1)                          // '…'
truncateText('abcdef', 3, { ellipsis: '' })       // 'abc' — no marker
```

## Word mode

`unit: 'word'` cuts at the last word boundary that fits instead of mid-word. When even the first word is longer than the limit, it falls back to a grapheme cut rather than returning nothing. Word boundaries come from `Intl.Segmenter`, so pass `locale` for languages without spaces.

```ts
truncateText('مرحبا بالعالم يا أصدقاء', 14, { unit: 'word' }) // 'مرحبا بالعالم…'
truncateText('مرحبا بالعالم يا أصدقاء', 8, { unit: 'word' })  // 'مرحبا…' — 'بالعالم' would not fit
truncateText('الاستخدامات', 4, { unit: 'word' })              // 'الا…' — one long word, grapheme fallback
truncateText('الإصدار v1.2.3 متاح الآن', 15, { unit: 'word' }) // 'الإصدار v1.2.3…'
truncateText('سلام دنیا، حال شما چطور است؟', 10, { unit: 'word', locale: 'fa' }) // 'سلام دنیا…'
truncateText('สวัสดีชาวโลกทุกคน', 7, { unit: 'word', locale: 'th' }) // 'สวัสดี…' — Thai has no spaces
```

## Keeping the ellipsis at the logical end

In an LTR paragraph, a trailing `…` after an RTL run is a neutral character resolved against the paragraph direction — so it renders at the visual right end even though the text was cut at its logical (left) end. `isolate: true` wraps the result in `FSI ... PDI` (`U+2068` / `U+2069`), the same isolate [`isolate()`](/guide/text-helpers) emits, and the ellipsis stays where the cut happened in both directions.

```ts
truncateText('الإصدار التجريبي من المكتبة متاح الآن', 12, { isolate: true })
// '\u2068الإصدار الت\u2026\u2069' — ellipsis at the visual left end inside an LTR card
truncateText('Release notes for the library', 12, { isolate: true })
// '\u2068Release not\u2026\u2069' — ellipsis at the visual right end, unchanged
```

The two isolate controls are formatting characters: they do not count towards `maxLength`. Isolation applies on every return path for valid input — text that fits, truncated text, and the ellipsis-only result — and to the ellipsis returned for an invalid `maxLength` in production. Without `isolate`, text that fits is returned unchanged.

## Options

```ts
interface TruncateOptions {
  ellipsis?: string // default '…' (U+2026); counts inside maxLength
  unit?: 'grapheme' | 'word' // default 'grapheme'
  locale?: string // BCP 47 locale for Intl.Segmenter
  isolate?: boolean // default false; wrap the result in FSI ... PDI
}
```

| Option | Default | Description |
| --- | --- | --- |
| `ellipsis` | `'…'` (`U+2026`) | Marker appended when the text is cut; its clusters count inside `maxLength`. |
| `unit` | `'grapheme'` | `'word'` cuts at the last word boundary that fits, with a grapheme fallback for over-long words. |
| `locale` | runtime default | BCP 47 locale passed to `Intl.Segmenter`; word boundaries are locale-sensitive. An invalid tag (e.g. `'!!'`) falls back to the runtime default locale instead of throwing. |
| `isolate` | `false` | Wrap the result in `FSI ... PDI` so the ellipsis stays at the logical end; applies to fitting text, truncated text, and the ellipsis-only result alike. |

## Fallback without Intl.Segmenter

When `Intl.Segmenter` is unavailable (older browsers, some minimal SSR runtimes), the helper counts and cuts by Unicode code points via `Array.from`. Surrogate pairs are never split, but a base letter **can** be separated from its combining marks and a ZWJ sequence **can** break. Word mode still respects words: it cuts at the last whitespace boundary that fits (the longest whole-word prefix, ellipsis counted) and falls back to the code-point cut when one word is longer than the limit. Everything else — the ellipsis budget, trimming, isolation, the `maxLength` contract — behaves identically. On the server the helper never touches the DOM, so it is safe in any SSR render.

## Invalid maxLength

`maxLength` must be an integer of at least 1. In development an invalid limit throws a `TypeError`; in production (`NODE_ENV === 'production'`, or a browser build with no `process` global) it returns the ellipsis string instead — wrapped in `FSI ... PDI` when `isolate: true` — so a bad limit degrades to a marker rather than crashing a render.

```ts
truncateText('مرحبا', 0)   // TypeError in development
truncateText('مرحبا', 2.5) // TypeError in development; '…' in production
```

See the [API reference](/api#truncate-text) for the full signature.