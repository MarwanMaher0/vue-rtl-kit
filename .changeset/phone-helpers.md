---
"vue-rtl-kit": minor
---

Add pure phone-number helpers (`normalizePhone`, `validatePhone`, `formatPhone`) with zero Vue imports and zero runtime dependencies for eight Arab-region numbering plans (`SA`, `AE`, `KW`, `QA`, `BH`, `OM`, `EG`, `JO`):

- `normalizePhone(value, options?)` maps Arabic-Indic (`٠-٩`) and Persian (`۰-۹`) digits via `transliterateDigits`, strips bidi controls, spaces, dashes, dots, and parentheses, accepts `+`, `00`, bare country codes, and regional trunk `0` (`SA`, `AE`, `EG`, `JO`), rejects letters, and returns canonical E.164 or `''`.
- `validatePhone(value, options?)` validates national lengths and mobile/fixed prefixes against built-in regulator rules (CST, TDRA, CITRA, CRA, TRA Bahrain, TRA Oman, NTRA, TRC), supports `regions`, `mobileOnly`, and `defaultRegion`, and returns `{ valid, e164, region?, type?, reason? }` with `reason` in `'empty' | 'letters' | 'length' | 'prefix' | 'region'`.
- `formatPhone(e164, options?)` groups digits by each region's documented convention, supports `locale` and `numberingSystem` (`latn`, `arab`, `arabext`, or any CLDR numbering system), and wraps the result in `LRI ... PDI` (`U+2066` ... `U+2069`) by default (`isolate: true`) so the leading `+` stays on the left inside Arabic text.

Also exports `PhoneRegion`, `PhoneType`, `PhoneInvalidReason`, `NormalizePhoneOptions`, `ValidatePhoneOptions`, `PhoneValidationResult`, and `FormatPhoneOptions`. No existing API changes.
