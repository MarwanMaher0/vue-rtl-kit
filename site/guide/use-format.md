# useFormat

`useFormat()` binds number, currency, and date formatters to the current scope's locale and direction. It also applies the `numberingSystem` configured on the root `createRtl()` instance.

```ts
function useFormat(): ComputedRef<BoundFormatters>
```

```vue
<script setup lang="ts">
import { useFormat } from 'vue-rtl-kit'

const format = useFormat()
const updatedAt = new Date('2024-05-12T12:00:00Z')

console.log(format.value.formatNumber(1234.5))
</script>

<template>
  <dl>
    <dt>Total</dt>
    <dd>{{ format.formatCurrency(2500, 'EGP') }}</dd>
    <dt>Updated</dt>
    <dd>{{ format.formatDate(updatedAt, { dateStyle: 'long' }) }}</dd>
  </dl>
</template>
```

The computed ref is unwrapped in templates. In script, call methods through `format.value`.

## BoundFormatters

| Member | Signature |
| --- | --- |
| `locale` | `string` |
| `dir` | `Direction` |
| `formatNumber` | `(value: number, options?: NumberFormatOptions) => string` |
| `formatCurrency` | `(value: number, currency: string, options?: NumberFormatOptions) => string` |
| `formatDate` | `(value: Date \| number \| string, options?: DateFormatOptions) => string` |

Per-call options override the bound locale and numbering system. `NumberFormatOptions` and `DateFormatOptions` extend their corresponding `Intl` options with:

| Option | Type | Effect |
| --- | --- | --- |
| `locale` | `string` | BCP-47 locale tag. |
| `numberingSystem` | `NumberingSystem` | For example `'latn'`, `'arab'`, or `'arabext'`. |
| `isolate` | `boolean \| DirectionOrAuto` | Wrap the formatted result in a Unicode isolate. `true` uses first-strong detection. |

```ts
const isolated = format.value.formatDate(updatedAt, {
  locale: 'ar-EG',
  numberingSystem: 'latn',
  dateStyle: 'long',
  isolate: 'ltr',
})
```

## Standalone helpers

The same formatting primitives can be used without a component context:

```ts
import {
  formatCurrency,
  formatDate,
  formatNumber,
  transliterateDigits,
  withNumberingSystem,
} from 'vue-rtl-kit'

formatNumber(1234.5, { locale: 'ar-EG', numberingSystem: 'latn' })
formatCurrency(2500, 'EGP', { locale: 'ar-EG' })
formatDate('2024-05-12', { locale: 'ar-SA', calendar: 'islamic-umalqura' })
transliterateDigits('طلب رقم 4821', 'arab')
withNumberingSystem('ar-EG', 'latn')
```
