# vue-rtl-kit

## 0.2.0

### Minor Changes

- 13b4cbd: Add `formatDisplayName(code, options)` over `Intl.DisplayNames`, so language and country pickers on Arabic, Persian and Hebrew pages stop showing English names — `العربية` instead of `Arabic`, `مصر` instead of `Egypt`:

  - `options.type` is required: `'language' | 'region' | 'currency' | 'script' | 'calendar' | 'dateTimeField'`. `style` (`'long' | 'short' | 'narrow'`) and `languageDisplay` (`'dialect' | 'standard'`, e.g. `ar-EG` as "Arabic (Egypt)") are forwarded to `Intl`.
  - An unknown code returns the code itself (`fallback: 'code'`, the default) or an empty string (`fallback: 'none'`). Structurally invalid codes, and runtimes without `Intl.DisplayNames`, return the same fallback instead of throwing.
  - Locale tags get the same underscore normalization and language-subtag / `en` fallback as the other formatters, and instances are cached per locale and options in an LRU bounded by `FORMATTER_CACHE_LIMIT` (counted by `formatterCacheStats()` as `displayName`).
  - `useFormat()` now exposes a bound `formatDisplayName` that follows `setLocale()`; display names are words, so the bound `numberingSystem` and `isolate` do not apply. The `FormatDisplayNameOptions` type is exported from `vue-rtl-kit`.

- 8d31507: Add `formatDuration(duration, options?)`, a pure locale-aware duration formatter (zero Vue imports) that stops hand-joined numbers and words from getting Arabic plural forms and digit shapes wrong in video lengths, delivery estimates and timers:

  - Takes an object of units (`years`, `months`, `weeks`, `days`, `hours`, `minutes`, `seconds`, `milliseconds`) or a number of milliseconds, and returns the locale's own plural forms, conjunction and digits: `ساعتان و3 دقائق`, `١١ ساعة ودقيقتان`, `11 يومًا`.
  - `style` is `'long'` (default), `'short'`, `'narrow'`, or `'digital'` for `h:mm:ss` in the digits of the locale (`١:٠٢:٠٣`). `numberingSystem` picks `'latn'`, `'arab'` or any other CLDR numbering system.
  - `largestUnit` and `smallestUnit` balance the duration between two units; `maxUnits` keeps that many units, counted from the first non-zero one, and rounds the last, so the plural form follows the rounded number.
  - An object of whole numbers is written as given. A number of milliseconds and an object with fractional or mixed-sign fields are balanced; fractions are carried into the smaller units, the last unit is rounded half away from zero and carries upward (`ساعة`, never `60 دقيقة`).
  - A negative duration gets one sign in front, written as the locale's minus sign. Units that are zero are left out, and a duration that is zero or rounds to zero is written as zero of the smallest unit.
  - Uses `Intl.DurationFormat` when the runtime has it. Without it (Node.js before 23, Chrome before 129, Firefox before 136, Safari before 16.4) each unit is formatted with `Intl.NumberFormat` unit style and the units are joined with `Intl.ListFormat`, which returns the same strings for `'long'`, `'short'` and `'narrow'`; the fallback's `'digital'` always separates with `:`.
  - Invalid input throws `TypeError` in development and returns an empty string in production.

  Also exports the `DurationInput`, `DurationUnit`, `DurationStyle` and `FormatDurationOptions` types. No existing API changes.

- e72a44c: Add `formatPlural(count, forms, options)` over `Intl.PluralRules`, so apps stop shipping `n === 1 ? a : b` — which is wrong for Arabic's six plural categories (`0` zero, `1` one, `2` two, `3`–`10` few, `11`–`99` many, `100` other):

  - `forms` is `Partial<Record<'zero' | 'one' | 'two' | 'few' | 'many' | 'other', string>>` with `other` required. The category comes from the locale's CLDR rules, and a category without a form falls back to `other`. Hebrew `two`, Persian `one` for `0`, and English ordinals work too.
  - Every `{count}` in the chosen form is replaced with `formatNumber(count, options)`, so `numberingSystem` and `isolate` keep working inside the sentence. Text without `{count}` is returned as is.
  - `options` takes the shared `locale`, `numberingSystem` and `isolate` plus `type: 'cardinal' | 'ordinal'`. Locale tags get the same underscore normalization and language-subtag / `en` fallback as the other formatters, and invalid numbering systems fall back to `'latn'`.
  - `NaN`, `Infinity`, negative and fractional counts select the category the rules report without throwing. An empty `forms.other`, or a runtime without `Intl.PluralRules`, returns an empty string.
  - Rules instances are cached per locale and `type` in an LRU bounded by `FORMATTER_CACHE_LIMIT`.
  - `useFormat()` now exposes a bound `formatPlural` that follows `setLocale()` and the configured `numberingSystem`; the `PluralForms` and `FormatPluralOptions` types are exported from `vue-rtl-kit`.

