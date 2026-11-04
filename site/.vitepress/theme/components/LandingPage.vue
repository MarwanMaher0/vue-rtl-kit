<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useData, withBase } from 'vitepress'
import { BidiText } from 'vue-rtl-kit'
import BidiDemo from './BidiDemo.vue'
import { landingCopy } from '../landing-copy'
import { faqs } from '../../faq'

const { lang, isDark } = useData()
const locale = computed(() => lang.value === 'ar' ? 'ar' : 'en')
const t = computed(() => landingCopy[locale.value])
const questions = computed(() => faqs[locale.value])
const doc = (path: string) => withBase(`${locale.value === 'ar' ? '/ar' : ''}/${path}`)
const github = 'https://github.com/MarwanMaher0/vue-rtl-kit'
const install = 'npm install github:MarwanMaher0/vue-rtl-kit#v0.1.1'
const exampleCode = [
  '<script setup>',
  "import { BidiText, RtlProvider } from 'vue-rtl-kit'",
  '<' + '/script>',
  '',
  '<template>',
  '  <RtlProvider dir="rtl" locale="ar">',
  '    <BidiText',
  '      text="آخر تحديث 12-05-2024 بواسطة الفريق"',
  '    />',
  '  </RtlProvider>',
  '</template>',
].join('\n')
const copied = ref('')
const copyError = ref(false)
const mounted = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
onMounted(() => { mounted.value = true })
onUnmounted(() => { if (timer) clearTimeout(timer) })

async function copyCode(value: string, id: string) {
  copyError.value = false
  try {
    await navigator.clipboard.writeText(value)
    copied.value = id
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { copied.value = '' }, 2400)
  } catch {
    copyError.value = true
    const code = document.getElementById(id)
    if (code) {
      const range = document.createRange()
      range.selectNodeContents(code)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
      code.focus()
    }
  }
}
</script>

