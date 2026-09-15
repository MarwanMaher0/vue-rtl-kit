<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  BidiText,
  RtlProvider,
  isolateRuns,
  splitBidiRuns,
  useDirection,
  useFormat,
  useLogicalStyles,
  vRtl,
} from 'vue-rtl-kit'
import CompareCard from './components/CompareCard.vue'
import DemoSection from './components/DemoSection.vue'
import ProfileCard from './components/ProfileCard.vue'

const { dir, isRtl, locale, setDirection, setLocale } = useDirection()
const { sign, startSide, toLogical } = useLogicalStyles()
const fmt = useFormat()

/** Real strings that break. Each one is a bug somebody has shipped. */
const samples = [
  { label: 'Hyphenated date', text: 'آخر تحديث للمستند 12-05-2024 بواسطة الفريق' },
  { label: 'Version + package', text: 'حدّث الحزمة إلى vue-rtl-kit v1.2.3 قبل النشر' },
  { label: 'Phone number', text: 'للاستفسار اتصل على 010 2345 6789 من التاسعة صباحًا' },
  { label: 'URL with path', text: 'التفاصيل على example.com/ar/docs/setup في قسم الإعداد' },
  { label: 'Order reference', text: 'رقم الطلب #4821-B تم شحنه عبر DHL-EG اليوم' },
  { label: 'Range + unit', text: 'المدة المتوقعة 3-5 أيام عمل داخل القاهرة' },
]

const shellSnippet = `$ git checkout -b feature/rtl-support\n$ npm run build -- --mode=production`

const hebrew = 'הגרסה האחרונה היא v2.0.1 מתאריך 12-05-2024'

const locales = [
  { tag: 'ar-EG', label: 'العربية' },
  { tag: 'he-IL', label: 'עברית' },
  { tag: 'en-GB', label: 'English' },
]

const numberingSystem = ref<'latn' | 'arab'>('arab')
const indent = ref(40)

/** A style that has to be computed in JS - the case logical CSS cannot cover. */
const computedStyle = computed(() =>
  toLogical({ marginLeft: `${indent.value}px`, borderLeft: '3px solid #6ea8fe', paddingLeft: '12px' }),
)

const dragTransform = computed(() => `translateX(${indent.value * sign.value}px)`)

const runs = computed(() => splitBidiRuns(samples[0]!.text, dir.value))

const utilities = [
  ['.ms-4 / .me-4', 'margin-inline-start / -end'],
  ['.ps-4 / .pe-4', 'padding-inline-start / -end'],
  ['.text-start / .text-end', 'text-align: start / end'],
  ['.start-0 / .end-0', 'inset-inline-start / -end'],
  ['.border-s / .border-e', 'border-inline-start / -end'],
  ['.rounded-s / .rounded-e', 'flow-relative corner radii'],
  ['.float-start / .float-end', 'float: inline-start / -end'],
  ['.bidi-isolate', 'unicode-bidi: isolate'],
  ['.bidi-plaintext', 'unicode-bidi: plaintext'],
  ['.rtl-flip', 'mirror a directional glyph in RTL'],
  ['.rtl-only / .ltr-only', 'show in one direction only'],
  ['.ms-auto / .me-auto', 'push to the inline end / start'],
]

const cardCopy = {
  'ar-EG': { name: 'مروان ماهر', role: 'مطوّر واجهات', action: 'عرض', meta: 'المشاهدات' },
  'he-IL': { name: 'דנה לוי', role: 'מפתחת ממשקים', action: 'הצג', meta: 'צפיות' },
  'en-GB': { name: 'Marwan Maher', role: 'Front-end engineer', action: 'View', meta: 'Impressions' },
} as const

const activeCopy = computed(() => cardCopy[locale.value as keyof typeof cardCopy] ?? cardCopy['en-GB'])
</script>