- 2e57e32: Add `formatDateRange(start, end, options)` and `formatNumberRange(start, end, options)` for booking, schedule and pricing ranges on Arabic pages. Joining two formatted values with a hyphen repeats the shared month or currency, uses the wrong range separator for the locale, and breaks the visual order in RTL; the new helpers call `Intl.DateTimeFormat.prototype.formatRange` and `Intl.NumberFormat.prototype.formatRange` instead:

  - Shared parts collapse the way the locale's range pattern says: `٣–٥ مارس ٢٠٢٤` (one month, one year), `۱۳ تا ۱۵ اسفند ۱۴۰۲` in Persian, and one `ج.م.` symbol for a whole Arabic price range.
  - `formatDateRange` accepts `Date`, timestamp or ISO string ends and the same options as `formatDate` (including `calendar` and `timeZone`); `formatNumberRange` accepts `number` or `bigint` ends and the same options as `formatNumber` (currency, unit, compact).
  - Both reuse the existing `formatDate` / `formatNumber` LRU formatter caches (`formatterCacheStats` gains no new key) and the same locale and numbering-system resolution and fallbacks, and are exported from `vue-rtl-kit` and bound on `useFormat()`.
  - A reversed range (`start` greater than `end`) is formatted as given, exactly like `Intl`, without throwing. An invalid date or a non-finite number throws a `TypeError` in development and returns an empty string in production.
  - On runtimes without `formatRange`, both ends are formatted and joined with the locale's range separator — a spaced en dash for dates (`تا` in Persian), an en dash for numbers — with each end wrapped in a first-strong isolate (FSI ... PDI) so the endpoints keep their reading order in an RTL paragraph.

- 3d2e61b: Add logical inline scroll helpers and `useInlineScroll` so horizontal scrollers, carousels, and edge checks work identically in LTR and RTL without fighting negative RTL `scrollLeft`:

  - Add pure `src/scroll.ts` (zero Vue imports, horizontal writing modes only): `getScrollInline(el)`, `getScrollInlineMax(el)`, `scrollToInline(el, offset, options?)`, `scrollByInline(el, delta, options?)`, and `scrollInlineEdges(el, tolerance = 1)` (plus `ScrollInlineOptions` and `ScrollInlineEdges` types). Direction is read from `getComputedStyle(el).direction`, so nested `dir` islands, `v-rtl`, and `<RtlProvider>` scopes resolve automatically. Non-overflowing elements report `0` and both edges `true`; `null` targets, SSR, `NaN`, and `Infinity` return `0` or no-op and never throw.
  - Add `useInlineScroll(target, options?)` (plus `UseInlineScrollOptions` and `UseInlineScrollReturn` types) returning readonly `offset`, `max`, `atStart`, and `atEnd` refs along with `scrollTo`, `scrollBy`, `scrollToStart`, and `scrollToEnd`. Attaches a passive `scroll` listener and `ResizeObserver`, re-reads on `target` and `useDirection().dir` changes, removes listeners on dispose, and is SSR-safe.

- 39d2453: Add `formatList(items, options)` and `formatRelativeTime(value, unit, options)` over `Intl.ListFormat` and `Intl.RelativeTimeFormat`:

  - Both accept the same `locale`, `numberingSystem` and `isolate` options as `formatNumber` / `formatDate`, plus the matching `Intl` options (`type` and `style` for lists; `numeric` and `style` for relative time). Locale tags get the same underscore normalization and language-subtag / `en` fallback, and invalid numbering systems fall back to `'latn'`.
  - With `isolate` set, `formatList` wraps every item in a first-strong isolate and then isolates the whole result, so Latin names cannot reorder inside an Arabic list.
  - `formatRelativeTime` returns an empty string for a non-finite value, like `formatDate` does for an invalid date.
  - Each kind is cached in its own LRU bounded by `FORMATTER_CACHE_LIMIT`.
  - `useFormat()` now exposes bound `formatList` and `formatRelativeTime` that follow `setLocale()` and the configured `numberingSystem`; the `ListFormatOptions` and `RelativeTimeFormatOptions` types are exported from `vue-rtl-kit`.

