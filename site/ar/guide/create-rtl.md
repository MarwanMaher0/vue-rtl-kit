# createRtl

تنشئ `createRtl()` مخزن الاتجاه على مستوى التطبيق وإضافة Vue الخاصة به. أنشئ نسخة واحدة، ومرّرها إلى `app.use()`، واحتفظ بالمرجع نفسه عندما يحتاج إليه جزء من الشيفرة خارج المكوّنات.

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

## الخيارات

| الخيار | النوع | القيمة الافتراضية | الوصف |
| --- | --- | --- | --- |
| `locales` | `string[] \| LocaleMap` | `{}` | اللغات المدعومة. تُستنتج اتجاهات عناصر المصفوفة، أما الخريطة فتحددها صراحةً. |
| `defaultLocale` | `string` | أول مفتاح لغة، وإلا `'en'` | اللغة الابتدائية. |
| `dir` | `Direction` | يُستنتج من `defaultLocale` | الاتجاه الابتدائي الصريح. يؤدي توفيره أيضًا إلى تثبيت الاتجاه. |
| `syncDocument` | `boolean` | `true` | يحافظ على تزامن `<html dir>` و`<html lang>` في المتصفح. |
| `htmlClass` | `boolean \| { rtl: string, ltr: string }` | `false` | يبدّل الصنفين `rtl` و`ltr`، أو أسماء الأصناف المقدّمة، على `<html>`. |
| `numberingSystem` | `NumberingSystem \| Record<string, NumberingSystem>` | `undefined` | نظام الأرقام الافتراضي لـ`useFormat()`، على مستوى عام أو لكل لغة. |
| `registerGlobals` | `boolean` | `true` | يسجّل `RtlProvider` و`BidiText` و`v-rtl` عند التثبيت. |

## صيغ اللغات

تكون المصفوفة مناسبة عندما يكفي الاكتشاف استنادًا إلى اللغة:

```ts
const rtl = createRtl({ locales: ['en', 'ar-EG', 'ku-Latn'] })
```

أما الخريطة فهي صريحة ويمكنها تجاوز الاستنتاج اللغوي المضمّن:

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

## إلغاء التسجيل العام

عند تعطيل التسجيل العام، استورد العناصر في المواضع التي تُستخدم فيها:

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

## التنظيف

يوقف `dispose()` مراقب المستند. وهو مفيد أساسًا في الاختبارات المعزولة أو عند إزالة تطبيق؛ ولا يلغي Vue provides أو المكوّنات العامة.

```ts
rtl.dispose()
```
