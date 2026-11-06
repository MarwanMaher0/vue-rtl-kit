<script setup lang="ts">
import { computed } from 'vue'
import { BidiText, useDirection, useFormat, useLogicalStyles } from 'vue-rtl-kit'

const { locale, dir, setLocale } = useDirection()
const { toLogical, mirror, startSide } = useLogicalStyles()
const fmt = useFormat()

const copy = computed(() => locale.value === 'ar'
  ? {
      edition: 'تجربة Nuxt 3',
      title: 'لغتان. واجهة واحدة.',
      intro: 'من العربية إلى الإنجليزية، يتغيّر الاتجاه وتبقى التفاصيل في مكانها. بداية بسيطة لواجهة تفهم اللغتين.',
      switchLabel: 'لغة الواجهة',
      state: 'الاتجاه الحالي',
      bidiTitle: 'النص في سياقه',
      bidiBody: 'حروف عربية، اسم لاتيني، ورقم طلب. عزل المقاطع يحافظ على ترتيبها دون تغيير النص الأصلي.',
      order: 'طلب من ليلى عبر Atlas Studio، رقم ORD-2048، بتاريخ 12-05-2024.',
      logicalTitle: 'المسافة تتبع اللغة',
      logicalBody: 'الحد والمسافة عند بداية السطر، والسهم يعكس اتجاهه وإزاحته مع اللغة.',
      logicalSample: 'البداية هنا، في كلا الاتجاهين.',
      start: 'بداية السطر',
      formatTitle: 'الأرقام، بلهجة محلية',
      formatBody: 'نفس القيم، بتنسيق يتبع اللغة. الأرقام العربية الهندية للعربية، والغربية للإنجليزية.',
      number: 'عدد الزيارات',
      currency: 'قيمة الطلب',
      date: 'تاريخ الإصدار',
      override: 'أرقام غربية، بنفس اللغة',
      footer: 'يبدأ العرض من الخادم بالعربية. إعادة تحميل الصفحة تعيد اللغة الافتراضية.',
    }
  : {
      edition: 'A Nuxt 3 field note',
      title: 'Two languages. One interface.',
      intro: 'From Arabic to English, the direction changes and the details stay in place. A small starting point for an interface that understands both.',
      switchLabel: 'Interface language',
      state: 'Current direction',
      bidiTitle: 'Text, in context',
      bidiBody: 'Arabic letters, a Latin name and an order number. Isolated runs keep their order without changing the original text.',
      order: 'An order for ليلى via Atlas Studio, reference ORD-2048, dated 12-05-2024.',
      logicalTitle: 'Spacing follows language',
      logicalBody: 'The border and spacing stay at the start of the line. The arrow mirrors its direction and offset with the locale.',
      logicalSample: 'The start is here, in either direction.',
      start: 'Inline start',
      formatTitle: 'Numbers, with a local accent',
      formatBody: 'The same values, formatted for the locale. Arabic-Indic digits in Arabic, Western digits in English.',
      number: 'Page visits',
      currency: 'Order total',
      date: 'Issue date',
      override: 'Western digits, same locale',
      footer: 'Rendered on the server in Arabic. Reloading restores the default locale.',
    })

const logicalStyle = computed(() => toLogical({
  paddingLeft: '1.25rem',
  borderLeft: '3px solid var(--accent)',
}))

const arrowStyle = computed(() => ({
  transform: `translateX(${mirror(12)}px) scaleX(${mirror(1)})`,
}))

const formattedDate = computed(() => fmt.value.formatDate('2024-05-12T12:00:00.000Z', {
  dateStyle: 'long',
  calendar: 'gregory',
  timeZone: 'UTC',
}))
</script>

