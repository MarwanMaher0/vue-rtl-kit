<script setup lang="ts">
import { computed, ref } from 'vue'
import { BidiText, RtlProvider } from 'vue-rtl-kit'

const props = withDefaults(defineProps<{
  locale?: 'en' | 'ar'
}>(), {
  locale: 'en',
})

const direction = ref<'rtl' | 'ltr'>('rtl')
const enabled = ref(true)
const examples = [
  'آخر تحديث 12-05-2024 بواسطة الفريق',
  'الإصدار v1.2.3 متاح الآن',
  'رقم الطلب #4821-B جاهز للمراجعة',
]

const copy = {
  en: {
    eyebrow: 'Live, with the real component',
    title: 'Same string. Different pixels.',
    description: 'Switch direction or disable isolation. The source text never changes.',
    raw: 'Raw HTML',
    fixed: '<BidiText>',
    isolation: 'Unicode isolation',
    note: 'The fixed column renders the library’s BidiText component with its default element strategy.',
  },
  ar: {
    eyebrow: 'تجربة مباشرة بالمكوّن الحقيقي',
    title: 'النص نفسه. والعرض مختلف.',
    description: 'بدّل الاتجاه أو عطّل العزل. لن يتغير النص المصدر.',
    raw: 'HTML عادي',
    fixed: '<BidiText>',
    isolation: 'العزل ثنائي الاتجاه',
    note: 'يعرض العمود المحسّن مكوّن BidiText من المكتبة باستراتيجية element الافتراضية.',
  },
}

const labels = computed(() => copy[props.locale])
</script>

<template>
  <section class="bidi-playground" :aria-label="labels.title">
    <div class="bidi-playground__intro">
      <span class="bidi-playground__eyebrow">{{ labels.eyebrow }}</span>
      <h2>{{ labels.title }}</h2>
      <p>{{ labels.description }}</p>
    </div>

    <RtlProvider :dir="direction" class="bidi-playground__stage">
      <div class="bidi-playground__toolbar">
        <div class="bidi-playground__segmented" aria-label="Text direction">
          <button type="button" :aria-pressed="direction === 'rtl'" @click="direction = 'rtl'">
            RTL · العربية
          </button>
          <button type="button" :aria-pressed="direction === 'ltr'" @click="direction = 'ltr'">
            LTR · English
          </button>
        </div>
        <label class="bidi-playground__toggle">
          <input v-model="enabled" type="checkbox">
          <span>{{ labels.isolation }}</span>
        </label>
      </div>

      <div class="bidi-playground__grid">
        <div class="bidi-playground__column bidi-playground__column--raw">
          <span class="bidi-playground__label">{{ labels.raw }}</span>
          <p v-for="example in examples" :key="example">{{ example }}</p>
        </div>
        <div class="bidi-playground__column bidi-playground__column--fixed">
          <span class="bidi-playground__label">{{ labels.fixed }}</span>
          <BidiText
            v-for="example in examples"
            :key="example"
            as="p"
            :text="example"
            :enabled="enabled"
          />
        </div>
      </div>
    </RtlProvider>

    <p class="bidi-playground__note">{{ labels.note }}</p>
  </section>
</template>

<style scoped>
.bidi-playground {
  max-width: 1152px;
  margin: 56px auto 24px;
  padding: 0 24px;
}

.bidi-playground__intro {
  max-width: 680px;
  margin-bottom: 24px;
}

.bidi-playground__eyebrow {
  display: block;
  margin-bottom: 10px;
  color: var(--vp-c-brand-1);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.bidi-playground__intro h2 {
  margin: 0;
  border: 0;
  font-size: clamp(28px, 4vw, 42px);
  letter-spacing: -0.035em;
  line-height: 1.12;
}

.bidi-playground__intro p {
  margin: 12px 0 0;
  color: var(--vp-c-text-2);
}

.bidi-playground__stage {
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
  border-radius: 20px;
  background: var(--vp-c-bg-soft);
  box-shadow: 0 24px 70px rgb(14 50 46 / 8%);
}

.bidi-playground__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.bidi-playground__segmented {
  display: flex;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg);
}

.bidi-playground__segmented button {
  padding: 7px 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--vp-c-text-2);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.bidi-playground__segmented button[aria-pressed='true'] {
  background: var(--vp-c-brand-1);
  color: white;
}

.bidi-playground__toggle {
  display: flex;
  gap: 9px;
  align-items: center;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.bidi-playground__toggle input {
  width: 17px;
  height: 17px;
  accent-color: var(--vp-c-brand-1);
}

.bidi-playground__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.bidi-playground__column {
  min-width: 0;
  padding: 22px;
}

.bidi-playground__column + .bidi-playground__column {
  border-inline-start: 1px solid var(--vp-c-divider);
}

.bidi-playground__column--fixed {
  background: var(--vp-c-bg);
}

.bidi-playground__label {
  display: block;
  margin-bottom: 16px;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 700;
}

.bidi-playground__column p {
  min-height: 58px;
  margin: 0;
  padding: 14px 0;
  border-top: 1px dashed var(--vp-c-divider);
  font-size: 17px;
  line-height: 1.9;
}

.bidi-playground__column--fixed p {
  border-top-color: var(--vp-c-brand-soft);
}

.bidi-playground__note {
  margin: 12px 4px 0;
  color: var(--vp-c-text-3);
  font-size: 12px;
}

@media (max-width: 640px) {
  .bidi-playground {
    padding: 0 12px;
  }

  .bidi-playground__grid {
    grid-template-columns: 1fr;
  }

  .bidi-playground__column + .bidi-playground__column {
    border-inline-start: 0;
    border-top: 1px solid var(--vp-c-divider);
  }
}
</style>
