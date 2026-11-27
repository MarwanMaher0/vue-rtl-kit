# Phone numbers

Arabic checkout and account forms run into two phone-number problems at once. First, visitors type numbers with Arabic-Indic (`٠١٢٣`) or Persian (`۰۱۲۳`) digits, spaces, dashes, dots, parentheses, stray Unicode bidi controls, `00` or `+` international prefixes, and local leading zeros — so a naive regex rejects real customers. Second, when a formatted international number such as `+966 50 123 4567` is rendered inside an Arabic paragraph, the Unicode Bidirectional Algorithm moves the leading `+` to the visual right and reverses the digit groups.

`normalizePhone`, `validatePhone`, and `formatPhone` are pure helpers (zero Vue imports, zero runtime dependencies, no DOM access) covering eight Arab-region numbering plans: Saudi Arabia (`SA`), the United Arab Emirates (`AE`), Kuwait (`KW`), Qatar (`QA`), Bahrain (`BH`), Oman (`OM`), Egypt (`EG`), and Jordan (`JO`).

```ts
import { formatPhone, normalizePhone, validatePhone } from 'vue-rtl-kit'

const e164 = normalizePhone('٠٥٠ ١٢٣ ٤٥٦٧', { defaultRegion: 'SA' })
// '+966501234567'

validatePhone('0020 (0)10-1234-5678', { mobileOnly: true })
// { valid: true, e164: '+201012345678', region: 'EG', type: 'mobile' }

formatPhone(e164, { locale: 'ar-EG', numberingSystem: 'arab' })
// '\u2066+٩٦٦ ٥٠ ١٢٣ ٤٥٦٧\u2069'
```

## Supported regions and regulator plans

The built-in rules encode each country's calling code, trunk prefix behavior, valid national significant number (NSN) lengths, mobile and fixed prefixes, and standard international grouping directly from each national regulator's numbering plan:

| Region | Code | Trunk `0` | Mobile rules | Fixed rules | Grouping | Regulator plan |
| --- | --- | --- | --- | --- | --- | --- |
| `SA` (Saudi Arabia) | `+966` | Yes | 9 digits: `50`, `51`, `53`–`59` | 9 digits: `11`–`14`, `16`, `17` | `2-3-4` (`+966 50 123 4567`) | CST (formerly CITC) National Numbering Plan |
| `AE` (UAE) | `+971` | Yes | 9 digits: `50`, `52`, `54`, `55`, `56`, `58` | 8 digits: `2`, `3`, `4`, `6`, `7`, `9` | Mobile `2-3-4`; fixed `1-3-4` | TDRA UAE National Numbering Plan |
| `KW` (Kuwait) | `+965` | No | 8 digits: `5`, `6`, `9`, `41` | 8 digits: `2` | `4-4` (`+965 5012 3456`) | CITRA Kuwait National Numbering Plan |
| `QA` (Qatar) | `+974` | No | 8 digits: `3`, `5`, `6`, `7` | 8 digits: `4` | `4-4` (`+974 5512 3456`) | CRA Qatar National Numbering Plan |
| `BH` (Bahrain) | `+973` | No | 8 digits: `3`, `66` | 8 digits: `1` | `4-4` (`+973 3612 3456`) | TRA Bahrain National Numbering Plan |
| `OM` (Oman) | `+968` | No | 8 digits: `7`, `9` | 8 digits: `2` | `4-4` (`+968 9212 3456`) | TRA Oman National Numbering Plan |
| `EG` (Egypt) | `+20` | Yes | 10 digits: `10`, `11`, `12`, `15` | 9 digits: `2` & regional codes; 8 digits: `3`, `15` | Mobile `2-4-4`; Cairo `1-4-4`; Alex `1-3-4`; regional `2-3-4`; `15` fixed `2-3-3` | NTRA Egypt National Numbering Plan |
| `JO` (Jordan) | `+962` | Yes | 9 digits: `77`, `78`, `79` | 8 digits: `2`, `3`, `5`, `6` | Mobile `2-3-4`; fixed `1-3-4` | TRC Jordan National Numbering Plan |

Kuwait, Qatar, Bahrain, and Oman operate closed 8-digit numbering plans with no local trunk `0`. Saudi Arabia, the UAE, Egypt, and Jordan use trunk `0` for domestic dialing, so a single leading `0` is accepted both on local numbers (`050 123 4567`) and right after the country code (`+966 (0)50 123 4567`).

## Normalizing input

`normalizePhone(value, options?)` cleans messy user input and returns a canonical E.164 string (`+966501234567`) or `''` if the input is not a valid number in the supported regions.

```ts
import { normalizePhone } from 'vue-rtl-kit'

normalizePhone('٠٥٠ ١٢٣ ٤٥٦٧', { defaultRegion: 'SA' })        // '+966501234567'
normalizePhone('+۹۷۱ (۰)۵۰-۱۲۳.۴۵۶۷')                          // '+971501234567'
normalizePhone('0020 010 1234 5678')                           // '+201012345678'
normalizePhone('\u2066+965 5012 3456\u2069')                   // '+96550123456'
normalizePhone('+971 50 123 4567', { defaultRegion: 'EG' })    // '+971501234567' — explicit CC wins
normalizePhone('050 123 4567')                                 // '' — no country code or defaultRegion
normalizePhone('+966 50 abc 4567')                             // '' — letters are rejected
```

Normalization performs the following steps:

