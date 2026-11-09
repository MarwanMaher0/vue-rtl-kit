# وحدة Nuxt

تدعم وحدة Nuxt الإصدارين Nuxt 3 و4. تثبّت إضافة التشغيل، وتدمج رأس المستند أثناء SSR، وتسجّل المكوّنات، وتستورد الدوال التركيبية تلقائيًا، وتحمّل ملف التنسيق اختياريًا.

```ts
export default defineNuxtConfig({
  modules: ['vue-rtl-kit/nuxt'],
  rtl: {
    locales: { en: 'ltr', ar: 'rtl' },
    defaultLocale: 'ar',
    htmlClass: true,
    numberingSystem: { ar: 'latn' },
  },
})
```

مفتاح الإعداد هو `rtl`. يرث `ModuleOptions` من `RtlOptions` ويضيف عناصر تحكم في التسجيل خاصة بـ Nuxt.

## ModuleOptions

| الخيار | النوع | القيمة الافتراضية | الوصف |
| --- | --- | --- | --- |
| `locales` | `string[] \| LocaleMap` | `{ en: 'ltr', ar: 'rtl' }` | اللغات المتاحة لمخزن التشغيل. |
| `defaultLocale` | `string` | `'en'` | اللغة الأولية. |
| `dir` | `Direction` | `undefined`؛ ويُستنتج `'ltr'` من اللغة الافتراضية | اتجاه أولي صريح؛ ويؤدي توفيره إلى تثبيت الاتجاه. |
| `syncDocument` | `boolean` | `true` | مزامنة `<html dir>` و`<html lang>` في العميل بعد التثبيت. |
| `htmlClass` | `boolean \| { rtl: string, ltr: string }` | `false` | تبديل أصناف الاتجاه الافتراضية أو المخصصة على `<html>`. |
| `numberingSystem` | `NumberingSystem \| Record<string, NumberingSystem>` | `undefined`؛ القيمة الافتراضية للغة | الأرقام الافتراضية لـ `useFormat()`، عالميًا أو لكل لغة. |
| `registerGlobals` | `boolean` | مهمَل؛ يتصرف وقت التشغيل كأنه `true` | لا تمرر الوحدة هذا الخيار الموروث إلى إعدادات التشغيل، لذا لا يكون لضبطه أي تأثير في Nuxt. |
| `autoImports` | `boolean` | `true` | استيراد `useDirection` و`useRtl` و`useLogicalStyles` و`useFormat` تلقائيًا. |
| `components` | `boolean` | `true` | تسجيل `<RtlProvider>` و`<BidiText>` عبر Nuxt. |
| `css` | `boolean` | `true` | حقن `vue-rtl-kit/styles.css`. |
| `cookie` | `false \| string \| { name?, maxAge?, sameSite? }` | `false` | حفظ لغة الزائر واتجاهه في ملف تعريف ارتباط (انظر أدناه). |

## الحفظ في ملف تعريف الارتباط

الحفظ اختياري ومعطّل افتراضيًا. اضبط `rtl.cookie` على اسم ملف تعريف الارتباط، أو على `{ name, maxAge, sameSite }` (`maxAge` بالثواني؛ والقيم الافتراضية هي الاسم `'vue-rtl-kit'` وسنة واحدة و`'lax'`):

```ts
export default defineNuxtConfig({
  modules: ['vue-rtl-kit/nuxt'],
  rtl: {
    locales: { en: 'ltr', ar: 'rtl' },
    defaultLocale: 'en',
    cookie: { name: 'site-rtl', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' },
  },
})
```

عند تفعيله، تقرأ إضافة التشغيل ملف تعريف الارتباط أثناء SSR وتبذر المخزن باللغة والاتجاه المحفوظين، فيحصل الزائر العربي العائد على `<html dir="rtl" lang="ar">` في HTML الخادم دون وميض اتجاه. وتكتب زوج `locale:dir` الحالي مجددًا كلما استُدعي `setLocale` أو `setDirection` أو `toggleDirection`. تُقبل أيضًا لغة محفوظة بمفردها (`ar`) أو اتجاه بمفرده (`rtl`)؛ أما القيم التي ليست لغة مُعدّة أو اتجاهًا أو زوجًا كهذا فتُتجاهل وتُطبق القيم الافتراضية المُعدّة. ومع `cookie: false` لا يُقرأ أي ملف تعريف ارتباط ولا يُكتب.

تُحذف `dir` و`syncDocument` و`htmlClass` و`numberingSystem` من إعدادات التشغيل عند عدم توفيرها، مما يسمح لـ `createRtl()` بتطبيق قواعد الحسم الخاصة به.

يعطّل `components: false` تسجيل مكوّنات Nuxt فقط. ومع ذلك، تظل إضافة التشغيل تستدعي `createRtl()` مع القيمة الافتراضية `registerGlobals: true`، لذلك تظل `<RtlProvider>` و`<BidiText>` و`v-rtl` مسجلة عالميًا.

## سمات مستند SSR

تستدعي إضافة التشغيل `createRtl()` وتوفّر قيم `dir` و`lang` التفاعلية عبر تكامل رأس المستند في Nuxt. وبذلك يتطابق الاتجاه في HTML المعروض على الخادم والوسوم بعد الترطيب دون الحاجة إلى حل بديل خاص بالعميل.

```vue
<script setup lang="ts">
const { dir, locale, setLocale } = useDirection()
const format = useFormat()
</script>

<template>
  <header>
    <span>{{ locale }} / {{ dir }}</span>
    <button @click="setLocale('en')">English</button>
    <button @click="setLocale('ar')">العربية</button>
    <output>{{ format.formatNumber(1234.5) }}</output>
  </header>
</template>
```

## الإعداد الانتقائي

عطّل التسجيلات التلقائية في Nuxt عندما تفضل الاستيرادات الصريحة:

```ts
export default defineNuxtConfig({
  modules: ['vue-rtl-kit/nuxt'],
  rtl: {
    autoImports: false,
    components: false,
    css: false,
  },
})
```

```vue
<script setup lang="ts">
import { BidiText, useDirection } from 'vue-rtl-kit'
import 'vue-rtl-kit/styles.css'

const { dir } = useDirection()
</script>

<template>
  <BidiText :dir="dir" text="الإصدار v1.2.3 متاح الآن" />
</template>
```

تُثبَّت إضافة اتجاه التشغيل دائمًا. وتتحكم الخيارات `autoImports` و`components` و`css` فقط في تكاملات Nuxt المقابلة لها أثناء البناء.