- 248fc80: Add `compareText` and `sortByLocale` for locale-aware text ordering with a bounded cache of `Intl.Collator` instances. By default, numeric collation puts `طلب ٢` before `طلب ١٠` and treats `طلب 2`, `طلب ٢`, and `طلب ۲` as equal. Only Arabic tashkeel and tatweel are stripped by default; hamza and madda forms, Latin accents, and case keep their locale-specific ordering.

  `sortByLocale` returns a stable new array and accepts a `key` callback for objects. Empty strings stay first in both directions; `null` and `undefined` keys throw `TypeError` in development and stay last in production. The standalone helpers default to `en` and are not Nuxt auto-imports. Their `useFormat()` counterparts follow the scope locale and accept a locale tag or ordered locale array as a per-call override.

- bb87c7f: Add direction-aware keyboard navigation helpers for WAI-ARIA composite widgets:

  - Export pure `logicalArrow(key, dir)` (and `LogicalArrow`) from `src/logical.ts` and `vue-rtl-kit` to map `ArrowLeft`, `ArrowRight`, `Home`, `End`, `ArrowUp`, and `ArrowDown` to `'next' | 'previous' | 'first' | 'last' | 'up' | 'down' | null` (`ArrowRight` resolves to `'previous'` and `ArrowLeft` to `'next'` in `'rtl'`, while `Home`/`End` stay `'first'`/`'last'`).
  - Add `arrow(event)` to `useLogicalStyles()` using the nearest direction scope (so `<RtlProvider dir="ltr">` on an RTL page resolves LTR) and returning `null` when `Ctrl`, `Alt`, or `Meta` is held.

- b03cec5: Add `resolvePlacement`, `toLogicalPlacement`, and `useLogicalPlacement` for tooltips, menus, and popovers. Convert between logical and physical placements in LTR and RTL without a positioning dependency. The SSR-safe Vue composable can follow either the injected direction or the computed direction of an anchor inside a local `dir` island.
- 4c424a3: Handle CSS shorthands in the logical style helpers:

  - `toPhysicalStyle` now expands 1- and 2-value logical shorthands (`marginInline`, `paddingInline`, `insetInline`, `insetBlock`, `borderInlineWidth`/`Style`/`Color`, `scrollMarginInline`, `scrollPaddingInline`, plus their block-axis and scroll counterparts) to the physical sides for the given direction instead of returning them unchanged.
  - `toLogicalStyle` accepts opt-in `{ shorthands: true }` to expand 1–4-value (or numeric) physical `margin`, `padding`, `inset`, `borderWidth`, `borderStyle`, `borderColor`, and `borderRadius` into logical longhands. Values containing `var()`, `calc()`, `!important`, or a top-level `border-radius` slash are left untouched; other functions such as `rgb()`, `hsl()`, and `env()` are preserved and split only at top-level whitespace.
  - Default output is unchanged when the new option is off, and exports are unchanged.

- 8e14c48: Add opt-in direction/locale persistence to the Nuxt module:

  - New `rtl.cookie` module option: `false` (default), a cookie name string, or `{ name, maxAge, sameSite }` (defaults: name `'vue-rtl-kit'`, `maxAge` one year, `sameSite: 'lax'`).
  - The runtime plugin reads the cookie with `useCookie`, seeds `createRtl` with the saved locale/direction, and writes the current `locale:dir` pair back on `setLocale`, `setDirection`, and `toggleDirection`, so returning Arabic users get `dir="rtl"` in server-rendered HTML.
  - Saved bare locales (`ar`), directions (`rtl`), and `locale:dir` pairs are accepted; unknown values are ignored and the configured defaults apply. Default behaviour with `cookie: false` is unchanged, and no new package exports were added.

