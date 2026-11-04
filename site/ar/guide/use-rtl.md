# useRtl

```ts
function useRtl(): RtlInstance
```

تُعيد `useRtl()` المخزن على مستوى التطبيق، حتى عند استدعائها أسفل `<RtlProvider>`. استخدمها لعناصر التحكم التي يجب أن تغيّر التطبيق بأكمله بدلًا من نطاق الاتجاه الأقرب.

وعلى خلاف `useDirection()`، تُطلق خطأً إذا لم تكن إضافة `createRtl()` مثبّتة.

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

في القوالب العادية، فكّك سياق الجذر كي تتمكن Vue من فك مراجعه:

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

توفّر النسخة المعادة أيضًا `options` بعد حل قيمها، و`install(app)`، و`dispose()`.
