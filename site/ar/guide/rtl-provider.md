# RtlProvider

يمنح `<RtlProvider>` شجرة فرعية اتجاهًا ولغة وسمات DOM وسياق اتجاه تفاعليًا خاصًا بها. ولا يغيّر المخزن الجذري.

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

## الخصائص

| الخاصية | النوع | القيمة الافتراضية | الوصف |
| --- | --- | --- | --- |
| `dir` | `Direction \| undefined` | اتجاه `locale`، وإلا فاتجاه الأب | اتجاه الشجرة الفرعية. |
| `locale` | `string \| undefined` | لغة الأب | يضبط `lang`، ويضبط الاتجاه أيضًا عند إغفال `dir`. |
| `tag` | `string \| null` | `'div'` | العنصر الغلاف. يعرض `null` محتوى الخانة دون غلاف. |
| `isolate` | `boolean` | `true` | تطبيق `unicode-bidi: isolate` على الغلاف. |

يتلقى العنصر الغلاف السمات `dir` و`lang` و`data-rtl-scope`.

## عناصر التحكم عبر الخانة

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

توفّر الخانة `dir` و`isRtl` و`setDirection` و`toggleDirection`. وتحصل المكوّنات داخل الموفر على النطاق نفسه عبر `useDirection()` و`useLogicalStyles()` و`BidiText`.

تظل التغييرات الخارجية في خاصيتي `dir` و`locale` هي المرجع الحاكم. وعند عدم تمرير أي منهما، يتبع الموفر اتجاه الأب.

## نطاقات دون عنصر عرض

```vue
<RtlProvider :tag="null" dir="ltr">
  <code dir="ltr">npm run docs:build</code>
</RtlProvider>
```

عند استخدام `:tag="null"`، لا يحمل أي عنصر سمة `dir` الخاصة بالموفر. احرص على أن تضبط العناصر الأبناء اتجاهها بنفسها عندما يكون عزل DOM مهمًا.
