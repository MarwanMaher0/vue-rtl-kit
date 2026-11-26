# Text helpers

These standalone helpers handle Unicode isolates, locale direction, client-side RTL search, and locale-aware sorting without a component or a DOM. They are safe in a server render, a utility module, or a string that is about to be copied.

```ts
import {
  detectDirection,
  directionOfLocale,
  findSearchMatches,
  foldSearchText,
  hasRtlCharacters,
  isolate,
  isolateRuns,
  matchesSearch,
  resolveDirection,
  splitBidiRuns,
  stripBidiControls,
} from 'vue-rtl-kit'
```

## `isolate(text, dir?)`

Wrap a whole string in one isolate. The default `'auto'` emits FSI and lets the consumer detect the direction; pass `'ltr'` or `'rtl'` to pin LRI or RLI.

```ts
isolate('مرحبا') // → '\u2068مرحبا\u2069'
isolate('v1.2.3', 'ltr') // → '\u2066v1.2.3\u2069'
isolate('v1.2.3', 'rtl') // → '\u2067v1.2.3\u2069'
isolate('', 'ltr') // → ''
```

## `isolateRuns(text, baseDir)`

Isolate only the runs that would be reordered, after stripping any bidi controls already in the input. This is the string form of `<BidiText>`.

```ts
isolateRuns('تم التحديث في 12-05-2024', 'rtl') // → 'تم التحديث في \u206612-05-2024\u2069'
isolateRuns('Hello عالم', 'ltr') // → 'Hello \u2067عالم\u2069'
isolateRuns('نص عربي خالص', 'rtl') // → 'نص عربي خالص'
```

## `splitBidiRuns(text, baseDir)`

Return the raw runs as `{ text, dir, isolated, hasStrong }[]`. Concatenating `text` reproduces the input exactly, and `isolated` marks the runs that need wrapping.

```ts
splitBidiRuns('12-05-2024', 'rtl') // → [
//   { text: '12-05-2024', dir: 'ltr', hasStrong: false, isolated: true },
// ]
splitBidiRuns('زر GitHub، ثم عد', 'rtl') // → [
//   { text: 'زر', dir: 'rtl', hasStrong: true, isolated: false },
//   { text: ' ', dir: 'rtl', hasStrong: false, isolated: false },
//   { text: 'GitHub', dir: 'ltr', hasStrong: true, isolated: true },
//   { text: '، ', dir: 'rtl', hasStrong: false, isolated: false },
//   { text: 'ثم عد', dir: 'rtl', hasStrong: true, isolated: false },
// ]
splitBidiRuns('', 'rtl') // → []
```

## `detectDirection(text, fallback?)`

Use the Unicode first-strong-character rule, the same rule as `dir="auto"`. Leading digits and punctuation are skipped.

```ts
detectDirection('مرحبا world') // → 'rtl'
detectDirection('Hello عالم') // → 'ltr'
detectDirection('2024 - مرحبا') // → 'rtl'
detectDirection('123', 'rtl') // → 'rtl'
```

## `hasRtlCharacters(text)`

A cheap predicate for at least one strong right-to-left character.

```ts
hasRtlCharacters('مرحبا') // → true
hasRtlCharacters('hello') // → false
```

## `stripBidiControls(text)`

Remove every Unicode bidi control character: marks, embeddings, overrides, and isolates.

```ts
stripBidiControls('\u200E\u202Aabc\u202C\u2067د\u2069') // → 'abcد'
```

## `directionOfLocale(locale, fallback?)`

Resolve a BCP-47 tag from its script subtag first, then its language. The fallback is used only for an empty or invalid tag.

```ts
directionOfLocale('ar-EG') // → 'rtl'
directionOfLocale('ku-Latn') // → 'ltr'
directionOfLocale('az-Arab') // → 'rtl'
directionOfLocale('', 'rtl') // → 'rtl'
```

## `resolveDirection(locale, locales, fallback?)`

