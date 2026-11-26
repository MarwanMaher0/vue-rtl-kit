---
"vue-rtl-kit": minor
---

Add `v-digits` to normalize Western, Arabic-Indic, and Persian digits as users type or paste into form fields. A bare directive produces Western digits without stripping leading zeros; pass `{ to: 'arab' }` or `{ to: 'arabext' }` to choose another digit set. With `{ decimal: true }`, the Arabic decimal separator becomes `.` and the Arabic group separator is removed, so `v-model.number` can read `١٬٢٣٤٫٥` as `1234.5`.

The directive preserves the caret or selection where the field supports it, waits for IME composition to finish, and respects `v-model.lazy`. It does not rewrite the initial value during SSR or on mount. `createRtl()` registers it globally by default; `vDigits` and its alias `digitsDirective` are also available for local use. The binding type is exported as `DigitsDirectiveValue`.
