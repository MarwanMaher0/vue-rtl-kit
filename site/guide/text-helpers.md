# Text helpers

These standalone helpers handle Unicode isolates and locale direction without a component or a DOM. They are safe in a server render, a utility module, or a string that is about to be copied.

```ts
import {
  detectDirection,
  directionOfLocale,
  hasRtlCharacters,
  isolate,
  isolateRuns,
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
splitBidiRuns('12-05-2024', 'rtl') // → [{"text":"12-05-2024","dir":"ltr","hasStrong":false,"isolated":true}]
splitBidiRuns('زر GitHub، ثم عد', 'rtl') // → [{"text":"زر","dir":"rtl","hasStrong":true,"isolated":false},{"text":" ","dir":"rtl","hasStrong":false,"isolated":false},{"text":"GitHub","dir":"ltr","hasStrong":true,"isolated":true},{"text":"، ","dir":"rtl","hasStrong":false,"isolated":false},{"text":"ثم عد","dir":"rtl","hasStrong":true,"isolated":false}]
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
