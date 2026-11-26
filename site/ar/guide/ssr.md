# SSR بدون Nuxt

المكتبة آمنة مع SSR بطبيعتها. لا يقرأ استيرادها ولا إنشاء مخزن الاتجاه ولا عرض مكوّناتها `window` أو `document`، لذلك يستطيع خادم Vue 3 عادي إنشاء هيكل المستند بنفسه.

## هيكل Vue SSR يدوي

استدعِ `createRtl()` على الخادم، وثبّت المخزن على التطبيق، وأدرج `htmlAttrs()` في وسم `<html>` الافتتاحي. ثم ينشئ `renderToString()` محتوى الصفحة.

```ts
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createRtl } from 'vue-rtl-kit'

export async function renderShell() {
  const rtl = createRtl({ locales: ['en', 'ar'], defaultLocale: 'ar' })
  const app = createSSRApp({
    render: () => h('main', { dir: rtl.dir.value }, 'مرحبا بالعالم'),
  })
  app.use(rtl)

  const attrs = rtl.htmlAttrs()
  const body = await renderToString(app)
  return `<!DOCTYPE html>
<html dir="${attrs.dir}" lang="${attrs.lang}">
  <body>${body}</body>
</html>`
}
```

تُعيد `htmlAttrs()` القيمة `{ dir, lang }`، فيكون الرد الأول بالاتجاه الصحيح للزائر:

```html
<html dir="rtl" lang="ar">
  <body><main dir="rtl">مرحبا بالعالم</main></body>
</html>
```

أبقِ السمات نفسها على هيكل العميل قبل التهيئة. وتُسجّل `app.use(rtl)` المكوّنات والتوجيه.

## ما لا يلمس DOM مطلقًا

- لا يقرأ استيراد `vue-rtl-kit` كائنَي `window` أو `document`.
- يمكن استدعاء `createRtl()` بأمان على الخادم. ويُتخطّى مراقب مزامنة المستند عند غياب المستند، حتى مع `syncDocument: true`.
- تكون `isServer` مساوية `true` و`isClient` مساوية `false` أثناء العرض على الخادم.
- تكتب `<BidiText>` و`<RtlProvider>` عزلَهما وسمات اتجاههما في HTML الخادم.
- يوفّر `v-rtl` التابع `getSSRProps`، لذلك تظهر سماته في HTML الخادم أيضًا.
- يعمل التوجيه [`v-digits`](/ar/guide/v-digits) عند تعديل الحقل، ولا يغيّر قيمته الأولية عند العرض على الخادم أو عند تركيبه في المتصفّح.

## v-rtl وgetSSRProps

يحل التوجيه ربطه أثناء العرض على الخادم ويُصدر السمة `dir` نفسها، مع `unicode-bidi: isolate` عند طلب العزل:

```vue
<template>
  <pre v-rtl:ltr>npm install vue-rtl-kit</pre>
  <span v-rtl:ltr.isolate>feature/rtl-kit</span>
</template>
```

```html
<pre dir="ltr">npm install vue-rtl-kit</pre>
<span dir="ltr" style="unicode-bidi:isolate;">feature/rtl-kit</span>
```

## العزل في HTML الخادم

تقسم `<BidiText>` النص أثناء العرض، فيكون العزل جزءًا من السلسلة التي يرسلها الخادم بدلًا من إضافته بعد التهيئة:

```vue
<BidiText as="p" dir="rtl" text="الإصدار v1.2.3 متاح الآن" />
```

```html
<p dir="rtl">الإصدار <bdi dir="ltr">v1.2.3</bdi> متاح الآن</p>
```

## متى تستخدم وحدة Nuxt بدلًا من ذلك

استخدم [وحدة Nuxt](/ar/guide/nuxt-module) عندما يكون التطبيق مبنيًا على Nuxt أصلًا. فهي تثبّت إضافة التشغيل، وتغذّي تكامل الرأس في Nuxt بقيم `dir` و`lang` التفاعلية أثناء SSR، وتستورد الدوال تلقائيًا، وتسجّل المكوّنات، ويمكنها إدراج ملف الأنماط وحفظ اللغة في ملف ارتباط.

استخدم الهيكل اليدوي هنا لتطبيق Vite SSR، أو خادم Express أو Fastify أو Hono، أو أي عارض مخصّص تملك قالب مستنده. لا تستدعِ `htmlAttrs()` مرة ثانية عندما تكون وحدة Nuxt مسؤولة عن الرأس.
