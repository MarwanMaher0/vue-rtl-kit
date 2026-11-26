<script setup lang="ts">
import { ref } from 'vue'
import {
  compareText,
  getScrollInline,
  getScrollInlineMax,
  logicalArrow,
  parseNumber,
  resolvePlacement,
  scrollByInline,
  scrollInlineEdges,
  scrollToInline,
  sortByLocale,
  toLogicalPlacement,
  useFormat,
  useInlineScroll,
  useLogicalPlacement,
  useLogicalStyles,
} from 'vue-rtl-kit'
import type {
  CompareOptions,
  LogicalPlacement,
  ParseNumberOptions,
  PhysicalPlacement,
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
const _compareOptions: CompareOptions = { locale: ['ar', 'en'], caseFirst: 'upper', direction: 'desc' }
const _comparison: number = compareText('بَيْت ۲', 'بيت ١0', _compareOptions)
const _boundComparison: number = useFormat().value.compareText('بَيْت ۲', 'بيت ١0')
const readonlyLabels = [{ id: 1, label: 'بيت' }, { id: 2, label: 'تمر' }] as const
const _sorted: Array<(typeof readonlyLabels)[number]> = sortByLocale(readonlyLabels, {
  ..._compareOptions,
  key: item => item.label,
})
const _boundSorted: Array<(typeof readonlyLabels)[number]> = useFormat().value.sortByLocale(readonlyLabels, {
  key: item => item.label,
})
const logicalPlacement = ref<LogicalPlacement>('inline-start-end')
const _physical: PhysicalPlacement = resolvePlacement(logicalPlacement.value, 'rtl')
const _logical: LogicalPlacement = toLogicalPlacement(_physical, 'rtl')
const _placement = useLogicalPlacement(logicalPlacement, scroller)
const _value: PhysicalPlacement = _placement.value
// @ts-expect-error the composable accepts logical placements only
useLogicalPlacement('left-start')
// @ts-expect-error the resolved placement is readonly
_placement.value = 'right'
// @ts-expect-error parseNumber reads text, not a number
parseNumber(1234.5)
// @ts-expect-error compareText compares strings, not numbers
compareText(1, '2')
// @ts-expect-error a collation key must return a string
sortByLocale(readonlyLabels, { key: item => item.id })
// @ts-expect-error bound sorting also requires a string key
useFormat().value.sortByLocale(readonlyLabels, { key: () => undefined })
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

  <input v-digits type="tel">
  <textarea v-digits="{ to: 'arabext', decimal: true }"></textarea>
  <!-- @vue-expect-error v-digits only supports latn, arab and arabext -->
  <input v-digits="{ to: 'deva' }">

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
