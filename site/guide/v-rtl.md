# v-rtl directive

`v-rtl` pins an element to a direction. It supports SSR attributes, reactive updates, optional Unicode isolation, and restoration of the previous DOM values on unmount.

```vue
<pre v-rtl:ltr><code>npm install github:MarwanMaher0/vue-rtl-kit#v0.1.1</code></pre>
<span v-rtl.ltr.isolate>feature/rtl</span>
<div v-rtl>...</div>
```

A bare `v-rtl` sets `dir="rtl"`. The plugin installed by `createRtl()` registers the directive by default.

## Bindings

| Form | Result |
| --- | --- |
| `v-rtl` | `dir="rtl"` |
| `v-rtl:ltr`, `v-rtl:rtl`, `v-rtl:auto` | Direction from the argument. |
| `v-rtl.ltr`, `v-rtl.auto` | Direction from a modifier when no value or argument is present. |
| `v-rtl.isolate` | RTL plus `unicode-bidi: isolate`. |
| `v-rtl="direction"` | Reactive `'rtl' \| 'ltr' \| 'auto'` value. |
| `v-rtl="false"` | LTR; `true`, `null`, and `undefined` fall back to RTL. |
| `v-rtl="{ dir: 'ltr', isolate: true }"` | Object configuration. |

Modifiers and arguments can be combined, as in `v-rtl:ltr.isolate`.

## Local registration

In `<script setup>`, importing `vRtl` makes `v-rtl` available without global registration:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { vRtl } from 'vue-rtl-kit'
import type { DirectionOrAuto } from 'vue-rtl-kit'

const direction = ref<DirectionOrAuto>('auto')
</script>

<template>
  <p v-rtl="{ dir: direction, isolate: true }">user@example.com — مرحبًا</p>
</template>
```

The programmatic export is also available as the alias `rtlDirective`. Both have type `ObjectDirective<HTMLElement, RtlDirectiveValue>`.

## Server rendering and cleanup

`getSSRProps` emits `dir` and optional isolation style into server-rendered HTML. On unmount, the directive restores the element's previous `dir` attribute and inline `unicode-bidi` value.
