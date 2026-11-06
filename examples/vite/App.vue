<script setup lang="ts">
import { computed } from 'vue'
import { BidiText, useDirection, useFormat, useLogicalStyles } from 'vue-rtl-kit'

const { dir, isRtl, locale, setLocale } = useDirection()
const format = useFormat()
const { toLogical, mirror } = useLogicalStyles()

const copy = computed(() => isRtl.value
  ? {
      title: 'لغتان. تجربة واحدة.',
      intro: 'نص مختلط، أرقام محلية، وتخطيط يتبع لغتك.',
      mixed: 'نص بالاتجاهين',
      message: 'طلبك Vue Pro رقم #2048 جاهز — التسليم 12-05-2024.',
      layout: 'التخطيط المنطقي',
      note: 'تنتقل الحافة والمسافة والسهم مع اتجاه القراءة.',
      numbers: 'أرقام بلغتك',
      total: 'الإجمالي',
      items: 'عدد العناصر',
      date: 'تاريخ الطلب',
    }
  : {
      title: 'Two languages. One experience.',
      intro: 'Mixed text, local digits, and a layout that follows your language.',
      mixed: 'Bidirectional text',
      message: 'Your Vue Pro order #2048 is ready — شكراً لك! Delivery 12-05-2024.',
      layout: 'Logical layout',
      note: 'The border, spacing, and arrow follow the reading direction.',
      numbers: 'Numbers, your way',
      total: 'Total',
      items: 'Item count',
      date: 'Order date',
    })

const noteStyle = computed(() => toLogical({
  borderLeft: '3px solid #a14328',
  paddingLeft: '1.25rem',
  textAlign: 'left',
}))
const arrowStyle = computed(() => ({
  display: 'inline-block',
  transform: `translateX(${mirror(8)}px)`,
}))
</script>

<template>
  <main>
    <header>
      <p class="eyebrow" dir="ltr">vue-rtl-kit / Vue 3 + Vite</p>
      <nav aria-label="Language / اللغة">
        <button lang="ar" :aria-pressed="locale === 'ar'" @click="setLocale('ar')">العربية</button>
        <button lang="en" :aria-pressed="locale === 'en'" @click="setLocale('en')">English</button>
      </nav>
    </header>

    <section class="intro" aria-labelledby="title">
      <p class="eyebrow"><bdi>{{ locale }}</bdi> / <bdi>{{ dir }}</bdi></p>
      <h1 id="title">{{ copy.title }}</h1>
      <p>{{ copy.intro }}</p>
    </section>

    <section aria-labelledby="mixed-title">
      <p class="eyebrow" dir="ltr">01 / BidiText</p>
      <h2 id="mixed-title">{{ copy.mixed }}</h2>
      <BidiText as="p" class="mixed" :dir="dir" :text="copy.message" />
    </section>

    <section aria-labelledby="layout-title">
      <p class="eyebrow" dir="ltr">02 / useLogicalStyles</p>
      <h2 id="layout-title">{{ copy.layout }}</h2>
      <p :style="noteStyle">
        {{ copy.note }}
        <span aria-hidden="true" :style="arrowStyle">{{ isRtl ? '←' : '→' }}</span>
      </p>
    </section>

    <section aria-labelledby="numbers-title">
      <p class="eyebrow" dir="ltr">03 / useFormat</p>
      <h2 id="numbers-title">{{ copy.numbers }}</h2>
      <dl>
        <div>
          <dt>{{ copy.total }}</dt>
          <dd><bdi>{{ format.formatCurrency(2500, 'EGP') }}</bdi></dd>
        </div>
        <div>
          <dt>{{ copy.items }}</dt>
          <dd><bdi>{{ format.formatNumber(1234, { useGrouping: false }) }}</bdi></dd>
        </div>
        <div>
          <dt>{{ copy.date }}</dt>
          <dd><bdi>{{ format.formatDate('2024-05-12T00:00:00Z', { dateStyle: 'long', timeZone: 'UTC' }) }}</bdi></dd>
        </div>
      </dl>
    </section>
  </main>
</template>

<style>
:root { font-family: Georgia, 'Noto Naskh Arabic', serif; color: #27251f; background: #f7f3e9; line-height: 1.7; }
* { box-sizing: border-box; }
body { margin: 0; }
main { max-inline-size: 60rem; margin-inline: auto; padding: 2rem clamp(1.25rem, 5vw, 4rem) 4rem; }
header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; border-block-end: 1px solid #c7bfae; padding-block-end: 1.5rem; }
nav { display: flex; gap: 0.5rem; }
button { font: inherit; padding: 0.45rem 1rem; border: 1px solid #736c5e; border-radius: 0; background: transparent; color: inherit; cursor: pointer; }
button[aria-pressed='true'] { background: #27251f; color: #f7f3e9; }
button:focus-visible { outline: 3px solid #a14328; outline-offset: 3px; }
.eyebrow { font-family: 'Courier New', monospace; font-size: 0.8rem; letter-spacing: 0.04em; color: #6d4a37; }
.intro { padding-block: 3rem; }
h1 { max-inline-size: 16ch; font-size: clamp(2.5rem, 7vw, 4.75rem); line-height: 1.2; font-weight: 400; margin-block: 1rem; }
h2 { margin-block: 0.5rem 1rem; font-size: 1.5rem; font-weight: 400; }
section:not(.intro) { border-block-start: 1px solid #c7bfae; padding-block: 1.5rem; }
.mixed { font-size: 1.2rem; overflow-wrap: anywhere; }
dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr)); gap: 1.5rem; margin-block-end: 0; }
dt { font-size: 0.9rem; color: #625c50; }
dd { margin-inline-start: 0; font-size: 1.2rem; }
</style>
