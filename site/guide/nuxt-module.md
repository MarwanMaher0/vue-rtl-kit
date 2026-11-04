# Nuxt module

The Nuxt module supports Nuxt 3 and 4. It installs the runtime plugin, integrates the document head during SSR, registers components, auto-imports composables, and optionally loads the stylesheet.

```ts
export default defineNuxtConfig({
  modules: ['vue-rtl-kit/nuxt'],
  rtl: {
    locales: { en: 'ltr', ar: 'rtl' },
    defaultLocale: 'ar',
    htmlClass: true,
    numberingSystem: { ar: 'latn' },
  },
})
```

The configuration key is `rtl`. `ModuleOptions` extends `RtlOptions` with Nuxt-specific registration controls.

## ModuleOptions

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `locales` | `string[] \| LocaleMap` | `{ en: 'ltr', ar: 'rtl' }` | Locales available to the runtime store. |
| `defaultLocale` | `string` | `'en'` | Initial locale. |
| `dir` | `Direction` | `undefined`; inferred as `'ltr'` from the default locale | Explicit initial direction; supplying it pins direction. |
| `syncDocument` | `boolean` | `true` | Synchronize client `<html dir>` and `<html lang>` after installation. |
| `htmlClass` | `boolean \| { rtl: string, ltr: string }` | `false` | Toggle default or custom direction classes on `<html>`. |
| `numberingSystem` | `NumberingSystem \| Record<string, NumberingSystem>` | `undefined`; locale default | Default digits for `useFormat()`, globally or per locale. |
| `registerGlobals` | `boolean` | Ignored; runtime behaves as `true` | The module does not pass this inherited option to runtime config, so setting it has no effect under Nuxt. |
| `autoImports` | `boolean` | `true` | Auto-import `useDirection`, `useRtl`, `useLogicalStyles`, and `useFormat`. |
| `components` | `boolean` | `true` | Register `<RtlProvider>` and `<BidiText>` through Nuxt. |
| `css` | `boolean` | `true` | Inject `vue-rtl-kit/styles.css`. |

`dir`, `syncDocument`, `htmlClass`, and `numberingSystem` are omitted from runtime configuration when not provided, allowing `createRtl()` to apply its own resolution rules.

`components: false` disables Nuxt's component registration only. The runtime plugin still calls `createRtl()` with its default `registerGlobals: true`, so `<RtlProvider>`, `<BidiText>`, and `v-rtl` remain globally registered.

## SSR document attributes

The runtime plugin calls `createRtl()` and exposes reactive `dir` and `lang` values through Nuxt's head integration. Both server-rendered HTML and hydrated markup therefore have the same direction without a client-only workaround.

```vue
<script setup lang="ts">
const { dir, locale, setLocale } = useDirection()
const format = useFormat()
</script>

<template>
  <header>
    <span>{{ locale }} / {{ dir }}</span>
    <button @click="setLocale('en')">English</button>
    <button @click="setLocale('ar')">العربية</button>
    <output>{{ format.formatNumber(1234.5) }}</output>
  </header>
</template>
```

## Selective setup

Disable Nuxt's automatic registrations when you prefer explicit imports:

```ts
export default defineNuxtConfig({
  modules: ['vue-rtl-kit/nuxt'],
  rtl: {
    autoImports: false,
    components: false,
    css: false,
  },
})
```

```vue
<script setup lang="ts">
import { BidiText, useDirection } from 'vue-rtl-kit'
import 'vue-rtl-kit/styles.css'

const { dir } = useDirection()
</script>

<template>
  <BidiText :dir="dir" text="الإصدار v1.2.3 متاح الآن" />
</template>
```

The runtime direction plugin is always installed. The `autoImports`, `components`, and `css` options only control their respective Nuxt build-time integrations.