- Strips every Unicode bidi control character (`LRM`, `RLM`, `ALM`, embeddings, overrides, and isolates).
- Converts Arabic-Indic (`٠`–`٩`) and Persian (`۰`–`۹`) digits to ASCII `0`–`9` via `transliterateDigits`.
- Strips whitespace (including NBSP), parentheses `()`, dots `.`, and hyphens/dashes (`-`, `–`, `—`, `−`).
- Accepts `+` and `00` international prefixes, bare country codes with a valid national length, and a single regional trunk `0` for `SA`, `AE`, `EG`, and `JO`.
- Rejects any letters (Latin or Arabic) and non-digit symbols instead of silently dropping them.

## Validating input

`validatePhone(value, options?)` returns a structured result with the normalized E.164 string, matched region, line type (`'mobile'` or `'fixed'`), and a machine-readable `reason` when invalid.

```ts
import { validatePhone } from 'vue-rtl-kit'

validatePhone('010 1234 5678', { regions: ['EG'], mobileOnly: true })
// { valid: true, e164: '+201012345678', region: 'EG', type: 'mobile' }

validatePhone('+966 11 234 5678', { mobileOnly: true })
// { valid: false, e164: '', region: 'SA', type: 'fixed', reason: 'prefix' }

validatePhone('+966 50 123 4567', { regions: ['AE', 'EG'] })
// { valid: false, e164: '', region: 'SA', reason: 'region' }

validatePhone('+966 50 123')
// { valid: false, e164: '', region: 'SA', reason: 'length' }

validatePhone('هاتف +966 50 123 4567')
// { valid: false, e164: '', reason: 'letters' }
```

| `reason` | When it is returned |
| --- | --- |
| `'empty'` | Input is empty, non-string, or contains only whitespace, separators, and bidi controls. |
| `'letters'` | Input contains letters (Latin, Arabic, etc.) or disallowed symbols such as `#`, `*`, or `/`. |
| `'region'` | Country code is outside the eight regions, a local number has no `defaultRegion` (and `regions` does not name a single region), or the matched region is excluded by `options.regions`. |
| `'length'` | National digit count does not match the region's numbering plan for the given prefix. |
| `'prefix'` | National prefix is not allocated in the region's plan, `+` appears in an invalid position, or a fixed-line number is rejected by `mobileOnly: true`. |

When `options.regions` contains a single entry (for example `{ regions: ['SA'] }`) and `defaultRegion` is omitted, that region also acts as the default for local numbers. When multiple regions are listed (for example `{ regions: ['SA', 'AE'] }`), pass `defaultRegion` as well if you want local numbers without a country code to resolve.

## Formatting and bidi isolation

`formatPhone(e164, options?)` groups digits using each region's convention, formats digits according to `locale` and `numberingSystem`, and wraps the result in `U+2066 LRI` ... `U+2069 PDI` by default so the leading `+` stays on the visual left inside Arabic text.

```ts
import { formatPhone } from 'vue-rtl-kit'

formatPhone('+966501234567')
// '\u2066+966 50 123 4567\u2069'

formatPhone('+201012345678', { locale: 'ar-EG' })
// '\u2066+٢٠ ١٠ ١٢٣٤ ٥٦٧٨\u2069'

formatPhone('+201012345678', { locale: 'ar-EG', numberingSystem: 'latn' })
// '\u2066+20 10 1234 5678\u2069'

formatPhone('+966501234567', { locale: 'ar', numberingSystem: 'arab', isolate: false })
// '+٩٦٦ ٥٠ ١٢٣ ٤٥٦٧'
```

- `locale` defaults to `'en'`. When `numberingSystem` is omitted, the digit shape follows `Intl.NumberFormat(locale)` (`'latn'` for `en` and `ar` in modern ICU, `'arab'` for `ar-EG` and `ar-SA`, `'arabext'` for `fa`). Pass `numberingSystem` explicitly when you want identical digits across runtimes and SSR hydration.
- `isolate` defaults to `true`, wrapping the formatted string in `LRI` (`\u2066`) ... `PDI` (`\u2069`). Pass `isolate: false` for plain un-isolated output (such as an `<input>` value or SMS body).
- With `LRI ... PDI`, Western digits (`latn`) keep both the leading `+` on the visual left and every digit group in strict left-to-right dialing order inside RTL sentences. With Arabic-Indic digits (`arab`), `LRI ... PDI` keeps the leading `+` on the visual left; note that Unicode UAX #9 resolves spaces between Arabic-Indic (`AN`) runs right-to-left, so most Arabic checkout UIs display international phone numbers with `numberingSystem: 'latn'`.
- Empty or unrecognized input returns `''` without adding isolate controls.

## Checkout form with v-digits

Pair [`v-digits`](/guide/v-digits) on the input with `normalizePhone`, `validatePhone`, and `formatPhone` so visitors can type Arabic-Indic or Persian digits naturally while your form submits clean E.164 and displays a bidi-safe confirmation:

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatPhone, normalizePhone, validatePhone } from 'vue-rtl-kit'

const raw = ref('')
const result = computed(() => validatePhone(raw.value, { regions: ['SA'], mobileOnly: true }))
const e164 = computed(() => normalizePhone(raw.value, { defaultRegion: 'SA' }))
const preview = computed(() => formatPhone(e164.value, { locale: 'ar', numberingSystem: 'latn' }))
</script>

<template>
  <form dir="rtl" lang="ar">
    <label>
      رقم الجوال
      <input v-model="raw" v-digits type="text" inputmode="tel" placeholder="050 123 4567">
    </label>
    <p v-if="result.valid">سيصل رمز التحقق إلى {{ preview }} خلال لحظات.</p>
    <p v-else-if="raw">الرقم غير صالح ({{ result.reason }})</p>
  </form>
</template>
```

All three functions are pure and never touch `window` or `document`, so they work identically in SSR renders. See the [API reference](/api#phone) for the complete type definitions.