- 98e853c: Add `parseNumber(text, options)`, the inverse of `formatNumber` for form input. `Number()` returns `NaN` for what `formatNumber` writes in `ar-EG`, `fa-IR`, `he`, `de` or `fr`; `parseNumber` reads it back:

  - `options` takes `locale` (default `'en'`) and `numberingSystem`. The group separator, decimal separator and minus sign are read from `Intl.NumberFormat` `formatToParts()` for that locale and numbering system rather than from a table, cached in an LRU bounded by `FORMATTER_CACHE_LIMIT`. Locale tags and numbering systems get the same normalization and fallbacks as `formatNumber`.
  - Western, Arabic-Indic and Persian digits are accepted in every locale, along with the locale's own digits.
  - U+061C, U+200E, U+200F, the isolates U+2066–U+2069, NBSP, U+202F and spaces are ignored, so `isolate: true` output and space-grouped numbers parse.
  - An ASCII hyphen or U+2212 is a minus sign and a leading `+` is allowed; a trailing `%` or `٪` (U+066A) divides the result by 100.
  - Group separators are accepted only between digits of the integer part; group sizes are not checked, so `en-IN` lakh grouping parses. Where the locale groups with a space (`fr`, `sv`), a space between two digits is the group separator, so `1 234,5` parses and `1,2 3` is `NaN`.
  - Returns `NaN` for empty text, letters, a second decimal separator, a separator on its own or any other invalid input, and never throws.
  - `useFormat()` now exposes a bound `parseNumber` that follows `setLocale()` and the configured `numberingSystem`; the `ParseNumberOptions` type is exported from `vue-rtl-kit`.

- 6e9b04a: Add opt-in locale persistence to plain Vue. Closes #1.

  - New `RtlOptions.persist`: `false` (default), `'localStorage'`, or `'cookie'`. When set, `createRtl()` reads the stored locale in the browser before creating the store and starts from it only when it is a configured locale (with no `locales`, only when `Intl.getCanonicalLocales` accepts it, restored in its canonical spelling); unknown values fall back to `defaultLocale`. A pinned `dir` option stays pinned.
  - New `RtlOptions.persistKey` (default `'rtl-locale'`): the localStorage item name or cookie name. The cookie is written with `path=/`, `SameSite=Lax`, a one-year `max-age`, and an encoded name and value.
  - Every `setLocale()` writes the locale through the existing effect scope, so `dispose()` stops persistence writes along with document sync. Storage access is wrapped in try/catch and never throws; nothing runs at import time or on the server, and without `persist` behaviour is unchanged.
  - The Nuxt module excludes `persist` and `persistKey` from `ModuleOptions`; Nuxt keeps persisting through its SSR-aware `cookie` option.

- 940fb06: Add pure phone-number helpers (`normalizePhone`, `validatePhone`, `formatPhone`) with zero Vue imports and zero runtime dependencies for eight Arab-region numbering plans (`SA`, `AE`, `KW`, `QA`, `BH`, `OM`, `EG`, `JO`):

  - `normalizePhone(value, options?)` maps Arabic-Indic (`٠-٩`) and Persian (`۰-۹`) digits via `transliterateDigits`, strips bidi controls, spaces, dashes, dots, and parentheses, accepts `+`, `00`, bare country codes, and regional trunk `0` (`SA`, `AE`, `EG`, `JO`), rejects letters, and returns canonical E.164 or `''`.
  - `validatePhone(value, options?)` validates national lengths and mobile/fixed prefixes against built-in regulator rules (CST, TDRA, CITRA, CRA, TRA Bahrain, TRA Oman, NTRA, TRC), supports `regions`, `mobileOnly`, and `defaultRegion`, and returns `{ valid, e164, region?, type?, reason? }` with `reason` in `'empty' | 'letters' | 'length' | 'prefix' | 'region'`.
  - `formatPhone(e164, options?)` groups digits by each region's documented convention, supports `locale` and `numberingSystem` (`latn`, `arab`, `arabext`, or any CLDR numbering system), and wraps the result in `LRI ... PDI` (`U+2066` ... `U+2069`) by default (`isolate: true`) so the leading `+` stays on the left inside Arabic text.

  Also exports `PhoneRegion`, `PhoneType`, `PhoneInvalidReason`, `NormalizePhoneOptions`, `ValidatePhoneOptions`, `PhoneValidationResult`, and `FormatPhoneOptions`. No existing API changes.

