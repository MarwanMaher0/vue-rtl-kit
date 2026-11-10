---
"vue-rtl-kit": patch
---

Harden number and date formatting: normalize underscore locale separators, fall back from invalid locale tags to the language subtag and then `en`, insert numbering-system extensions before private-use subtags, and return an empty string for invalid dates. Applies to standalone helpers and `useFormat()` without changing exports or signatures.