<template>
  <div class="page">
    <!-- Page chrome is English prose: pinned LTR with the directive, while the
         demo surfaces below follow the live document direction. -->
    <header v-rtl:ltr class="hero">
      <div class="hero__bar">
        <div class="brand">
          <span class="brand__mark">&#8596;</span>
          <div>
            <h1 class="brand__name">vue-rtl-kit</h1>
            <p class="brand__tag">Vue 3 + Nuxt toolkit for real right-to-left support</p>
          </div>
        </div>

        <div class="controls">
          <div class="seg" role="group" aria-label="Locale">
            <button
              v-for="item in locales"
              :key="item.tag"
              class="seg__btn"
              :class="{ 'seg__btn--on': locale === item.tag }"
              @click="setLocale(item.tag)"
            >{{ item.label }}</button>
          </div>

          <div class="seg" role="group" aria-label="Direction">
            <button
              class="seg__btn"
              :class="{ 'seg__btn--on': !isRtl }"
              @click="setDirection('ltr')"
            >LTR</button>
            <button
              class="seg__btn"
              :class="{ 'seg__btn--on': isRtl }"
              @click="setDirection('rtl')"
            >RTL</button>
          </div>

          <code class="state mono">
            &lt;html dir="{{ dir }}" lang="{{ locale }}"&gt;
          </code>
        </div>
      </div>

      <p class="hero__lede">
        Direction is not a stylesheet flip. This page is the test: every section below is
        rendered by the library, and every control changes the live direction of the document.
      </p>
    </header>

    <main class="page__main">
      <!-- 01 ------------------------------------------------------------ -->
      <DemoSection
        id="bidi"
        index="01"
        title="Mixed-direction text"
        api="&lt;BidiText&gt;"
        lede="Inside an Arabic paragraph the browser resolves hyphens, dots, slashes and spaces against the paragraph direction. The data is correct; the rendering is not. Compare the two columns - the strings are byte-for-byte identical."
      >
        <div class="grid grid--2">
          <CompareCard label="Raw text" tone="bad" note="the bug">
            <ul class="samples">
              <li v-for="sample in samples" :key="sample.label">
                <span class="samples__label">{{ sample.label }}</span>
                <BidiText as="p" class="samples__text" :text="sample.text" :enabled="false" />
              </li>
            </ul>
          </CompareCard>

          <CompareCard label="&lt;BidiText&gt;" tone="good" note="the fix">
            <ul class="samples">
              <li v-for="sample in samples" :key="sample.label">
                <span class="samples__label">{{ sample.label }}</span>
                <BidiText as="p" class="samples__text" :text="sample.text" />
              </li>
            </ul>
          </CompareCard>
        </div>

        <div class="grid grid--2 mt">
          <CompareCard label="Hebrew, raw" tone="bad">
            <BidiText as="p" class="samples__text" dir="rtl" :text="hebrew" :enabled="false" />
          </CompareCard>
          <CompareCard label="Hebrew, isolated" tone="good">
            <BidiText as="p" class="samples__text" dir="rtl" :text="hebrew" />
          </CompareCard>
        </div>

        <details v-rtl:ltr class="reveal">
          <summary>How the first sample is split</summary>
          <div class="runs">
            <span
              v-for="(run, i) in runs"
              :key="i"
              class="runs__chip"
              :class="{ 'runs__chip--iso': run.isolated }"
              :dir="run.dir"
            >{{ run.text }}<small>{{ run.isolated ? `isolate ${run.dir}` : run.dir }}</small></span>
          </div>
          <pre class="code" v-rtl:ltr><code>{{ isolateRuns(samples[0]!.text, dir).replace(/⁦/g, '⟦LRI⟧').replace(/⁩/g, '⟦PDI⟧') }}</code></pre>
        </details>
      </DemoSection>

      <!-- 02 ------------------------------------------------------------ -->
      <DemoSection
        id="mirror"
        index="02"
        title="Side-by-side LTR / RTL"
        api="logical utilities"
        lede="The same component, the same markup, two directions. Spacing, borders, radii, the gradient and the arrow all mirror because they are written in logical properties - there is not a single [dir='rtl'] override in the component."
      >
        <div class="grid grid--2">
          <CompareCard label="dir=&quot;ltr&quot;" tone="neutral" note="English">
            <RtlProvider dir="ltr" locale="en-GB" tag="div">
              <ProfileCard :copy="cardCopy['en-GB']" />
            </RtlProvider>
          </CompareCard>
          <CompareCard label="dir=&quot;rtl&quot;" tone="neutral" note="العربية">
            <RtlProvider dir="rtl" locale="ar-EG" tag="div">
              <ProfileCard :copy="cardCopy['ar-EG']" />
            </RtlProvider>
          </CompareCard>
        </div>
        <p v-rtl:ltr class="hint">
          The card below follows the page direction, currently
          <code>{{ dir }}</code> - inline-start resolves to <code>{{ startSide }}</code>.
        </p>
        <ProfileCard :copy="activeCopy" />
      </DemoSection>

      <!-- 03 ------------------------------------------------------------ -->
      <DemoSection
        id="scope"
        index="03"
        title="Scoping a subtree"
        api="&lt;RtlProvider&gt; / v-rtl"
        lede="An RTL page is never entirely RTL. Code samples, file paths, log output and API keys are LTR content living inside it, and without a direction of their own their punctuation drifts to the wrong end."
      >
        <div class="grid grid--2">
          <CompareCard label="Inherits the page direction" tone="bad">
            <pre class="code"><code>{{ shellSnippet }}</code></pre>
          </CompareCard>
          <CompareCard label="&lt;RtlProvider dir=&quot;ltr&quot; tag=&quot;pre&quot;&gt;" tone="good">
            <RtlProvider dir="ltr" tag="pre" class="code"><code>{{ shellSnippet }}</code></RtlProvider>
          </CompareCard>
        </div>

        <div class="grid grid--2 mt">
          <CompareCard label="v-rtl:ltr on a path" tone="good">
            <p class="samples__text">
              الملف موجود في <code v-rtl:ltr class="inline-code">/var/log/app/error-2024-05-12.log</code> على الخادم.
            </p>
          </CompareCard>
          <CompareCard label="Nested scope, local toggle" tone="neutral">
            <RtlProvider v-slot="{ dir: scopeDir, isRtl: scopeRtl, toggleDirection }" dir="ltr">
              <div class="scope">
                <button class="btn" @click="toggleDirection()">
                  flip this box &#8594; {{ scopeRtl ? 'ltr' : 'rtl' }}
                </button>
                <p class="samples__text">
                  Scope is <code>{{ scopeDir }}</code>, page is <code>{{ dir }}</code>.
                </p>
              </div>
            </RtlProvider>
          </CompareCard>
        </div>
      </DemoSection>

      <!-- 04 ------------------------------------------------------------ -->
      <DemoSection
        id="styles"
        index="04"
        title="Styles computed in JavaScript"
        api="useLogicalStyles()"
        lede="Anything you can express in a stylesheet should stay there. This is for the rest: a drag delta, a popover offset, a transform built from props - values that only exist at runtime."
      >
        <label class="slider">
          <span>offset</span>
          <input v-model.number="indent" type="range" min="0" max="120">
          <output class="mono">{{ indent }}px</output>
        </label>

        <div class="grid grid--2 mt">
          <CompareCard label="toLogical({ marginLeft })" tone="good">
            <div :style="computedStyle" class="swatch">
              marginInlineStart: {{ indent }}px
            </div>
            <pre class="code code--sm" v-rtl:ltr><code>{{ JSON.stringify(computedStyle, null, 2) }}</code></pre>
          </CompareCard>

          <CompareCard label="translateX(offset * sign)" tone="good">
            <div class="track">
              <span class="dot" :style="{ transform: dragTransform }" />
            </div>
            <pre class="code code--sm" v-rtl:ltr><code>sign = {{ sign }}