Check an explicit locale map first, matching the exact tag and then the language subtag, before applying locale detection.

```ts
resolveDirection('ar-EG', { ar: 'rtl' }) // → 'rtl'
resolveDirection('fr', {}) // → 'ltr'
resolveDirection('ku-Arab', { ku: 'ltr' }, 'rtl') // → 'ltr'
```

## Search helpers {#search-helpers}

Stored Arabic, Persian, and Hebrew strings often include hamza variants, harakat, tatweel, Hebrew points, presentation ligatures, or local digits that visitors omit when typing a query, causing `name.includes(query)` to return `false`. `foldSearchText()`, `matchesSearch()`, and `findSearchMatches()` normalise both sides without touching Vue or the DOM, and never throw.

These helpers perform deterministic character folding and exact folded substring matching only — **no stemming, root extraction, morphological analysis, or fuzzy matching**.

### `foldSearchText(text, options?)`

Return the normalised search key for indexing or comparison:

- Apply Unicode `NFKC` so Arabic and Hebrew presentation forms (including `ﻻ`, `ﻷ`, `ﷲ`, and `שּ`) unfold to standard letters and marks before folding.
- Strip Arabic harakat (`U+064B`–`U+065F`, `U+0670`, `U+06D6`–`U+06ED`), tatweel (`U+0640`), Hebrew points (`U+0591`–`U+05C7`), and Unicode bidi controls.
- Map `آ` (`U+0622`), `أ` (`U+0623`), `إ` (`U+0625`), and `ٱ` (`U+0671`) to `ا` (`U+0627`); `ؤ` (`U+0624`) to `و` (`U+0648`); `ئ` (`U+0626`) and Persian `ی` (`U+06CC`) to `ي` (`U+064A`); and Persian `ک` (`U+06A9`) to `ك` (`U+0643`).
- Lowercase Latin letters and collapse runs of whitespace to a single space `' '`.
- Optionally fold `ة` (`U+0629`) to `ه` (`U+0647`), `ى` (`U+0649`) to `ي` (`U+064A`), and Arabic-Indic (`٠`–`٩`) and Persian (`۰`–`۹`) digits to ASCII `0`–`9` (all enabled by default).

| Option | Default | Effect when `true` |
| --- | --- | --- |
| `taMarbuta` | `true` | Fold `ة` (`U+0629`) to `ه` (`U+0647`). |
| `alefMaqsura` | `true` | Fold `ى` (`U+0649`) to `ي` (`U+064A`). (`ئ` and Persian `ی` always fold to `ي`.) |
| `digits` | `true` | Fold Arabic-Indic (`U+0660`–`U+0669`) and Persian (`U+06F0`–`U+06F9`) digits to `0`–`9`. |

```ts
foldSearchText('أَحْمَد عـبـدالله ١٢٣') // 'احمد عبدالله 123'
foldSearchText('فاطمة مصطفى', { taMarbuta: false }) // 'فاطمة مصطفي'
foldSearchText('مُصْطَفَىٰ', { alefMaqsura: false }) // 'مصطفى'
foldSearchText('طلب ۱۲۳', { digits: false }) // 'طلب ۱۲۳'
foldSearchText('שָׁלוֹם עֲלֵיכֶם') // 'שלום עליכם'
foldSearchText(null) // ''
```

### `matchesSearch(text, query, options?)`

Test whether folded `text` contains folded `query`. An empty or marks-only `query` matches any string (`true`); passing `null` or `undefined` as `text` returns `false`.

```ts
matchesSearch('مُحَمَّد أحمد', 'محمد احمد') // true
matchesSearch('کتابخانه علی', 'كتابخانه علي') // true
matchesSearch('فاطمة', 'فاطمه', { taMarbuta: false }) // false
matchesSearch('أحمد', '') // true
matchesSearch(null, '') // false
```

### `findSearchMatches(text, query, options?)`