- 23df545: Add pure client-side RTL search helpers (`foldSearchText`, `matchesSearch`, and `findSearchMatches`) so Arabic, Persian, Hebrew, and mixed-script text matches user queries typed without diacritics, hamza variants, tatweel, or local digits:

  - Add pure `src/search.ts` (zero Vue imports) exporting `foldSearchText(text, options?)`, `matchesSearch(text, query, options?)`, `findSearchMatches(text, query, options?)`, `SearchOptions`, and `SearchMatch`.
  - `foldSearchText` applies Unicode `NFKC` (unfolding Arabic and Hebrew presentation forms such as lam-alef ligatures), strips Arabic harakat (`U+064B`–`U+065F`, `U+0670`, `U+06D6`–`U+06ED`), tatweel (`U+0640`), Hebrew points (`U+0591`–`U+05C7`), and Unicode bidi controls, folds `آ`/`أ`/`إ`/`ٱ` → `ا`, `ؤ` → `و`, `ئ`/`ی` → `ي`, and `ک` → `ك`, lowercases Latin characters, and collapses whitespace runs to `' '`. `SearchOptions` flags `taMarbuta` (`ة` → `ه`), `alefMaqsura` (`ى` → `ي`), and `digits` (Arabic-Indic and Persian digits → ASCII `0`–`9`) all default to `true`.
  - `findSearchMatches` returns sorted, non-overlapping `{ start, end }` UTF-16 code-unit offsets in the original string, extending `end` over trailing combining marks so `<mark>` highlights never split a base letter from its harakat or niqqud, and preserving offsets across surrogate pairs and presentation ligatures. Empty or marks-only queries match in `matchesSearch` (`true`) and return `[]` in `findSearchMatches`; `null` or `undefined` text returns `false`/`[]`; none of the helpers ever throws, and no stemming or fuzzy matching is performed.

- edca810: Add `truncateText(text, maxLength, options?)`, a pure grapheme-aware truncation helper (zero Vue imports) that stops `slice()` from mangling RTL text and emoji:

  - Counts and cuts by extended grapheme clusters with `Intl.Segmenter`, so a cut never separates a base letter from its tashkeel or Hebrew niqqud, an emoji ZWJ sequence, or a regional-indicator flag. Lam-alef ligatures and Arabic-Indic / Persian digits count as single clusters.
  - The ellipsis (default `U+2026`, configurable via `ellipsis`) counts inside `maxLength`; trailing whitespace and tatweel (`U+0640`) are trimmed before it. Text that fits is returned unchanged.
  - `unit: 'word'` cuts at the last word boundary whose cumulative grapheme count fits and falls back to a grapheme cut when one word is longer than the limit; `locale` is passed to `Intl.Segmenter` for locale-sensitive word boundaries.
  - `isolate: true` wraps the result in `FSI ... PDI` (`U+2068` / `U+2069`), reusing the `isolate()` helper, on every return path for valid input — fitting text, truncated text, and the ellipsis-only result — and the ellipsis returned for an invalid `maxLength` in production, so the ellipsis stays at the logical end of RTL text inside an LTR paragraph (the visual left end) and the reverse. The isolate controls do not count towards `maxLength`.
  - An invalid `locale` tag (e.g. `'!!'`) falls back to the runtime default locale for both grapheme and word segmenters instead of throwing `RangeError`.
  - Without `Intl.Segmenter` the helper falls back to Unicode code points via `Array.from` — surrogate pairs are never split, but marks and ZWJ sequences may separate. Word mode still cuts at the last whitespace boundary that fits (the longest whole-word prefix, ellipsis counted) and falls back to the code-point cut for over-long words (documented).
  - `maxLength` below 1 or not an integer throws `TypeError` in development and returns the ellipsis string in production (wrapped in `FSI ... PDI` when `isolate: true`).
  - Exported from the package root with the `TruncateOptions` type; SSR-safe, tree-shakeable under 2 kB gzip without pulling in Vue, and documented in the README, API reference, a new guide page with an Arabic twin, and `llms-full.txt`.

- 5acf564: Add `v-digits` to normalize Western, Arabic-Indic, and Persian digits as users type or paste into form fields. A bare directive produces Western digits without stripping leading zeros; pass `{ to: 'arab' }` or `{ to: 'arabext' }` to choose another digit set. With `{ decimal: true }`, the Arabic decimal separator becomes `.` and the Arabic group separator is removed, so `v-model.number` can read `١٬٢٣٤٫٥` as `1234.5`.

  The directive preserves the caret or selection where the field supports it, waits for IME composition to finish, and respects `v-model.lazy`. It does not rewrite the initial value during SSR or on mount. `createRtl()` registers it globally by default; `vDigits` and its alias `digitsDirective` are also available for local use. The binding type is exported as `DigitsDirectiveValue`.

### Patch Changes

