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
| `locales` | `string[] \| LocaleMap` | `{}` | Locale directions, not an allowlist. Array entries get inferred directions; a map is explicit. |
| `defaultLocale` | `string` | First locale key, otherwise `'en'` | Initial locale. |
| `dir` | `Direction` | Inferred from `defaultLocale` | Explicit initial direction. Supplying it also pins direction. |
| `syncDocument` | `boolean` | `true` | Keep `<html dir>` and `<html lang>` synchronized in the browser. |
| `htmlClass` | `boolean \| { rtl: string, ltr: string }` | `false` | Toggle `rtl` and `ltr` classes, or the provided class names, on `<html>`. |
| `numberingSystem` | `NumberingSystem \| Record<string, NumberingSystem>` | `undefined` | Default numbering system for `useFormat()`, globally or per locale. |
| `registerGlobals` | `boolean` | `true` | Register `RtlProvider`, `BidiText`, and `v-rtl` when installed. |

## Locale forms

An array is convenient when built-in language and script inference is sufficient:

```ts
const rtl = createRtl({ locales: ['en', 'ar-EG', 'ku-Latn'] })
```

A map is explicit and can override the built-in language and script inference:

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

## Locale direction rules

When direction is not pinned, locale resolution uses this order:

1. An exact-tag entry in the locale map.
2. A language entry in the locale map.
3. Built-in language and script inference.

Map overrides take precedence even over an explicit script. Within built-in inference, an explicit script in the language portion wins over the language's default direction. Only scripts before the first singleton (a one-character subtag such as `u` or `x`) count; extensions such as `-u-` and private-use subtags after `-x-` do not supply scripts.

| Locale | Built-in direction | Reason |
| --- | --- | --- |
| `ar-Latn` | `ltr` | The explicit Latin script overrides Arabic's default. |
| `ar-u-nu-latn`, `he-x-abcd` | `rtl` | Extension and private-use subtags do not change the script. |
| `ha`, `ku` | `ltr` | Hausa and Kurdish default to Latin script. |
| `ha-Arab`, `ku-Arab` | `rtl` | The explicit Arabic script overrides the Latin default. |
| `pnb`, `mzn`, `lrc`, `glk`, `bal`, `sdh` | `rtl` | These languages have RTL defaults. |
| `fr`, `qaa` | `ltr` | Well-formed non-RTL or unrecognized languages use `ltr`, not the fallback. |

The fallback is used only for empty or invalid tags, not for a well-formed locale missing from `locales`. For example, `createRtl({ locales: { ar: 'rtl' }, defaultLocale: 'ar' })` starts in `rtl`; calling `setLocale('fr')` switches it to `ltr` even though `fr` is not listed.

An unpinned `RtlProvider` with `locale="fr"` inside an RTL parent likewise uses `ltr`, unless a locale-map override applies. Supplying `dir` pins direction: changing the locale does not change that pinned direction.

## Typed globals

The package's type declarations add `BidiText` and `RtlProvider` to Vue's `GlobalComponents` and `vRtl` to `GlobalDirectives`. Once any file in the project imports `vue-rtl-kit` — the `createRtl` import in `main.ts` is enough — `vue-tsc` and the Vue language tools check the registered globals in every template, with no per-file import:

```vue
<template>
  <RtlProvider dir="ltr" v-slot="{ isRtl, toggleDirection }">
    <button @click="toggleDirection">{{ isRtl ? 'LTR' : 'RTL' }}</button>
  </RtlProvider>
  <BidiText text="الإصدار v1.2.3" strategy="chars" />
  <code v-rtl:ltr>feature/rtl</code>

  <!-- Type errors: -->
  <BidiText text="v1.2.3" strategy="inline" />
  <RtlProvider dir="auto" />
  <p v-rtl="42" />
</template>
```

Props, slot props, and the `v-rtl` value are checked: `strategy` is `'element' | 'chars'`, `RtlProvider`'s `dir` is `'rtl' | 'ltr'`, and `v-rtl` accepts a direction, `'auto'`, a boolean, a ref of those, or `{ dir, isolate }`.

Nothing changes at runtime, and the same declarations ship for the ESM and CommonJS entries.

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

The global types are declared unconditionally, so they cannot see this option. With `registerGlobals: false`, a template that uses `<BidiText>`, `<RtlProvider>`, or `v-rtl` without importing it still type-checks, but Vue cannot resolve it at runtime — keep the local imports.

## Cleanup

`dispose()` stops the document watcher. It is mainly useful for isolated tests or an app that is being torn down; it does not uninstall Vue provides or global components.

```ts
rtl.dispose()
```
