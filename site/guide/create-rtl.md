# createRtl

`createRtl()` creates the app-level direction store and its Vue plugin. Create one instance, pass it to `app.use()`, and retain the same reference when code outside components needs it.

```ts
function createRtl(options?: RtlOptions): RtlInstance
```

```ts
import { createApp } from 'vue'
import { createRtl } from 'vue-rtl-kit'
import App from './App.vue'

const rtl = createRtl({
  locales: { en: 'ltr', ar: 'rtl', he: 'rtl' },
  defaultLocale: 'ar',
  htmlClass: true,
  numberingSystem: { ar: 'latn' },
})

createApp(App).use(rtl).mount('#app')
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `locales` | `string[] \| LocaleMap` | `{}` | Supported locales. Array entries get inferred directions; a map is explicit. |
| `defaultLocale` | `string` | First locale key, otherwise `'en'` | Initial locale. |
| `dir` | `Direction` | Inferred from `defaultLocale` | Explicit initial direction. Supplying it also pins direction. |
| `syncDocument` | `boolean` | `true` | Keep `<html dir>` and `<html lang>` synchronized in the browser. |
| `htmlClass` | `boolean \| { rtl: string, ltr: string }` | `false` | Toggle `rtl` and `ltr` classes, or the provided class names, on `<html>`. |
| `numberingSystem` | `NumberingSystem \| Record<string, NumberingSystem>` | `undefined` | Default numbering system for `useFormat()`, globally or per locale. |
| `registerGlobals` | `boolean` | `true` | Register `RtlProvider`, `BidiText`, and `v-rtl` when installed. |

## Locale forms

An array is convenient when language-based detection is sufficient:

```ts
const rtl = createRtl({ locales: ['en', 'ar-EG', 'ku-Latn'] })
```

A map is explicit and can override the built-in language inference:

```ts
const rtl = createRtl({
  locales: {
    en: 'ltr',
    ar: 'rtl',
    'az-Arab': 'rtl',
  },
  defaultLocale: 'az-Arab',
})
```

## Global registration opt-out

With global registration disabled, import the pieces where they are used:

```ts
const rtl = createRtl({ registerGlobals: false })
```

```vue
<script setup lang="ts">
import { BidiText, vRtl } from 'vue-rtl-kit'
</script>

<template>
  <BidiText text="الإصدار v1.2.3" />
  <code v-rtl:ltr>feature/rtl</code>
</template>
```

## Cleanup

`dispose()` stops the document watcher. It is mainly useful for isolated tests or an app that is being torn down; it does not uninstall Vue provides or global components.

```ts
rtl.dispose()
```
