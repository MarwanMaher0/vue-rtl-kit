# RtlProvider

`<RtlProvider>` gives a subtree its own direction, locale, DOM attributes, and reactive direction context. It does not change the root store.

```vue
<script setup lang="ts">
import { RtlProvider } from 'vue-rtl-kit'
</script>

<template>
  <RtlProvider dir="ltr" tag="pre">
    <code>git checkout -b feature/rtl</code>
  </RtlProvider>
</template>
```

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `dir` | `Direction \| undefined` | Direction of `locale`, otherwise parent | Direction for the subtree. |
| `locale` | `string \| undefined` | Parent locale | Sets `lang` and, when `dir` is omitted, direction. |
| `tag` | `string \| null` | `'div'` | Wrapper element. `null` renders slot content without a wrapper. |
| `isolate` | `boolean` | `true` | Apply `unicode-bidi: isolate` to the wrapper. |

The wrapper receives `dir`, `lang`, and `data-rtl-scope` attributes.

## Slot controls

```vue
<RtlProvider locale="ar" v-slot="{ dir, isRtl, setDirection, toggleDirection }">
  <section>
    <p>Panel direction: {{ dir }}</p>
    <button @click="toggleDirection">
      {{ isRtl ? 'Use LTR' : 'Use RTL' }}
    </button>
    <button @click="setDirection('rtl')">Reset to RTL</button>
    <BidiText text="الإصدار v1.2.3 متاح الآن" />
  </section>
</RtlProvider>
```

The slot exposes `dir`, `isRtl`, `setDirection`, and `toggleDirection`. Components inside the provider get the same scope through `useDirection()`, `useLogicalStyles()`, and `BidiText`.

External `dir` and `locale` prop changes remain authoritative. When neither prop is supplied, the provider follows its parent direction.

## Renderless scopes

```vue
<RtlProvider :tag="null" dir="ltr">
  <code dir="ltr">npm run docs:build</code>
</RtlProvider>
```

With `:tag="null"`, no element carries the provider's `dir` attribute. Ensure the children set their own direction when DOM isolation matters.
