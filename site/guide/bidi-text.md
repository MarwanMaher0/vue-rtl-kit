# BidiText

`<BidiText>` uses simplified run detection to isolate mixed-direction plain text, such as Latin identifiers inside Arabic sentences, without changing the source string. It is not a rich-text engine or a complete implementation of the Unicode bidirectional algorithm; the browser still performs bidirectional layout.

```vue
<script setup lang="ts">
import { BidiText } from 'vue-rtl-kit'

const message = 'آخر تحديث 12-05-2024 بواسطة الفريق'
</script>

<template>
  <p>{{ message }}</p>
  <BidiText as="p" :text="message" />
</template>
```

The first paragraph can visually reorder the date inside Arabic. The second uses `<bdi>` elements around the runs that need isolation.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `text` | `string` | `undefined` | Text to render. When omitted, plain-text default slot content is used. |
| `as` | `string` | `'span'` | Element to render. |
| `dir` | `Direction \| 'auto' \| undefined` | Current scope | Base direction. `'auto'` uses first-strong detection. |
| `strategy` | `'element' \| 'chars'` | `'element'` | Emit `<bdi>` elements or Unicode control characters. |
| `enabled` | `boolean` | `true` | Set to `false` to render untouched text. |

## Slots and direction

```vue
<BidiText as="p" dir="rtl">
  الإصدار v1.2.3 متاح الآن
</BidiText>

<BidiText dir="auto" text="example.com/ar/pricing — الدليل" />
```

The slot may contain text, comments, and fragments. If it contains element markup, BidiText leaves that markup untouched rather than flattening it to plain text. Use the `text` prop when isolation is required.

## Strategies

The default `element` strategy creates elements such as:

```html
<span>الإصدار <bdi dir="ltr">v1.2.3</bdi> متاح الآن</span>
```

Use `chars` where output must remain one plain string:

```vue
<BidiText text="الإصدار v1.2.3 متاح الآن" strategy="chars" />
```

That mode inserts `LRI`/`RLI` and `PDI` characters into the rendered text. Prefer elements for normal HTML because control characters do not enter copied text.

## Compare raw and isolated output

```vue
<BidiText as="p" text="رقم الطلب #4821-B" :enabled="false" />
<BidiText as="p" text="رقم الطلب #4821-B" />
```

For strings that cannot contain elements, use the [isolateRuns API](/api#bidirectional-text) directly.
