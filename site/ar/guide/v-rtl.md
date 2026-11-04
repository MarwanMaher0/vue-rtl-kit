# توجيه `v-rtl`

يثبّت `v-rtl` اتجاه عنصر. يدعم سمات SSR والتحديثات التفاعلية وعزل Unicode الاختياري واستعادة قيم DOM السابقة عند إزالة العنصر.

```vue
<pre v-rtl:ltr><code>npm install github:MarwanMaher0/vue-rtl-kit#v0.1.1</code></pre>
<span v-rtl.ltr.isolate>feature/rtl</span>
<div v-rtl>...</div>
```

يضبط `v-rtl` دون وسيطات القيمة `dir="rtl"`. تسجّل الإضافة التي يثبّتها `createRtl()` التوجيه افتراضيًا.

## صيغ الربط

| الصيغة | النتيجة |
| --- | --- |
| `v-rtl` | `dir="rtl"` |
| `v-rtl:ltr`، `v-rtl:rtl`، `v-rtl:auto` | الاتجاه وفق الوسيط. |
| `v-rtl.ltr`، `v-rtl.auto` | الاتجاه من مُعدِّل عند عدم وجود قيمة أو وسيط. |
| `v-rtl.isolate` | اتجاه RTL مع `unicode-bidi: isolate`. |
| `v-rtl="direction"` | قيمة تفاعلية من `'rtl' \| 'ltr' \| 'auto'`. |
| `v-rtl="false"` | اتجاه LTR؛ وتعود `true` و`null` و`undefined` إلى RTL. |
| `v-rtl="{ dir: 'ltr', isolate: true }"` | إعدادات على شكل كائن. |

يمكن دمج المعدلات والوسيطات، كما في `v-rtl:ltr.isolate`.

## التسجيل المحلي

في `<script setup>`، يجعل استيراد `vRtl` التوجيه `v-rtl` متاحًا دون تسجيل عالمي:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { vRtl } from 'vue-rtl-kit'
import type { DirectionOrAuto } from 'vue-rtl-kit'

const direction = ref<DirectionOrAuto>('auto')
</script>

<template>
  <p v-rtl="{ dir: direction, isolate: true }">user@example.com — مرحبًا</p>
</template>
```

يتوفر التصدير البرمجي أيضًا بالاسم البديل `rtlDirective`. وكلاهما من النوع `ObjectDirective<HTMLElement, RtlDirectiveValue>`.

## العرض على الخادم والتنظيف

يُصدر `getSSRProps` السمة `dir` وتنسيق العزل الاختياري في HTML المعروض على الخادم. وعند إزالة العنصر، يستعيد التوجيه سمة `dir` السابقة للعنصر وقيمة `unicode-bidi` المضمّنة السابقة.
