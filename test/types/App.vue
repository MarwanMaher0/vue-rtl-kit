<script setup lang="ts">
import { ref } from 'vue'

const preferred = ref<'rtl' | 'ltr' | 'auto'>('auto')
</script>

<template>
  <RtlProvider dir="ltr" locale="en" tag="section" :isolate="false" v-slot="{ dir, isRtl, setDirection, toggleDirection }">
    <button type="button" @click="toggleDirection">{{ isRtl ? 'LTR' : 'RTL' }}</button>
    <button type="button" @click="setDirection('rtl')">{{ dir }}</button>
  </RtlProvider>
  <RtlProvider :tag="null">
    <BidiText text="آخر تحديث 12-05-2024" />
  </RtlProvider>
  <BidiText as="p" dir="auto" strategy="chars" :enabled="false" text="v1.2.3" />
  <BidiText strategy="element">الإصدار v1.2.3</BidiText>

  <p v-rtl>نص</p>
  <pre v-rtl:ltr><code>npm install vue-rtl-kit</code></pre>
  <span v-rtl.ltr.isolate>feature/rtl</span>
  <p v-rtl="'auto'">auto</p>
  <p v-rtl="false">ltr</p>
  <p v-rtl="preferred">{{ $rtl.dir.value }}</p>
  <p v-rtl="{ dir: preferred, isolate: true }">user@example.com</p>

  <!-- @vue-expect-error strategy is 'element' | 'chars' -->
  <BidiText text="v1.2.3" strategy="inline" />
  <!-- @vue-expect-error BidiText dir is 'rtl' | 'ltr' | 'auto' -->
  <BidiText text="v1.2.3" dir="sideways" />
  <!-- @vue-expect-error RtlProvider dir is 'rtl' | 'ltr' -->
  <RtlProvider dir="auto" />
  <!-- @vue-expect-error v-rtl takes a direction, a boolean or { dir, isolate } -->
  <p v-rtl="42">number</p>
</template>
