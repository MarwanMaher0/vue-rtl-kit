# useDirection

تقرأ `useDirection()` اتجاه الشجرة الفرعية الحالية وتتحكم فيه.

```ts
function useDirection(): DirectionContext
```

## ترتيب الحل

1. نطاق `<RtlProvider>` الأقرب.
2. النسخة على مستوى التطبيق المثبّتة بواسطة `createRtl()`.
3. قيمة احتياطية مشتركة ومنفصلة تستخدم LTR/`en`.

تضمن القيمة الاحتياطية ألا يُطلق الـcomposable خطأً عند غياب الإضافة. ولا تزامن هذه القيمة المستند.

## مثال

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

تُفك المراجع التي يعيدها الـcomposable تلقائيًا داخل القوالب. أما في الشيفرة البرمجية، فاقرأ `dir.value` و`sign.value` وبقية المراجع.

## السلوك ضمن النطاق

داخل `<RtlProvider>`، يتحكم الـcomposable نفسه في ذلك المزوّد فقط، ولا يتغير التطبيق المحيط. استخدم [useRtl](/ar/guide/use-rtl) بدلًا منه عندما يحتاج عنصر تحكم داخل نطاق إلى الوصول إلى المخزن الجذري.

يتوفر `htmlAttrs()` أيضًا عندما يحتاج هيكل يدوي إلى `{ dir, lang }`. راجع [مخزن الاتجاه](/ar/guide/direction-store) للاطلاع على واجهة السياق الكاملة.