transform: {{ dragTransform }}</code></pre>
          </CompareCard>
        </div>
      </DemoSection>

      <!-- 05 ------------------------------------------------------------ -->
      <DemoSection
        id="format"
        index="05"
        title="Numbers, dates and currency"
        api="useFormat() / formatNumber()"
        lede="Arabic locales default to Arabic-Indic digits. Plenty of Arabic products want Western digits for figures, IDs and versions - that is a numbering-system option, not a string replace."
      >
        <div class="seg seg--inline">
          <button
            class="seg__btn"
            :class="{ 'seg__btn--on': numberingSystem === 'arab' }"
            @click="numberingSystem = 'arab'"
          >nu-arab &#1633;&#1634;&#1635;</button>
          <button
            class="seg__btn"
            :class="{ 'seg__btn--on': numberingSystem === 'latn' }"
            @click="numberingSystem = 'latn'"
          >nu-latn 123</button>
        </div>

        <table class="table mt">
          <thead>
            <tr><th>Helper</th><th>Output</th></tr>
          </thead>
          <tbody>
            <tr>
              <td class="mono">formatNumber(48210.5)</td>
              <td><BidiText :text="fmt.formatNumber(48210.5, { numberingSystem })" /></td>
            </tr>
            <tr>
              <td class="mono">formatCurrency(2500, 'EGP')</td>
              <td><BidiText :text="fmt.formatCurrency(2500, 'EGP', { numberingSystem })" /></td>
            </tr>
            <tr>
              <td class="mono">formatNumber(0.256, percent)</td>
              <td><BidiText :text="fmt.formatNumber(0.256, { numberingSystem, style: 'percent', maximumFractionDigits: 1 })" /></td>
            </tr>
            <tr>
              <td class="mono">formatDate(…, dateStyle: 'long')</td>
              <td><BidiText :text="fmt.formatDate(new Date(2024, 4, 12), { numberingSystem, dateStyle: 'long' })" /></td>
            </tr>
            <tr>
              <td class="mono">formatDate(…, islamic-umalqura)</td>
              <td><BidiText :text="fmt.formatDate(new Date(2024, 4, 12), { numberingSystem, calendar: 'islamic-umalqura', dateStyle: 'long' })" /></td>
            </tr>
          </tbody>
        </table>
      </DemoSection>

      <!-- 06 ------------------------------------------------------------ -->
      <DemoSection
        id="css"
        index="06"
        title="CSS utilities"
        api="vue-rtl-kit/styles.css"
        lede="Plain CSS - no preprocessor, no PostCSS plugin, no direction-specific override blocks. Every rule is written in logical properties, so the browser resolves it from the nearest dir attribute."
      >
        <ul v-rtl:ltr class="utils">
          <li v-for="[name, meaning] in utilities" :key="name">
            <code>{{ name }}</code>
            <span>{{ meaning }}</span>
          </li>
        </ul>

        <div class="demo-row mt">
          <span class="chip ms-4"><span dir="ltr">.ms-4</span></span>
          <span class="chip me-4"><span dir="ltr">.me-4</span></span>
          <span class="chip border-s ps-3"><span dir="ltr">.border-s .ps-3</span></span>
          <span class="chip ms-auto"><span dir="ltr">.ms-auto</span></span>
        </div>
      </DemoSection>
    </main>

    <footer class="foot">
      <span>MIT licensed &middot; no runtime dependencies beyond Vue</span>
      <code class="mono">npm i vue-rtl-kit</code>
    </footer>
  </div>
