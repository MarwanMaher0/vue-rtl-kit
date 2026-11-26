---
"vue-rtl-kit": minor
---

Add pure client-side RTL search helpers (`foldSearchText`, `matchesSearch`, and `findSearchMatches`) so Arabic, Persian, Hebrew, and mixed-script text matches user queries typed without diacritics, hamza variants, tatweel, or local digits:

- Add pure `src/search.ts` (zero Vue imports) exporting `foldSearchText(text, options?)`, `matchesSearch(text, query, options?)`, `findSearchMatches(text, query, options?)`, `SearchOptions`, and `SearchMatch`.
- `foldSearchText` applies Unicode `NFKC` (unfolding Arabic and Hebrew presentation forms such as lam-alef ligatures), strips Arabic harakat (`U+064B`–`U+065F`, `U+0670`, `U+06D6`–`U+06ED`), tatweel (`U+0640`), Hebrew points (`U+0591`–`U+05C7`), and Unicode bidi controls, folds `آ`/`أ`/`إ`/`ٱ` → `ا`, `ؤ` → `و`, `ئ`/`ی` → `ي`, and `ک` → `ك`, lowercases Latin characters, and collapses whitespace runs to `' '`. `SearchOptions` flags `taMarbuta` (`ة` → `ه`), `alefMaqsura` (`ى` → `ي`), and `digits` (Arabic-Indic and Persian digits → ASCII `0`–`9`) all default to `true`.
- `findSearchMatches` returns sorted, non-overlapping `{ start, end }` UTF-16 code-unit offsets in the original string, extending `end` over trailing combining marks so `<mark>` highlights never split a base letter from its harakat or niqqud, and preserving offsets across surrogate pairs and presentation ligatures. Empty or marks-only queries match in `matchesSearch` (`true`) and return `[]` in `findSearchMatches`; `null` or `undefined` text returns `false`/`[]`; none of the helpers ever throws, and no stemming or fuzzy matching is performed.
