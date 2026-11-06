# ابدأ الآن

يدعم vue-rtl-kit الإصدار Vue 3.3 والإصدارات الأحدث، وNuxt 3 و4. لا يحتاج إلى اعتماديات تشغيل أخرى بخلاف Vue، أما `@nuxt/kit` فهو متوفر بالفعل في Nuxt.

## التثبيت

بعد نشر الحزمة على npm، سيكون أمر التثبيت الافتراضي:

```sh
npm install vue-rtl-kit
```

إلى أن يتم النشر، ثبّت الإصدار الموسوم من GitHub. يبني سكربت `prepare` الحزمة أثناء التثبيت:

```sh
npm install github:MarwanMaher0/vue-rtl-kit#v0.1.1
```

## Vue

جرّب مثال Vite + Vue 3 مع تبديل العربية والإنجليزية، و`BidiText`، والأنماط المنطقية، والأرقام العربية الهندية:
[Open in StackBlitz](https://stackblitz.com/github/MarwanMaher0/vue-rtl-kit/tree/main/examples/vite).

أنشئ مخزن الاتجاه مرة واحدة وثبّته كإضافة Vue. ملف CSS اختياري.

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

تسجّل الإضافة المكوّنين `<BidiText>` و`<RtlProvider>` والتوجيه `v-rtl` عالميًا، وتحافظ على تزامن السمتين `<html dir>` و`<html lang>` في المتصفح.

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

استخدم `setLocale()` عندما يجب أن يغيّر اختيار اللغة الاتجاه أيضًا. أما `setDirection()` و`toggleDirection()` فتثبّتان الاتجاه كتفضيل مستقل، ولا يعيد اختيار اللغة حسابه بعد ذلك.

## Nuxt

جرّب مثال Nuxt 3 مع اتجاه HTML المعروض على الخادم:
[Open in StackBlitz](https://stackblitz.com/github/MarwanMaher0/vue-rtl-kit/tree/main/examples/nuxt).
يثبّت المثالان المكتبة من المستودع باستخدام `file:../..` دون الحاجة إلى نشرها.
احتفظ بنسخة كاملة من المستودع، وشغّل `npm ci` في الجذر لبناء المكتبة، ثم اتبع
ملف README داخل `examples/vite` أو `examples/nuxt`.

أضف `vue-rtl-kit/nuxt` إلى ملف `nuxt.config.ts`:

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

تثبّت الوحدة الإضافة، وتسجّل المكوّنات، وتستورد composables الأربعة تلقائيًا، وتحمّل أدوات CSS، وتكتب السمتين `dir` و`lang` في HTML المعروض على الخادم. لا تحتاج إلى إضافة خاصة بالعميل.

```vue
<script setup lang="ts">
const { dir, locale, toggleDirection } = useDirection()
const format = useFormat()
</script>

<template>
  <main>
    <p>{{ locale }} / {{ dir }}</p>
    <p>{{ format.formatCurrency(2500, 'EGP') }}</p>
    <button @click="toggleDirection">تبديل الاتجاه</button>
    <BidiText as="p" text="الإصدار v1.2.3 متاح الآن" />
  </main>
</template>
```

## الخطوات التالية

- اقرأ عن [مخزن الاتجاه](/ar/guide/direction-store) و[خيارات createRtl](/ar/guide/create-rtl).
- عالج النص المختلط باستخدام [BidiText](/ar/guide/bidi-text).
- راجع جميع [خيارات وحدة Nuxt](/ar/guide/nuxt-module) أو [مرجع API](/ar/api).