</template>

<style scoped>
.page {
  max-inline-size: 1080px;
  margin-inline: auto;
  padding-inline: 1.5rem;
  padding-block-end: 3rem;
}

/* ------------------------------------------------------------------ hero */

.hero { padding-block: 2.25rem 1.75rem; }

.hero__bar {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  align-items: center;
  justify-content: space-between;
}

.brand { display: flex; align-items: center; gap: 0.8rem; }

.brand__mark {
  inline-size: 40px;
  block-size: 40px;
  display: grid;
  place-items: center;
  border-radius: 11px;
  background: linear-gradient(140deg, var(--accent), #a78bfa);
  color: #0f1115;
  font-size: 1.2rem;
  font-weight: 700;
}

.brand__name { font-size: 1.4rem; letter-spacing: -0.02em; }
.brand__tag { margin: 0.1rem 0 0; color: var(--ink-dim); font-size: 0.85rem; }

.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 0.6rem; }

.seg {
  display: inline-flex;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 3px;
  gap: 2px;
}

.seg--inline { margin-block-start: 0.25rem; }

.seg__btn {
  border: 0;
  background: transparent;
  color: var(--ink-dim);
  padding: 0.3rem 0.7rem;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
}

.seg__btn--on { background: var(--accent-soft); color: var(--accent); }

.state {
  font-size: 0.75rem;
  color: var(--ink-faint);
  border: 1px dashed var(--line);
  border-radius: 8px;
  padding: 0.35rem 0.6rem;
  unicode-bidi: isolate;
}

.hero__lede {
  margin: 1.25rem 0 0;
  color: var(--ink-dim);
  max-width: 76ch;
  font-size: 0.95rem;
}

/* --------------------------------------------------------------- layout */

