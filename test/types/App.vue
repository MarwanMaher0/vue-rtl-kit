<script setup lang="ts">
import { ref } from 'vue'
import {
  getScrollInline,
  getScrollInlineMax,
  logicalArrow,
  parseNumber,
  scrollByInline,
  scrollInlineEdges,
  scrollToInline,
  useFormat,
  useInlineScroll,
  useLogicalStyles,
} from 'vue-rtl-kit'
import type {
  ParseNumberOptions,
  ScrollInlineEdges,
  ScrollInlineOptions,
  UseInlineScrollOptions,
  UseInlineScrollReturn,
} from 'vue-rtl-kit'

const preferred = ref<'rtl' | 'ltr' | 'auto'>('auto')
const scroller = ref<HTMLElement | null>(null)
const { arrow } = useLogicalStyles()
const _step: 'next' | 'previous' | 'first' | 'last' | 'up' | 'down' | null = logicalArrow('ArrowRight', 'rtl')
const _scrollOptions: ScrollInlineOptions = { behavior: 'smooth' }
const _inlineScrollOpts: UseInlineScrollOptions = { tolerance: 2 }
const _scrollState: UseInlineScrollReturn = useInlineScroll(scroller, _inlineScrollOpts)
const _scrollOffset: number = getScrollInline(scroller.value)
const _scrollMax: number = getScrollInlineMax(scroller.value)
const _scrollEdges: ScrollInlineEdges = scrollInlineEdges(scroller.value)
scrollToInline(scroller.value, 100, _scrollOptions)
scrollByInline(scroller.value, 50, _scrollOptions)
const _parseOptions: ParseNumberOptions = { locale: 'ar-EG', numberingSystem: 'arab' }
const _parsed: number = parseNumber('١٬٢٣٤٫٥', _parseOptions)
const _boundParsed: number = useFormat().value.parseNumber('1,234.5')
// @ts-expect-error parseNumber reads text, not a number
parseNumber(1234.5)
// @ts-expect-error offset is readonly on useInlineScroll
_scrollState.offset.value = 10
</script>

<template>
  <RtlProvider dir="ltr" locale="en" tag="section" :isolate="false" v-slot="{ dir, isRtl, setDirection, toggleDirection }">
    <button type="button" @click="toggleDirection" @keydown="arrow">{{ isRtl ? 'LTR' : 'RTL' }}</button>
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
