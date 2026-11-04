# useDirection

```ts
function useDirection(): DirectionContext
```

`useDirection()` reads and controls direction for the current subtree.

## Resolution order

1. The nearest `<RtlProvider>` scope.
2. The app-level instance installed by `createRtl()`.
3. A shared, detached LTR/`en` fallback.

The fallback means the composable does not throw when the plugin is absent. It does not synchronize the document.

## Example

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useDirection } from 'vue-rtl-kit'

const {
  dir,
  locale,
  isRtl,
  startSide,
  endSide,
  sign,
  setDirection,
  setLocale,
  toggleDirection,
} = useDirection()

const placement = computed(() => `${startSide.value} → ${endSide.value}`)
</script>

<template>
  <p>{{ locale }} · {{ dir }} · {{ placement }}</p>
  <p>Horizontal sign: {{ sign }}</p>
  <button @click="toggleDirection">
    {{ isRtl ? 'Switch to LTR' : 'Switch to RTL' }}
  </button>
  <button @click="setLocale('ar')">Use Arabic</button>
  <button @click="setDirection('ltr')">Pin LTR</button>
</template>
```

Refs returned from a composable are automatically unwrapped in templates. In script, read `dir.value`, `sign.value`, and the other refs.

## Scoped behavior

Inside `<RtlProvider>`, the same composable controls only that provider. The surrounding application is unchanged. Call [useRtl](/guide/use-rtl) instead when a control inside a scope must access the root store.

`htmlAttrs()` is also available when a manual shell needs `{ dir, lang }`. See [Direction store](/guide/direction-store) for the complete context surface.
