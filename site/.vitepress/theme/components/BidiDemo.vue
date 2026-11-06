<script setup lang="ts">
import { computed, ref } from 'vue'
import { BidiText, RtlProvider } from 'vue-rtl-kit'
import { landingCopy } from '../landing-copy'

const props = withDefaults(defineProps<{ locale?: 'en' | 'ar' }>(), { locale: 'en' })
const direction = ref<'rtl' | 'ltr'>('rtl')
const enabled = ref(true)
const text = ref(landingCopy[props.locale].sourceText)
const labels = computed(() => landingCopy[props.locale].demo)
</script>

<template>
  <section id="live-demo" class="proof-sheet" :aria-label="labels.live">
    <div class="proof-heading">
      <span class="proof-live"><span class="proof-dot" aria-hidden="true"></span>{{ labels.live }}</span>
      <span class="proof-index" aria-hidden="true">{{ labels.index }}</span>
    </div>
    <div class="type-specimen" aria-hidden="true" dir="ltr">
      <span class="specimen-latin">{{ labels.specimenLatin }}<span class="specimen-caption" :lang="locale">{{ labels.ltrCaption }}</span></span>
      <svg class="specimen-arrows" viewBox="0 0 64 48" fill="none" aria-hidden="true"><path d="M5 13h51m-12-11 12 11-12 11M59 35H8m12-11L8 35l12 11" stroke="currentColor" stroke-width="3" /></svg>
      <span class="specimen-arabic" lang="ar">{{ labels.specimenArabic }}<span class="specimen-caption" :lang="locale">{{ labels.rtlCaption }}</span></span>
    </div>
    <div class="proof-panel">
      <div class="proof-toolbar">
        <span>{{ labels.direction }}</span>
        <div class="direction-control" role="group" :aria-label="labels.direction" dir="ltr">
          <button type="button" :aria-pressed="direction === 'ltr'" @click="direction = 'ltr'">LTR <svg class="dir-glyph" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.6" /></svg></button>
          <button type="button" :aria-pressed="direction === 'rtl'" @click="direction = 'rtl'"><svg class="dir-glyph" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M13 8H3M7 4 3 8l4 4" stroke="currentColor" stroke-width="1.6" /></svg> RTL</button>
        </div>
      </div>
      <div class="proof-output">
        <RtlProvider :dir="direction" locale="ar">
          <div class="output-line output-raw">
            <span class="output-label" :dir="locale === 'ar' ? 'rtl' : 'ltr'" :lang="locale">{{ labels.raw }} <svg class="mark-rule" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10" stroke="currentColor" stroke-width="1.8" /></svg></span>
            <p lang="ar">{{ text || '…' }}</p>
          </div>
          <div class="output-line output-fixed" :class="{ 'is-disabled': !enabled }">
            <span class="output-label" :dir="locale === 'ar' ? 'rtl' : 'ltr'" :lang="locale">{{ enabled ? labels.output : labels.off }} <svg v-if="enabled" class="mark-check" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8.2 6.4 11.5 13 4.2" stroke="currentColor" stroke-width="1.8" /></svg><svg v-else class="mark-rule" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10" stroke="currentColor" stroke-width="1.8" /></svg></span>
            <BidiText as="p" lang="ar" :dir="direction" :text="text || '…'" :enabled="enabled" />
          </div>
        </RtlProvider>
      </div>
      <div class="proof-input">
        <div class="lab-input-header">
          <label for="demo-text">{{ labels.input }}</label>
          <div class="lab-presets" role="group" :aria-label="labels.presetsLabel">
            <button
              v-for="preset in labels.presets"
              :key="preset.label"
              type="button"
              class="preset-chip"
              :aria-pressed="text === preset.value"
              @click="text = preset.value"
            >
              {{ preset.label }}
            </button>
          </div>
        </div>
        <input id="demo-text" v-model="text" type="text" dir="auto" lang="ar" maxlength="160" spellcheck="false" autocomplete="off">
      </div>
      <div class="proof-bottom">
        <button class="isolation-switch" type="button" role="switch" :aria-checked="enabled" @click="enabled = !enabled">
          <span class="switch-track" aria-hidden="true"><span></span></span>
          {{ labels.isolation }}
        </button>
        <code dir="ltr">&lt;RtlProvider dir="{{ direction }}"&gt; · {{ enabled ? '&lt;bdi&gt;' : 'raw' }}</code>
      </div>
    </div>
    <p class="proof-note">{{ labels.note }}</p>
  </section>
</template>