- a9b6630: Bound the `Intl` formatter caches and make the composables safe outside `setup()`:

  - `formatNumber`, `formatCurrency` and `formatDate` now cache `Intl.NumberFormat` / `Intl.DateTimeFormat` instances in a small fixed-size LRU (32 entries per kind) instead of unbounded `Map`s, so long-running servers and locale-switching SPAs cannot grow the caches without limit. Hot formatters are refreshed on access and the least recently used entry is evicted.
  - `useDirection()` and `useFormat()` can be called outside a component `setup()` (plain modules, router guards, tests) without triggering Vue's `inject()` warning; they fall back to a detached, per-app or global direction context instead.

- 3c99a0d: Ship types for CommonJS consumers: bundled `.d.ts`/`.d.cts` per entry point, types for `./styles.css`, and a scoped arethetypeswrong check.
- e8b1cee: Fix the direction utilities in `styles.css` to key off the element's own direction with `:dir(rtl)` / `:dir(ltr)` instead of any ancestor `[dir]`, so `.ltr-only`, `.rtl-only`, `.rtl-flip`, `.rtl-noflip`, and `.rtl-scroll-x` behave correctly inside a `dir="ltr"` island on an RTL page (and vice versa). `.rtl-flip` now mirrors with the independent `scale: -1 1` property, so it no longer overwrites a `transform` the element already carries.

  The own-direction behavior requires Chrome 120+, Firefox 49+, or Safari 16.4+ (`:dir()`); the independent `scale` property requires Chrome 104+, Firefox 72+, or Safari 14.1+. Browsers without `:dir()` use the previous ancestor selectors and `transform: scaleX(-1)` via an `@supports not selector(:dir(rtl))` fallback, retaining the old nested-island and transform-overwrite limitations. In browsers with `:dir()`, `.rtl-only` now hides on pages with no `dir` attribute (HTML defaults to LTR). No class names changed.

- 9524ff1: Harden runtime direction switching, nested direction providers, SSR/Nuxt hydration, and unmount cleanup across composables, directives, and components:

  - Ensure `createRtl` reference-counts installed apps and cleans up document watchers only when the last installed app unmounts (`app.onUnmount` / `app.unmount`) or `dispose()` is called, evaluates `document` availability at runtime for server-only environments, and avoids duplicate global registration warnings.
  - Fix `RtlProvider` locale inheritance and direction derivation so `setLocale` updates unpinned providers, dynamically cleared `dir`/`locale` props fall back to the parent context, and parent locale switches propagate cleanly.
  - Move `BidiText` default slot invocation inside the render function to avoid Vue slot-invocation warnings and track reactive slot updates across direction switches.
  - Support reactive refs, computed values, and `true` bindings in `v-rtl`, restore `unicode-bidi` and clean up empty `style` attributes when `isolate` flips or unmounts, and preserve pre-existing `dir`/`style` across SSR hydration.
  - Complete logical-to-physical and physical-to-logical CSS property mappings (`scrollMarginTop`/`Bottom`, `scrollPaddingTop`/`Bottom`, `overflowInline`/`Block`, logical sizing properties, `captionSide`, `resize`) and avoid `-0` in `useLogicalStyles().mirror(0)`.
  - Key the detached `useDirection` fallback per Vue `App` via a `WeakMap` so SSR requests without the plugin cannot leak direction state across renders, guard `useDirection` and `useFormat` with `hasInjectionContext()` so calling them outside `setup()` does not emit Vue warnings, and update the Nuxt runtime plugin to pass a reactive head getter with `htmlClass` support and forward `registerGlobals`.
  - Add CI bundle size budgets (`npm run check:size`) for every published entry point.

- 42d9e83: Fix locale-to-direction detection without changing the public API:

  - Recognize script subtags only in the language portion of well-formed locale tags, never inside Unicode extensions or private-use suffixes. Arabic numbering-system extensions and Hebrew private-use tags retain RTL direction.
  - Default Hausa (`ha`) and Kurdish (`ku`) to LTR, while explicit RTL scripts still take precedence. Add RTL defaults for `pnb`, `mzn`, `lrc`, `glk`, `bal`, and `sdh`.
  - Return LTR for well-formed non-RTL languages and reserve the fallback for empty or invalid tags, so unlisted locales such as French correctly switch unpinned stores and provider scopes from RTL to LTR.
  - Add table-driven detection, locale-switching, and provider regressions, and document these rules in the English and Arabic locale guides and README.

