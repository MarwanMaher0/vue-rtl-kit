# Getting started

vue-rtl-kit supports Vue 3.3+ and Nuxt 3 or 4. It has no runtime dependencies beyond Vue; Nuxt already provides the optional `@nuxt/kit` peer.

## Install

Once published, the default npm install will be:

```sh
npm install vue-rtl-kit
```

Until then, install the tagged GitHub release. Its `prepare` script builds the package during installation:

```sh
npm install github:MarwanMaher0/vue-rtl-kit#v0.1.1
```

## Vue

Create the store once and install it as a Vue plugin. The stylesheet is optional.

```ts
// main.ts
import { createApp } from 'vue'
import { createRtl } from 'vue-rtl-kit'
import 'vue-rtl-kit/styles.css'
import App from './App.vue'

const rtl = createRtl({
  locales: { en: 'ltr', ar: 'rtl' },
  defaultLocale: 'ar',
})

createApp(App).use(rtl).mount('#app')
```

The plugin registers `<BidiText>`, `<RtlProvider>`, and `v-rtl` globally. It also synchronizes `<html dir>` and `<html lang>` in the browser.

```vue
<script setup lang="ts">
import { useDirection } from 'vue-rtl-kit'

const { isRtl, setLocale } = useDirection()
</script>

<template>
  <button @click="setLocale(isRtl ? 'en' : 'ar')">
    {{ isRtl ? 'English' : 'العربية' }}
  </button>

  <BidiText as="p" text="آخر تحديث 12-05-2024 بواسطة الفريق" />
  <pre v-rtl:ltr><code>npm install vue-rtl-kit</code></pre>
</template>
```

Use `setLocale()` when a language choice should update direction. Use `setDirection()` or `toggleDirection()` when direction is an independent preference; either one pins direction against later locale-driven changes.

## Nuxt

Add `vue-rtl-kit/nuxt` to `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['vue-rtl-kit/nuxt'],
  rtl: {
    locales: { en: 'ltr', ar: 'rtl' },
    defaultLocale: 'ar',
    numberingSystem: { ar: 'latn' },
  },
})
```

The module installs the plugin, registers the components, auto-imports all four composables, loads the CSS utilities, and writes reactive `dir` and `lang` attributes into the SSR shell. No client-only plugin is needed.

```vue
<script setup lang="ts">
const { dir, locale, toggleDirection } = useDirection()
const format = useFormat()
</script>

<template>
  <main>
    <p>{{ locale }} / {{ dir }}</p>
    <p>{{ format.formatCurrency(2500, 'EGP') }}</p>
    <button @click="toggleDirection">Toggle direction</button>
    <BidiText as="p" text="الإصدار v1.2.3 متاح الآن" />
  </main>
</template>
```

## Next steps

- Understand the [direction store](/guide/direction-store) and [createRtl options](/guide/create-rtl).
- Fix mixed text with [BidiText](/guide/bidi-text).
- See every [Nuxt module option](/guide/nuxt-module) or browse the [API reference](/api).