Return sorted, non-overlapping `{ start, end }` ranges in UTF-16 code units of the **original** `text`. Each `end` offset extends across trailing combining marks on the final matched letter so wrapping slices in `<mark>` never splits a letter from its harakat or niqqud. Surrogate pairs (emoji) and presentation ligatures (`ﻻ`, `ﻷ`) keep exact UTF-16 offsets. An empty or marks-only `query`, `null` `text`, or a non-matching query returns `[]`.

```ts
const title = '😀 مرحبا مُحَمَّدٌ في ﻻهور'
const ranges = findSearchMatches(title, 'محمد') // [{ start: 9, end: 18 }]
title.slice(ranges[0].start, ranges[0].end) // 'مُحَمَّدٌ'
findSearchMatches(title, 'لاهور') // [{ start: 22, end: 26 }]
findSearchMatches(title, '') // []
```

## Locale-aware sorting {#locale-aware-sorting}

Use `compareText()` and `sortByLocale()` to order display text, rather than sorting keys from `foldSearchText()`. By default, `ignoreDiacritics` strips only Arabic tashkeel (vowel marks, shadda, sukun, and superscript alef) and tatweel before comparison. Plain alef (`ا`), alef with hamza (`أ`, `إ`), and alef with madda (`آ`) are not folded together. They follow the locale's collation rules, as do Latin accents and letter case. The original text is left intact.

### `compareText(a, b, options?)`

Use the result as a comparator: negative if `a` comes before `b`, zero if they compare equally, positive if `a` comes after `b`. Only the sign is guaranteed, not the exact values `-1` and `1`.

```ts
import { compareText, sortByLocale } from 'vue-rtl-kit'

compareText('مُحَمَّد', 'مـحمد', { locale: 'ar' }) // 0
compareText('مُحَمَّد', 'محمد', { locale: 'ar', ignoreDiacritics: false }) !== 0 // true
compareText('احمد', 'أحمد', { locale: 'ar' }) !== 0 // true
compareText('طلب ٢', 'طلب ۲', { locale: 'ar' }) // 0
compareText('طلب 2', 'طلب ٢', { locale: 'ar' }) // 0
compareText('طلب ٢', 'طلب ١٠', { locale: 'ar' }) < 0 // true
compareText('طلب ٢', 'طلب ١٠', { locale: 'ar', numeric: false }) > 0 // true
```

### `sortByLocale(items, options?)`

For strings, the item is its own key. For objects, pass a `key` callback. The result is a new array, and items with equal keys keep their original order.

```ts
sortByLocale(['طلب ١٠', 'طلب ٢', 'طلب ۲', 'طلب ۳'], { locale: 'ar' })
// ['طلب ٢', 'طلب ۲', 'طلب ۳', 'طلب ١٠']

const orders = [
  { id: 1, title: 'طلب ٢' },
  { id: 2, title: '' },
  { id: 3, title: 'طلب ١٠' },
]
const sorted = sortByLocale(orders, {
  locale: ['ar-EG', 'ar', 'en'],
  key: (order) => order.title,
  direction: 'desc',
})
sorted.map((order) => order.id) // [2, 3, 1]
```

An actual empty string (`''`) comes first in both ascending and descending order. A `null` or `undefined` key is different: it throws `TypeError` in development and always sorts last in production, even when descending.

`direction: 'desc'` works with either helper; the default is `'asc'`. With mixed Arabic and Latin text, `caseFirst: 'upper'` puts `ملف A` ahead of `ملف a` in ascending order. Use `'lower'` for the opposite. The default `'false'` sets no case priority, but case still affects the comparison.

Both standalone helpers default to `'en'`; pass a BCP-47 locale tag or an array of tags in order of preference. In Nuxt, import the standalone functions explicitly from `vue-rtl-kit`. To follow the current Vue locale instead, use the [methods on `useFormat()`](/guide/use-format#locale-aware-sorting). See the [API reference](/api#locale-aware-sorting) for all options.