- 860c2c8: Add logical-property mappings for `overscroll-behavior` (`overscrollBehaviorX`/`Y` ↔ `overscrollBehaviorInline`/`Block`) and `contain-intrinsic` sizing (`containIntrinsicWidth`/`Height` ↔ `containIntrinsicInlineSize`/`BlockSize`, opt-in via `{ size: true }`) across `logicalProperty`, `toLogicalStyle`, and `toPhysicalStyle`.
- 0ae8f0f: Warn about an explicit Nuxt `defaultLocale` without calling it the module default. The Nuxt module now distinguishes a user-provided `defaultLocale: 'en'` (through `rtl` config or inline module options, including the imported module) from the inherited module default, so the warning only suggests setting `rtl.defaultLocale` when it was not set.
- 3c99a0d: Import Nuxt APIs explicitly so the Nuxt module works under SSR, skip empty runtime-config values, and cover it with a Nuxt SSR test.
- 3718204: Align the Nuxt module documentation with the implementation and warn about invalid configuration:

  - Document that `registerGlobals` is forwarded to the runtime store and takes effect under Nuxt, while `components: false` only disables Nuxt's own component registration; the runtime store still registers globals unless `registerGlobals: false` is also set.
  - Warn through the Nuxt logger when the merged `defaultLocale` matches neither a configured tag nor its language subtag (`ar-EG` matches `ar`), including when replacing `locales` leaves the inherited `en` unlisted (the message now marks it as the module default and points to `rtl.defaultLocale`) and when options are passed inline in `modules`; keep the untouched defaults quiet. The `dir` warning now reads `rtl.dir must be "rtl" or "ltr"; received "..."`.
  - Cover `registerGlobals: false`, `components: false`, `css: false`, and the logger warnings with Nuxt fixtures.

- c21a1fc: Resolve paired brackets (`()`, `[]`, `{}`) in `splitBidiRuns` and `isolateRuns` using Unicode Bidirectional Algorithm paired-bracket logic (N0) so matched brackets enclosing opposite-direction content stay together inside the isolate, mixed-direction bracket pairs stay outside in the base direction, and unmatched brackets remain neutral.
- 0d483e4: Prepare the initial npm release:

  - Strip embedded Unicode bidi control characters in `<BidiText>` when using the default `element` strategy, matching `strategy="chars"` and `isolateRuns()`.
  - Replace literal Unicode bidi control characters across source, playground, and tests with `\uXXXX` escapes or named constants, and enforce `bidi/no-bidi-control-chars` in ESLint.
  - Fall back to `'latn'` when an unrecognized or empty `numberingSystem` is passed to formatting helpers or configured on `createRtl()`.
  - Update package metadata (`homepage`, `engines.node >=20.11`) and English/Arabic documentation for npm installation and Nuxt `registerGlobals` forwarding.

- 098510e: Harden number and date formatting: normalize underscore locale separators, fall back from invalid locale tags to the language subtag and then `en`, insert numbering-system extensions before private-use subtags, and return an empty string for invalid dates. Applies to standalone helpers and `useFormat()` without changing exports or signatures.
- c402bfc: Mark component factories, injection keys, and formatter caches as side-effect free so a bundler can drop them. Importing `isolateRuns`, `toLogicalStyle`, or `directionOfLocale` no longer pulls in Vue, and importing `formatNumber` no longer pulls in component or directive code. Runtime behaviour and exports are unchanged.
- 5bb7898: Type the globals that `createRtl()` registers: the declarations now augment Vue's `GlobalComponents` with `BidiText` and `RtlProvider` and `GlobalDirectives` with `vRtl`, so `vue-tsc` and the Vue language tools check their props, slot props and the `v-rtl` value in templates without a per-file import. Types only — runtime output, exports and signatures are unchanged.

## Unreleased

