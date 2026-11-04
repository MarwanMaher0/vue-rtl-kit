<script setup lang="ts">
import { computed, ref } from 'vue'
import { BidiText, RtlProvider } from 'vue-rtl-kit'

const props = withDefaults(defineProps<{ locale?: 'en' | 'ar' }>(), { locale: 'en' })
const direction = ref<'rtl' | 'ltr'>('rtl')
const enabled = ref(true)
const text = ref('آخر تحديث 12-05-2024 بواسطة الفريق')
const copy = {
  en: {
    live: 'Not a mockup. Your next interface.',
    direction: 'Direction',
    output: 'With BidiText',
    raw: 'Without isolation',
    input: 'Try your own mixed text',
    isolation: 'Isolate mixed text',
    note: 'Real Vue component. Same string. Better boundaries.',
    off: 'Isolation is off',
  },
  ar: {
    live: 'ليست صورة. إنها واجهتك القادمة.',
    direction: 'الاتجاه',
    output: 'مع BidiText',
    raw: 'بدون عزل',
    input: 'جرّب نصًا مختلطًا بنفسك',
    isolation: 'عزل النص المختلط',
    note: 'مكوّن Vue حقيقي. النص نفسه، بحدود أوضح.',
    off: 'العزل معطّل',
  },
}
const labels = computed(() => copy[props.locale])
</script>

<template>
  <section id="live-demo" class="direction-lab" :aria-label="labels.live">
    <div class="lab-heading">
      <span class="lab-live"><span aria-hidden="true"></span>{{ labels.live }}</span>
      <span class="lab-index" aria-hidden="true">01 / LIVE</span>
    </div>
    <div class="type-specimen" aria-hidden="true">
      <span class="specimen-latin">Aa<span class="specimen-caption">LEFT TO RIGHT</span></span>
      <svg class="specimen-arrows" viewBox="0 0 64 48" fill="none"><path d="M5 13h51m-12-11 12 11-12 11M59 35H8m12-11L8 35l12 11" stroke="currentColor" stroke-width="3" /></svg>
      <span class="specimen-arabic" lang="ar">أب<span class="specimen-caption" lang="en">RIGHT TO LEFT</span></span>
    </div>
    <div class="lab-panel">
      <div class="lab-toolbar">
        <span>{{ labels.direction }}</span>
        <div class="direction-control" role="group" :aria-label="labels.direction" dir="ltr">
          <button type="button" :aria-pressed="direction === 'ltr'" @click="direction = 'ltr'">LTR <span aria-hidden="true">→</span></button>
          <button type="button" :aria-pressed="direction === 'rtl'" @click="direction = 'rtl'"><span aria-hidden="true">←</span> RTL</button>
        </div>
      </div>
      <RtlProvider :dir="direction" locale="ar" class="lab-output">
        <div class="output-line output-line--raw">
          <span class="output-label" :dir="locale === 'ar' ? 'rtl' : 'ltr'" :lang="locale">{{ labels.raw }} <span aria-hidden="true">−</span></span>
          <p>{{ text || '…' }}</p>
        </div>
        <div class="output-line output-line--fixed" :class="{ 'is-disabled': !enabled }">
          <span class="output-label" :dir="locale === 'ar' ? 'rtl' : 'ltr'" :lang="locale">{{ enabled ? labels.output : labels.off }} <span aria-hidden="true">{{ enabled ? '✓' : '−' }}</span></span>
          <BidiText as="p" :text="text || '…'" :enabled="enabled" />
        </div>
      </RtlProvider>
      <div class="lab-input-wrap">
        <label for="demo-text">{{ labels.input }}</label>
        <input id="demo-text" v-model="text" type="text" dir="auto" maxlength="160" spellcheck="false" autocomplete="off">
      </div>
      <div class="lab-bottom">
        <button class="isolation-switch" type="button" role="switch" :aria-checked="enabled" @click="enabled = !enabled">
          <span class="switch-track" aria-hidden="true"><span></span></span>
          {{ labels.isolation }}
        </button>
        <code dir="ltr">&lt;bdi&gt;</code>
      </div>
    </div>
    <p class="lab-note">{{ labels.note }}</p>
  </section>
</template>