<template>
  <div class="page">
    <header class="masthead">
      <span class="wordmark" lang="en" dir="ltr">vue-rtl-kit <span class="wordmark-note">/ Nuxt</span></span>
      <div class="locale-switch" role="group" :aria-label="copy.switchLabel">
        <button type="button" lang="ar" :aria-pressed="locale === 'ar'" @click="setLocale('ar')">
          العربية
        </button>
        <button type="button" lang="en" :aria-pressed="locale === 'en'" @click="setLocale('en')">
          English
        </button>
      </div>
    </header>

    <main id="main">
      <section class="intro" aria-labelledby="page-title">
        <div>
          <p class="eyebrow">{{ copy.edition }}</p>
          <h1 id="page-title">{{ copy.title }}</h1>
          <p class="lede">{{ copy.intro }}</p>
        </div>
        <div class="direction-note" role="status" aria-live="polite" aria-atomic="true">
          <span>{{ copy.state }}</span>
          <strong lang="en" dir="ltr">{{ locale }} / {{ dir }}</strong>
          <span class="server-label" lang="en" dir="ltr">Server-rendered · locale-aware</span>
        </div>
      </section>

      <section class="demo" aria-labelledby="bidi-title">
        <div class="section-heading">
          <span class="index" aria-hidden="true">01</span>
          <h2 id="bidi-title">{{ copy.bidiTitle }}</h2>
          <code lang="en" dir="ltr">BidiText</code>
        </div>
        <div class="demo-content">
          <p class="description">{{ copy.bidiBody }}</p>
          <BidiText as="p" class="order" :text="copy.order" />
        </div>
      </section>

      <section class="demo" aria-labelledby="logical-title">
        <div class="section-heading">
          <span class="index" aria-hidden="true">02</span>
          <h2 id="logical-title">{{ copy.logicalTitle }}</h2>
          <code lang="en" dir="ltr">useLogicalStyles()</code>
        </div>
        <div class="demo-content">
          <p class="description">{{ copy.logicalBody }}</p>
          <div class="logical-sample" :style="logicalStyle">
            <p>{{ copy.logicalSample }}</p>
            <svg class="arrow" :style="arrowStyle" width="48" height="24" viewBox="0 0 48 24" fill="none" aria-hidden="true">
              <path d="M4 12h36m-9-8 9 8-9 8" stroke="currentColor" stroke-width="2" />
            </svg>
          </div>
          <p class="sample-detail">{{ copy.start }}: <code lang="en" dir="ltr">{{ startSide }}</code></p>
        </div>
      </section>

      <section class="demo" aria-labelledby="format-title">
        <div class="section-heading">
          <span class="index" aria-hidden="true">03</span>
          <h2 id="format-title">{{ copy.formatTitle }}</h2>
          <code lang="en" dir="ltr">useFormat()</code>
        </div>
        <div class="demo-content">
          <p class="description">{{ copy.formatBody }}</p>
          <dl class="figures">
            <div>
              <dt>{{ copy.number }}</dt>
              <dd><bdi>{{ fmt.formatNumber(48210) }}</bdi></dd>
            </div>
            <div>
              <dt>{{ copy.currency }}</dt>
              <dd><bdi>{{ fmt.formatCurrency(2500.5, 'EGP') }}</bdi></dd>
            </div>
            <div>
              <dt>{{ copy.date }}</dt>
              <dd class="date"><bdi>{{ formattedDate }}</bdi></dd>
            </div>
          </dl>
          <p class="sample-detail">
            {{ copy.override }}:
            <bdi>{{ fmt.formatNumber(48210, { numberingSystem: 'latn' }) }}</bdi>
            <code lang="en" dir="ltr">latn</code>
          </p>
        </div>
      </section>
    </main>

    <footer>
      <p>{{ copy.footer }}</p>
      <span lang="en" dir="ltr">Nuxt 3 / Vue 3 / vue-rtl-kit</span>
    </footer>
  </div>
</template>

<style>
:root {
  --paper: #f6f1e8;
  --ink: #29251f;
  --muted: #686056;
  --accent: #98452f;
  --line: #d7cdbf;
  color: var(--ink);
  background: var(--paper);
  font-family: 'Iowan Old Style', 'Palatino Linotype', 'Noto Naskh Arabic', 'Traditional Arabic', Georgia, serif;
  line-height: 1.7;
  color-scheme: light;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

button {
  font: inherit;
}

button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 4px;
}