<template>
  <div class="landing" :dir="locale === 'ar' ? 'rtl' : 'ltr'" :lang="locale">
    <a class="landing-skip" href="#main-content">{{ t.skip }}</a>
    <header class="site-header">
      <nav class="landing-container header-inner" :aria-label="locale === 'ar' ? 'التنقل الرئيسي' : 'Main navigation'">
        <a class="wordmark" :href="doc('')" aria-label="vue-rtl-kit">
          <svg class="brand-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M5 10h22m-7-7 7 7-7 7M27 22H5m7-7-7 7 7 7" stroke="currentColor" stroke-width="2.6" /></svg>
          <span dir="ltr">vue<span class="wordmark-hyphen">-</span>rtl<span class="wordmark-hyphen">-</span>kit</span>
        </a>
        <div class="desktop-nav">
          <a href="#features">{{ t.features }}</a>
          <a href="#quick-start">{{ t.quick }}</a>
          <a :href="doc('getting-started')">{{ t.docs }} <span class="small-arrow" aria-hidden="true">↗</span></a>
        </div>
        <div class="nav-tools">
          <a class="language-link" :href="withBase(locale === 'ar' ? '/' : '/ar/')" :lang="locale === 'ar' ? 'en' : 'ar'" :hreflang="locale === 'ar' ? 'en' : 'ar'">{{ locale === 'ar' ? 'English' : 'العربية' }}</a>
          <span class="nav-divider" aria-hidden="true"></span>
          <button type="button" class="theme-toggle" :aria-label="t.theme" :aria-pressed="mounted && isDark" @click="isDark = !isDark">
            <svg class="theme-moon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20.6 14.1A9 9 0 0 1 9.9 3.4 9 9 0 1 0 20.6 14.1Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" /></svg>
            <svg class="theme-sun" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.6" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" stroke="currentColor" stroke-width="1.6" /></svg>
          </button>
          <a class="nav-github" :href="github" aria-label="GitHub"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.77-.24.77-.54v-2.1c-3.14.68-3.8-1.34-3.8-1.34-.51-1.3-1.25-1.64-1.25-1.64-1.02-.7.08-.69.08-.69 1.13.08 1.73 1.16 1.73 1.16 1 1.72 2.63 1.22 3.27.93.1-.73.39-1.22.72-1.5-2.51-.28-5.15-1.25-5.15-5.56 0-1.23.44-2.23 1.16-3.02-.12-.29-.5-1.43.11-2.98 0 0 .95-.3 3.1 1.15a10.8 10.8 0 0 1 5.64 0c2.15-1.46 3.1-1.15 3.1-1.15.61 1.55.23 2.69.11 2.98.72.79 1.16 1.8 1.16 3.02 0 4.32-2.64 5.27-5.16 5.55.4.35.76 1.03.76 2.08v3.11c0 .3.2.65.77.54A11.25 11.25 0 0 0 12 .75Z" /></svg></a>
          <details class="mobile-menu">
            <summary :aria-label="t.menu"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.7" /></svg></summary>
            <div class="mobile-links">
              <a href="#features" @click="($event.currentTarget as HTMLElement).closest('details')?.removeAttribute('open')">{{ t.features }}</a>
              <a href="#quick-start" @click="($event.currentTarget as HTMLElement).closest('details')?.removeAttribute('open')">{{ t.quick }}</a>
              <a :href="doc('getting-started')">{{ t.docs }}</a>
              <a :href="github">GitHub</a>
            </div>
          </details>
        </div>
      </nav>
    </header>

    <main id="main-content" tabindex="-1">
      <section class="hero landing-container" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="eyebrow hero-eyebrow"><span class="eyebrow-dot" aria-hidden="true"></span>{{ t.eyebrow }}</p>
          <h1 id="hero-title">{{ t.headline[0] }}<br><span>{{ t.headline[1] }}</span><svg class="hero-spark" viewBox="0 0 54 54" fill="none" aria-hidden="true"><path d="M27 0v54M0 27h54M8 8l38 38M8 46 46 8" stroke="currentColor" stroke-width="3" /></svg></h1>
          <p class="hero-summary">{{ t.summary }}</p>
          <div class="hero-actions">
            <a class="button button-primary" :href="doc('getting-started')">{{ t.start }} <span class="forward-arrow" aria-hidden="true">↗</span></a>
            <a class="button button-secondary" :href="doc('guide/direction-store')">{{ t.explore }} <span class="forward-arrow" aria-hidden="true">→</span></a>
          </div>
          <p class="hero-note"><span aria-hidden="true">↳</span> {{ t.heroNote }}</p>
        </div>
        <BidiDemo :locale="locale" />
      </section>

      <div class="compatibility-strip landing-container">
        <span class="compatibility-intro"><span class="status-dot" aria-hidden="true"></span>{{ t.openSource }}</span>
        <ul><li v-for="item in t.compatibility" :key="item"><span aria-hidden="true">✳</span><bdi>{{ item }}</bdi></li></ul>
      </div>

      <section id="problem" class="problem-section landing-container section-space" aria-labelledby="problem-title">
        <p class="eyebrow">{{ t.problemLabel }}</p>
        <div class="section-heading split-heading">
          <h2 id="problem-title">{{ t.problemTitle }}</h2>
          <p>{{ t.problemText }}</p>
        </div>
        <div class="comparison-source"><span>{{ t.source }}</span><code dir="ltr">12-05-2024</code><span class="source-line" aria-hidden="true"></span><span class="source-note">{{ t.directionNote }}</span></div>
        <div class="comparison-grid">
          <article class="comparison-card comparison-before">
            <div class="comparison-heading"><h3>{{ t.before }}</h3><span class="comparison-status" aria-hidden="true">−</span></div>
            <p class="comparison-example" dir="rtl" lang="ar">{{ t.sourceText }}</p>
            <p class="comparison-note">{{ t.beforeNote }}</p>
            <code dir="ltr">&lt;p&gt;…&lt;/p&gt;</code>
          </article>
          <article class="comparison-card comparison-after">
            <div class="comparison-heading"><h3>{{ t.after }}</h3><span class="comparison-status" aria-hidden="true">✓</span></div>
            <BidiText class="comparison-example" as="p" dir="rtl" lang="ar" :text="t.sourceText" />
            <p class="comparison-note">{{ t.afterNote }}</p>
            <code dir="ltr">&lt;BidiText text="…" /&gt;</code>
          </article>
        </div>
      </section>

      <section id="features" class="features-section section-space" aria-labelledby="features-title">
        <div class="landing-container">
          <p class="eyebrow">{{ t.featureLabel }}</p>
          <div class="section-heading split-heading">
            <h2 id="features-title" class="preserve-lines">{{ t.featureTitle }}</h2>
            <p>{{ t.featureText }}</p>
          </div>
          <div class="feature-grid">
            <a v-for="(feature, index) in t.featureCards" :key="feature.link" class="feature-card" :href="doc(`guide/${feature.link}`)">
              <div class="feature-top"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path :d="feature.icon" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg><span>0{{ index + 1 }}</span></div>
              <h3>{{ feature.title }}</h3>
              <p>{{ feature.text }}</p>
              <div class="feature-bottom"><code dir="ltr">{{ feature.code }}</code><span class="forward-arrow" aria-hidden="true">↗</span></div>
            </a>
          </div>
        </div>
      </section>

      <section id="quick-start" class="quick-section landing-container section-space" aria-labelledby="quick-title">
        <div class="quick-intro">
          <p class="eyebrow">{{ t.quickLabel }}</p>
          <h2 id="quick-title" class="preserve-lines">{{ t.quickTitle }}</h2>
          <p>{{ t.quickText }}</p>
          <a class="text-link" :href="doc('getting-started')">{{ t.fullSetup }} <span class="forward-arrow" aria-hidden="true">↗</span></a>
          <div class="quick-graphic" aria-hidden="true"><span>{</span><svg viewBox="0 0 72 48" fill="none"><path d="M4 12h60M52 0l12 12-12 12M68 36H8m12-12L8 36l12 12" stroke="currentColor" stroke-width="2" /></svg><span>}</span></div>
        </div>
        <div class="quick-code">
          <div class="install-block">
            <div class="code-bar"><span><span class="step-number">1</span>{{ t.installTitle }}</span><button type="button" :aria-label="`${t.copy}: ${t.installTitle}`" @click="copyCode(install, 'install-code')">{{ copied === 'install-code' ? t.copied : t.copy }}<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="1" stroke="currentColor" /><path d="M13 7V3H3v10h4" stroke="currentColor" /></svg></button></div>
            <pre id="install-code" dir="ltr" tabindex="0"><code><span aria-hidden="true" class="terminal-dollar">$ </span>{{ install }}</code></pre>
            <p class="install-note">{{ t.installNote }}</p>
          </div>
          <div class="component-block">
            <div class="code-bar"><span><span class="step-number">2</span><bdi>App.vue</bdi></span><button type="button" :aria-label="`${t.copy}: ${t.codeTitle}`" @click="copyCode(exampleCode, 'component-code')">{{ copied === 'component-code' ? t.copied : t.copy }}<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="1" stroke="currentColor" /><path d="M13 7V3H3v10h4" stroke="currentColor" /></svg></button></div>
            <pre id="component-code" dir="ltr" tabindex="0" :aria-label="t.codeTitle"><code><span class="code-muted">&lt;script setup&gt;</span>
