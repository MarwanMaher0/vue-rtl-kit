# v-digits directive

Use `v-digits` on a form field when people may type or paste digits from different keyboards but the model needs one spelling. For example, entering `٠۰٤۲` in the field below gives `reference` the string `'0042'`. Keep identifiers as strings so they retain their leading zeros.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { vDigits } from 'vue-rtl-kit'

const reference = ref('')
</script>

<template>
  <label>Order reference <input v-model="reference" v-digits type="text"></label>
</template>
```

The `vDigits` import makes the directive available in `<script setup>` without a plugin. It is also exported as `digitsDirective`. If you install `createRtl()`, `v-digits` is global by default; omit the import unless you set `registerGlobals: false`. Nuxt uses the same runtime plugin, not a directive auto-import.

## Choose the output

The binding is optional: `{ to?: 'latn' | 'arab' | 'arabext'; decimal?: boolean }`. All three digit sets are accepted as input, even within the same value. `to` chooses the output, not which keyboards can be used:

| Binding | Input | Field value |
| --- | --- | --- |
| `v-digits` (default: `'latn'`) | `A-٠۱۲` | `A-012` |
| `v-digits="{ to: 'arab' }"` | `A-012` | `A-٠١٢` |
| `v-digits="{ to: 'arabext' }"` | `A-012` | `A-۰۱۲` |

`decimal` defaults to `false`: punctuation stays as typed. With `decimal: true`, the Arabic decimal separator `٫` (U+066B) becomes `.` and the Arabic thousands separator `٬` (U+066C) is removed. For example, `{ to: 'latn', decimal: true }` converts `١٬٢٣٤٫٥` to `'1234.5'`. It does not interpret a comma as a decimal point. If you change the binding, the next edit uses the new options.

## Amounts and `v-model`

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { vDigits } from 'vue-rtl-kit'

const amount = ref<number | string>('')
</script>

<template>
  <label>Amount <input v-model.number="amount" v-digits="{ decimal: true }" inputmode="decimal"></label>
</template>
```

For `v-model.number`, use `'latn'` and `decimal: true` so `١٢٫٥` reaches Vue as `'12.5'`. Vue then converts it to the number `12.5`. The directive itself does not parse or validate an amount. To read a formatted value with locale-specific grouping, use [`parseNumber()`](/guide/use-format#parsing-numbers) instead. With `v-model.lazy`, the field still shows the converted digits while you type, but Vue updates the model on `change` rather than on each `input`.

## Field and editing behavior

- Use a native text input or `<textarea>`, not a wrapper element. On unsupported elements the directive does nothing (with a warning in development). A `type="number"` input only works with values the browser accepts: it may discard localized digits before the directive sees them. Prefer `type="text"` with `inputmode="decimal"` for amounts entered on Arabic or Persian keyboards.
- Editing in the middle of a value preserves the caret or selection on fields that expose it. Pasting `١۲٣` over `XX` in `AB-XX-CD` produces `AB-123-CD`, with the caret just after `3`. A paste that needs no conversion uses the browser's normal paste behavior.
- During input method editor (IME) composition, the draft stays untouched. Conversion happens when the user commits the text.
- Neither server rendering nor mounting converts an existing value. If an identifier must already have Western digits on first render, use `transliterateDigits(initialReference, 'latn')` when preparing the initial model.