.grid { display: grid; gap: 1rem; }
.grid--2 { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
.mt { margin-block-start: 1rem; }

.hint { color: var(--ink-faint); font-size: 0.85rem; margin: 1.1rem 0 0.6rem; }
.hint code, .inline-code { color: var(--accent); font-family: var(--font-mono); font-size: 0.85em; }

/* -------------------------------------------------------------- samples */

.samples { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.85rem; }
.samples__label {
  display: block;
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-faint);
}
.samples__text { margin: 0.15rem 0 0; font-size: 1rem; }

/* ----------------------------------------------------------------- runs */

.reveal {
  margin-block-start: 1.1rem;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--panel);
  padding: 0.75rem 1rem;
}

.reveal summary { cursor: pointer; color: var(--ink-dim); font-size: 0.85rem; }

.runs { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-block-start: 0.85rem; }

.runs__chip {
  border: 1px solid var(--line);
  border-radius: 7px;
  padding: 0.3rem 0.55rem;
  background: var(--panel-2);
  font-size: 0.9rem;
  display: inline-flex;
  flex-direction: column;
  gap: 0.15rem;
}

.runs__chip small { color: var(--ink-faint); font-size: 0.62rem; letter-spacing: 0.04em; }
.runs__chip--iso { border-color: rgba(110, 168, 254, 0.45); background: var(--accent-soft); }

/* ----------------------------------------------------------------- code */

.code {
  margin: 0;
  background: #0b0d12;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 0.75rem 0.9rem;
  font-size: 0.8rem;
  line-height: 1.7;
  overflow-x: auto;
  color: #c9d3e6;
  unicode-bidi: isolate;
}

.code--sm { margin-block-start: 0.75rem; font-size: 0.72rem; }

/* ---------------------------------------------------------------- misc */

.btn {
  background: var(--panel-2);
  border: 1px solid var(--line);
  color: var(--ink);
  border-radius: 7px;
  padding: 0.35rem 0.7rem;
  font-size: 0.8rem;
  cursor: pointer;
}

.scope { display: flex; flex-direction: column; gap: 0.6rem; align-items: flex-start; }

.slider { display: flex; align-items: center; gap: 0.8rem; color: var(--ink-dim); font-size: 0.85rem; }
.slider input { flex: 1; max-inline-size: 320px; accent-color: var(--accent); }
.slider output { color: var(--accent); font-size: 0.8rem; }

.swatch {
  background: var(--panel-2);
  border-radius: 6px;
  padding: 0.6rem 0.75rem;
  font-size: 0.82rem;
  color: var(--ink-dim);
}

.track {
  position: relative;
  block-size: 34px;
  border-radius: 8px;
  background: var(--panel-2);
  border: 1px solid var(--line);
}

.dot {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: 8px;
  margin-block-start: -7px;
  inline-size: 14px;
  block-size: 14px;
  border-radius: 50%;
  background: var(--accent);
  transition: transform 0.12s ease-out;
}

.table { inline-size: 100%; border-collapse: collapse; font-size: 0.88rem; }
.table th {
  text-align: start;
  color: var(--ink-faint);
  font-weight: 500;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding-block-end: 0.5rem;
  border-block-end: 1px solid var(--line);
}
.table td { padding-block: 0.55rem; border-block-end: 1px solid var(--line-soft); }
.table td:first-child { color: var(--ink-dim); font-size: 0.78rem; padding-inline-end: 1.5rem; }

.utils { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.4rem 1.5rem; grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); }
.utils li { display: flex; gap: 0.7rem; align-items: baseline; font-size: 0.85rem; border-block-end: 1px solid var(--line-soft); padding-block: 0.35rem; }
.utils code { color: var(--accent); font-family: var(--font-mono); font-size: 0.78rem; white-space: nowrap; }
.utils span { color: var(--ink-dim); font-size: 0.8rem; }

.demo-row { display: flex; align-items: center; background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 0.7rem; gap: 0.15rem; }
.chip { background: var(--panel-2); border: 1px solid var(--line); border-radius: 6px; padding: 0.25rem 0.55rem; font-size: 0.75rem; font-family: var(--font-mono); color: var(--ink-dim); }

.foot {
  border-top: 1px solid var(--line);
  margin-block-start: 2rem;
  padding-block-start: 1.25rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: space-between;
  color: var(--ink-faint);
  font-size: 0.82rem;
}

.foot code { color: var(--accent); }
</style>