.page {
  max-inline-size: 72rem;
  margin-inline: auto;
  padding-inline: clamp(1.25rem, 5vw, 4rem);
}

.masthead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding-block: 1.5rem;
  border-block-end: 1px solid var(--ink);
}

.wordmark {
  font-size: 1.15rem;
  font-weight: 700;
}

.wordmark-note,
.description,
.lede,
.sample-detail,
footer,
dt {
  color: var(--muted);
}

.wordmark-note {
  font-weight: 400;
}

.locale-switch {
  display: flex;
  gap: 0.35rem;
}

.locale-switch button {
  min-block-size: 44px;
  padding-block: 0.35rem;
  padding-inline: 1rem;
  border: 1px solid var(--line);
  border-radius: 2px;
  background: transparent;
  color: var(--ink);
  cursor: pointer;
}

.locale-switch button:hover {
  border-color: var(--ink);
}

.locale-switch button[aria-pressed='true'] {
  border-color: var(--ink);
  background: var(--ink);
  color: var(--paper);
}

.intro {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 2.5rem;
  padding-block: clamp(2.5rem, 7vw, 5rem);
}

.eyebrow,
.index {
  color: var(--accent);
}

.eyebrow {
  margin-block: 0 1rem;
  font-size: 1rem;
}

h1,
h2,
p {
  margin-block: 0;
}

h1 {
  max-inline-size: 13ch;
  font-size: clamp(2.75rem, 6vw, 4.75rem);
  font-weight: 400;
  line-height: 1.25;
  text-wrap: balance;
}

.lede {
  max-inline-size: 48ch;
  margin-block-start: 1.5rem;
  font-size: 1.2rem;
}

.direction-note {
  display: grid;
  gap: 0.35rem;
  padding-inline-start: 1.25rem;
  border-inline-start: 1px solid var(--accent);
}

.direction-note strong {
  color: var(--accent);
  font-weight: 400;
  font-size: 1.75rem;
}

.server-label,
code,
.sample-detail,
footer {
  font-size: 0.875rem;
}

.server-label,
code {
  font-family: 'Courier New', monospace;
}

.demo {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: 2.5rem;
  border-block-start: 1px solid var(--line);
  padding-block: 2.5rem;
}

.section-heading {
  display: grid;
  align-content: start;
  justify-items: start;
  gap: 0.5rem;
}

.index {
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
}

h2 {
  font-size: 1.5rem;
  font-weight: 400;
}

code {
  display: inline-block;
  overflow-wrap: anywhere;
}

.demo-content {
  min-inline-size: 0;
}

.description {
  max-inline-size: 60ch;
  margin-block-end: 1.5rem;
}

.order {
  padding-block: 1.25rem;
  padding-inline: 1.5rem;
  background: #eee5d8;
  font-size: 1.3rem;
  overflow-wrap: anywhere;
}

.logical-sample {
  padding-block: 0.5rem;
  font-size: 1.2rem;
}

.arrow {
  display: block;
  margin-block-start: 0.75rem;
  color: var(--accent);
}

.sample-detail {
  margin-block-start: 1rem;
}

.sample-detail code {
  margin-inline-start: 0.4rem;
}

.figures {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.5rem;
  margin-block: 0;
  margin-inline: 0;
}

.figures > div:last-child {
  grid-column: 1 / -1;
}

dd {
  margin-inline: 0;
  margin-block: 0.25rem 0;
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

dd.date {
  font-size: 1.25rem;
}

footer {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  border-block-start: 1px solid var(--ink);
  padding-block: 1.5rem 2rem;
}

@media (max-width: 700px) {
  .intro,
  .demo {
    grid-template-columns: minmax(0, 1fr);
    gap: 1.5rem;
  }

  .direction-note {
    justify-self: start;
  }
}

@media (max-width: 380px) {
  .figures {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