<span class="code-purple">import</span> { BidiText, RtlProvider } <span class="code-purple">from</span> <span class="code-green">'vue-rtl-kit'</span>
<span class="code-muted">&lt;/script&gt;</span>

<span class="code-muted">&lt;template&gt;</span>
  <span class="code-blue">&lt;RtlProvider</span> dir=<span class="code-green">"rtl"</span> locale=<span class="code-green">"ar"</span><span class="code-blue">&gt;</span>
    <span class="code-blue">&lt;BidiText</span>
      text=<span class="code-green" dir="ltr">"آخر تحديث 12-05-2024 بواسطة الفريق"</span>
    <span class="code-blue">/&gt;</span>
  <span class="code-blue">&lt;/RtlProvider&gt;</span>
<span class="code-muted">&lt;/template&gt;</span></code></pre>
          </div>
          <p class="copy-feedback" role="status" aria-live="polite">{{ copyError ? t.copyFail : copied ? t.copied : '' }}</p>
        </div>
      </section>

      <section class="use-section section-space" aria-labelledby="use-title">
        <div class="landing-container use-inner">
          <div><p class="eyebrow">{{ t.useLabel }}</p><h2 id="use-title" class="preserve-lines">{{ t.useTitle }}</h2></div>
          <div class="use-cases">
            <article v-for="use in t.useCases" :key="use.number"><span class="use-number">{{ use.number }}</span><div><h3>{{ use.title }}</h3><p>{{ use.text }}</p></div><span class="use-cross" aria-hidden="true">+</span></article>
          </div>
        </div>
      </section>

      <section id="faq" class="faq-section landing-container section-space" aria-labelledby="faq-title">
        <div class="faq-intro"><p class="eyebrow">{{ t.faqLabel }}</p><h2 id="faq-title" class="preserve-lines">{{ t.faqTitle }}</h2><p>{{ t.faqText }}</p></div>
        <div class="faq-list">
          <details v-for="(faq, index) in questions" :key="faq.question" :open="index === 0">
            <summary>{{ faq.question }}<span class="faq-plus" aria-hidden="true">+</span></summary>
            <p>{{ faq.answer }}</p>
          </details>
        </div>
      </section>

      <section class="final-section landing-container" aria-labelledby="final-title">
        <div class="final-content"><p class="eyebrow">{{ t.finalLabel }}</p><h2 id="final-title" class="preserve-lines">{{ t.finalTitle }}</h2><p>{{ t.finalText }}</p><div class="hero-actions"><a class="button button-paper" :href="doc('getting-started')">{{ t.start }} <span class="forward-arrow" aria-hidden="true">↗</span></a><a class="final-github" :href="github">{{ t.github }} <span aria-hidden="true">↗</span></a></div></div>
        <div class="final-art" aria-hidden="true"><svg viewBox="0 0 300 260" fill="none"><path d="M0 72h245m-70-70 70 70-70 70M300 188H55m70-70-70 70 70 70" stroke="currentColor" stroke-width="30" /></svg></div>
      </section>
    </main>

    <footer class="site-footer landing-container">
      <div class="footer-main"><div><a class="wordmark" :href="doc('')"><svg class="brand-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M5 10h22m-7-7 7 7-7 7M27 22H5m7-7-7 7 7 7" stroke="currentColor" stroke-width="2.6" /></svg><span dir="ltr">vue-rtl-kit</span></a><p>{{ t.footerText }}</p></div><nav :aria-label="locale === 'ar' ? 'روابط التذييل' : 'Footer navigation'"><a :href="doc('getting-started')">{{ t.docs }}</a><a :href="doc('api')">{{ t.api }}</a><a :href="github">GitHub</a><a :href="withBase('/llms.txt')">{{ t.ai }}</a></nav></div>
      <div class="footer-bottom"><a :href="`${github}/blob/main/LICENSE`">{{ t.license }}</a><span>{{ t.footerEnd }}</span><a :href="withBase(locale === 'ar' ? '/' : '/ar/')" :lang="locale === 'ar' ? 'en' : 'ar'">{{ locale === 'ar' ? 'Read in English ↗' : 'اقرأ بالعربية ↗' }}</a></div>
    </footer>
  </div>
</template>