- Add `formatDateRange(start, end, options)` and `formatNumberRange(start, end, options)`, wrapping `Intl.DateTimeFormat.prototype.formatRange` and `Intl.NumberFormat.prototype.formatRange`. Ranges use the locale's own separator and collapse shared parts — `٣–٥ مارس ٢٠٢٤` instead of a repeated month, one `ج.م.` for an Arabic price range — and keep their reading order in RTL. Date ends accept `Date`, timestamp or ISO string with the `formatDate` options; number ends accept `number` or `bigint` with the `formatNumber` options (currency, unit, compact). Both reuse the existing formatter caches, follow the same locale and numbering-system fallbacks, and are bound on `useFormat()`. Reversed ranges format as given, like `Intl`; invalid dates or non-finite numbers throw `TypeError` in development and return `''` in production. On runtimes without `formatRange`, both ends are joined with the locale's range separator, each wrapped in a first-strong isolate (FSI ... PDI).
- Add `compareText` and `sortByLocale` for locale-aware comparison and stable, non-mutating sorting. Numeric collation compares `طلب ٢` and `طلب ۲` equally and puts both before `طلب ١٠` by default. Both helpers are also available on `useFormat()` and follow the current scope locale.
- Add `v-digits` for normalizing typed or pasted Arabic-Indic and Persian digits in form fields. Use `{ decimal: true }` to convert `١٬٢٣٤٫٥` to `1234.5` before `v-model` reads it.
- Add `truncateText(text, maxLength, options?)`, a pure grapheme-aware truncation helper (zero Vue imports): counts and cuts by extended grapheme clusters with `Intl.Segmenter`, never splits tashkeel, niqqud, emoji ZWJ sequences or flags, trims trailing whitespace and tatweel before the ellipsis, counts the ellipsis inside `maxLength`, supports `unit: 'word'` with a grapheme fallback, and wraps the result in `FSI ... PDI` with `isolate: true` on every return path — fitting text, truncated text, and the ellipsis-only result — so the ellipsis stays at the logical end of RTL text inside LTR layouts. An invalid `locale` tag falls back to the runtime default locale. Without `Intl.Segmenter` it falls back to code points (surrogate pairs intact), with word mode cutting at the last whitespace boundary that fits; invalid `maxLength` throws `TypeError` in development and returns the ellipsis in production (isolated when requested). Exported with the `TruncateOptions` type; covered by unit, SSR and real-Chromium layout tests, a `{ truncateText }` tree-shake budget under 2 kB gzip, and English/Arabic guide and API docs.
- Add `formatDuration(duration, options?)`, a pure locale-aware duration formatter (zero Vue imports) for video lengths, delivery estimates and timers. It takes an object of units (`years` to `milliseconds`) or a number of milliseconds and returns the locale's own plural forms, conjunction and digits from `Intl.DurationFormat`: Arabic `ساعتان و3 دقائق`, `١١ ساعة ودقيقتان`, `11 يومًا`. Options: `locale`, `style` (`'long'`, `'short'`, `'narrow'`, or `'digital'` for `h:mm:ss` in the locale's digits), `numberingSystem`, `largestUnit`, `smallestUnit` and `maxUnits`. Fractions are carried into smaller units, the last unit is rounded half away from zero and carries upward, a negative duration gets one leading sign, and a zero duration is written as zero of the smallest unit. Without `Intl.DurationFormat` (Node.js before 23, Chrome before 129, Firefox before 136, Safari before 16.4) each unit is formatted with `Intl.NumberFormat` unit style and joined with `Intl.ListFormat`. Invalid input throws `TypeError` in development and returns an empty string in production. Exports the `DurationInput`, `DurationUnit`, `DurationStyle` and `FormatDurationOptions` types.
- Add `normalizePhone(value, options?)`, `validatePhone(value, options?)`, and `formatPhone(e164, options?)` in pure `src/phone.ts` (zero Vue imports, zero dependencies) for eight Arab-region numbering plans: `SA` (CST), `AE` (TDRA), `KW` (CITRA), `QA` (CRA), `BH` (TRA Bahrain), `OM` (TRA Oman), `EG` (NTRA), and `JO` (TRC). `normalizePhone` maps Arabic-Indic and Persian digits via `transliterateDigits`, strips bidi controls, spaces, dashes, dots, and parentheses, accepts `+`, `00`, and regional trunk `0`, rejects letters, and returns E.164 or `''`. `validatePhone` checks regional lengths, mobile/fixed prefixes, `regions` filtering, and `mobileOnly`, returning `{ valid, e164, region?, type?, reason? }`. `formatPhone` groups digits by each region's convention, formats digits for `locale` / `numberingSystem`, and wraps the result in `LRI ... PDI` by default (`isolate: true`) so `+` stays on the left inside Arabic text. Exports `PhoneRegion`, `PhoneType`, `PhoneInvalidReason`, `NormalizePhoneOptions`, `ValidatePhoneOptions`, `PhoneValidationResult`, and `FormatPhoneOptions`.

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
