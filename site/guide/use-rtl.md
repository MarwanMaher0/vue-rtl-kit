# useRtl

```ts
function useRtl(): RtlInstance
```

`useRtl()` returns the app-level store, even when called beneath an `<RtlProvider>`. Use it for controls that must change the whole application rather than the nearest direction scope.

Unlike `useDirection()`, it throws if the `createRtl()` plugin was not installed.

```vue
<script setup lang="ts">
import { RtlProvider, useRtl } from 'vue-rtl-kit'

const { dir: rootDir, toggleDirection: toggleRoot } = useRtl()
</script>

<template>
  <p>Root: {{ rootDir }}</p>

  <RtlProvider
    dir="rtl"
    locale="ar"
    v-slot="{ dir: localDir, toggleDirection: toggleLocal }"
  >
    <p>Local scope: {{ localDir }}</p>
    <button @click="toggleLocal">Toggle this panel</button>
    <button @click="toggleRoot">Toggle the application</button>
  </RtlProvider>
</template>
```

For normal templates, destructure the root context so Vue can unwrap its refs:

```vue
<script setup lang="ts">
import { useRtl } from 'vue-rtl-kit'

const { dir, locale, setLocale } = useRtl()
</script>

<template>
  <button @click="setLocale(locale === 'ar' ? 'en' : 'ar')">
    {{ dir }} / {{ locale }}
  </button>
</template>
```

The returned instance additionally exposes resolved `options`, `install(app)`, and `dispose()`.
