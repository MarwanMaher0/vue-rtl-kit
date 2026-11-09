# Common RTL bugs in Vue apps and how to fix them

Practical, reproducible bugs that show up when a Vue 3 or Nuxt UI is switched to Arabic (`ar`),
Hebrew (`he`) or Persian (`fa`) — and the smallest fix for each. Every bug below follows the same
pattern: a minimal broken snippet, why it breaks, a fix in plain CSS/Vue, and then the same fix with
[vue-rtl-kit](../README.md). The vue-rtl-kit snippets use only APIs exported from `src/`:
`createRtl`, `useDirection`, `useLogicalStyles`, `useFormat`, `BidiText`, `RtlProvider`, the `v-rtl`
directive, the string helpers `isolate` / `isolateRuns` / `transliterateDigits`, and the classes in
`vue-rtl-kit/styles.css`.

You do not need the library for most of these fixes. Logical CSS properties and `<bdi>` are native.
The library earns its place where the value is computed in JavaScript, where mixed-direction text has
to be isolated at runtime, and where direction has to survive SSR.

## Setup used by the vue-rtl-kit examples

Install once (see the [README](../README.md#install) for the current install command), then either:

```ts
// Plain Vue — main.ts
import { createApp } from 'vue'
import { createRtl } from 'vue-rtl-kit'
import 'vue-rtl-kit/styles.css'
import App from './App.vue'

const rtl = createRtl({
  locales: { en: 'ltr', ar: 'rtl', he: 'rtl', fa: 'rtl' },
  defaultLocale: 'ar',
})

createApp(App).use(rtl).mount('#app')
```

```ts
// Nuxt — nuxt.config.ts. The module registers the plugin, auto-imports
// useDirection / useRtl / useLogicalStyles / useFormat, registers
// <BidiText> and <RtlProvider>, and injects the stylesheet.
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: ['vue-rtl-kit/nuxt'],
  rtl: {
    locales: { en: 'ltr', ar: 'rtl', he: 'rtl', fa: 'rtl' },
    defaultLocale: 'ar',
  },
})
```

`createRtl` also registers `<BidiText>`, `<RtlProvider>` and `v-rtl` globally in a plain Vue app,
and the Nuxt module registers and auto-imports them too. The snippets below still import every
component, directive and composable they use, so each one compiles on its own and you can see
where every name comes from.

To reproduce any bug here: render the broken snippet in a page whose `<html>` (or nearest wrapper)
has `dir="rtl"` and an Arabic, Hebrew or Persian locale, then compare with `dir="ltr"`. Most of them
are invisible in an LTR-only test pass, which is exactly how they ship.

---

## 1. Physical CSS properties that do not flip

### Broken

```vue
<template>
  <article class="card">
    <span class="badge">جديد</span>
    <h3>عنوان البطاقة</h3>
    <p>نص البطاقة…</p>
  </article>
</template>

<style scoped>
.card {
  position: relative;
  margin-left: 1rem;
  padding-right: 0.75rem;
  text-align: left;
  border-left: 3px solid currentColor;
  border-top-left-radius: 12px;
}
.badge {
  position: absolute;
  left: 0.5rem;
  top: 0.5rem;
}
</style>
```

In RTL the card keeps its left margin, left border and rounded top-left corner, the text stays
left-aligned, and the badge stays in the top-left — the layout is mirrored nowhere except where
flex/grid happened to do it for you.

**Why it breaks:** `dir="rtl"` changes the inline direction used for text and flow layout, but it
never rewrites physical properties: `margin-left` means the physical left in every direction.

### Fix — plain CSS

Write the direction-sensitive properties in logical (flow-relative) form. The browser resolves
`inline-start` to the right in RTL and to the left in LTR, so one rule serves both directions and a
runtime direction flip needs no stylesheet swap:

```css
.card {
  position: relative;
  margin-inline-start: 1rem;
  padding-inline-end: 0.75rem;
  text-align: start;
  border-inline-start: 3px solid currentColor;
  border-start-start-radius: 12px;
}
.badge {
  position: absolute;
  inset-inline-start: 0.5rem;
  inset-block-start: 0.5rem;
}
```

The mapping worth memorising:

| Physical | Logical |
| --- | --- |
| `margin-left` / `margin-right` | `margin-inline-start` / `margin-inline-end` |
| `padding-left` / `padding-right` | `padding-inline-start` / `padding-inline-end` |
| `left` / `right` (positioning) | `inset-inline-start` / `inset-inline-end` |
| `text-align: left` / `right` | `text-align: start` / `end` |
| `border-left` / `border-right` | `border-inline-start` / `border-inline-end` |
| `border-top-left-radius` | `border-start-start-radius` |
| `border-top-right-radius` | `border-start-end-radius` |
| `border-bottom-left-radius` | `border-end-start-radius` |
| `border-bottom-right-radius` | `border-end-end-radius` |
| `float: left`, `clear: right`, `width`, `top` | `float: inline-start`, `clear: inline-end`, `inline-size`, `inset-block-start` |

Keep physical properties when the meaning really is physical — a map pin at `left: 40%`, say. The
bug is using them for "the side where reading starts".

### Fix — vue-rtl-kit

For styles that only exist as a Vue `:style` binding (computed from props, a drag state, a design
token object), `useLogicalStyles().toLogical()` rewrites the object for you:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useLogicalStyles } from 'vue-rtl-kit'

const { toLogical } = useLogicalStyles()

// Direction-agnostic: the browser resolves the logical properties, so this
// object is correct in both directions and never needs recomputing on a flip.
const cardStyle = computed(() => toLogical({
  position: 'relative',
  marginLeft: '1rem',
  paddingRight: '0.75rem',
  textAlign: 'left',
  borderLeft: '3px solid currentColor',
  borderTopLeftRadius: '12px',
}))
// => { position: 'relative', marginInlineStart: '1rem', paddingInlineEnd: '0.75rem',
//      textAlign: 'start', borderInlineStart: '3px solid currentColor',
//      borderStartStartRadius: '12px' }

const badgeStyle = computed(() => toLogical({
  position: 'absolute',
  left: '0.5rem',
  top: '0.5rem',
}))
// => { position: 'absolute', insetInlineStart: '0.5rem', insetBlockStart: '0.5rem' }
</script>

<template>
  <article class="card" :style="cardStyle">
    <span class="badge" :style="badgeStyle">جديد</span>
    <h3>عنوان البطاقة</h3>
    <p>نص البطاقة…</p>
  </article>
</template>
```

`toLogical` also maps `borderLeft` → `borderInlineStart`, `right` → `insetInlineEnd`, the scroll
margin/padding properties and the directional values of `float`, `clear`, `caption-side` and
`resize`; pass `{ size: true }` if you also want `width`/`height` mapped to
`inlineSize`/`blockSize`. If the value never leaves the stylesheet, skip the JavaScript entirely:
`vue-rtl-kit/styles.css` (already imported in the setup above) ships the same idea as utility
classes — `ms-4`, `pe-3`, `ps-3`, `text-start`, `start-0`, `border-s`, `rounded-s`, and friends.

---

## 2. Icons and chevrons that must mirror — and ones that must not

### Broken

```vue
<script setup lang="ts">
const emit = defineEmits<{ next: [] }>()
const next = () => emit('next')
</script>

<template>
  <!-- attempt #1: no RTL handling -->
  <button type="button" @click="next">
    التالي <span aria-hidden="true">→</span>
  </button>

  <!-- attempt #2: mirror the world -->
  <button type="button" @click="next">
    التالي <span class="flipped" aria-hidden="true">→</span>
  </button>
  <img class="flipped" src="/logo.svg" alt="الشعار">
  <span class="flipped" aria-hidden="true">✓</span>
</template>

<style scoped>
.flipped { display: inline-block; }
[dir="rtl"] .flipped { transform: scaleX(-1); }
</style>
```

Attempt #1 keeps the "next" arrow pointing right in RTL, where forward is to the left — the button
visually says "back". Attempt #2 fixes the arrow and breaks the logo and the checkmark, which now
read as mirrored glyphs.

**Why it breaks:** some glyphs are *directional* — their meaning is "towards the start/end of the
line" — and some are *absolute*. CSS has no way to know which kind an icon is; `dir` never flips
icon fonts or SVGs by itself.

### Fix — plain CSS

Classify each icon once, then flip only the directional class:

```vue
<script setup lang="ts">
const emit = defineEmits<{ next: [] }>()
const next = () => emit('next')
</script>

<template>
  <button type="button" @click="next">
    التالي <span class="icon-directional" aria-hidden="true">→</span>
  </button>
  <img src="/logo.svg" alt="الشعار">
  <span aria-hidden="true">✓</span>
</template>

<style scoped>
.icon-directional { display: inline-block; } /* transforms skip plain inline boxes */
[dir="rtl"] .icon-directional { transform: scaleX(-1); }
</style>
```

| Mirror in RTL | Never mirror |
| --- | --- |
| back / forward chevrons and arrows (`→`) | logos and brand marks |
| "next / previous" pagination arrows | checkmarks (`✓`), close (`✕`), plus/minus |
| send icons (paper planes), reply/forward arrows | clocks, calendars, magnifying glasses |
| undo / redo arrows | play buttons (media convention points right in RTL too) |
| breadcrumb separators that are chevrons | charts, maps, and anything depicting a real object |

Characters that are already `Bidi_Mirrored` — `‹ ›`, `( )`, `« »` — are mirrored by the browser
itself in RTL, so they must **not** get `.rtl-flip`: `scaleX(-1)` would flip them back to their LTR
shape. Only flip glyphs and SVGs that have no mirrored form of their own, such as `→`.

Three practical notes. `transform` does not apply to a plain inline box, so a glyph in a `<span>`
needs `display: inline-block` before it can flip; `<svg>` and `<img>` flip as they are. If an icon
already carries a `transform` (rotation for an expand/collapse state, say), wrap it in an
inline-block `<span>` and flip the wrapper so the two transforms do not overwrite each other. And a flipped icon that conveys meaning still needs an accessible name on the control itself
— `aria-hidden="true"` on the glyph, a real label on the button.

### Fix — vue-rtl-kit

`vue-rtl-kit/styles.css` already contains exactly that rule, plus an opt-out for nested content:

```vue
<script setup lang="ts">
const emit = defineEmits<{ next: [] }>()
const next = () => emit('next')
</script>

<template>
  <button type="button" @click="next">
    التالي
    <!-- the class goes on the <svg> itself: transforms skip plain inline spans -->
    <svg class="rtl-flip" viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round"
      />
    </svg>
  </button>

  <!-- logo, checkmark: no class, no flip -->
  <img src="/logo.svg" alt="الشعار">
  <span aria-hidden="true">✓</span>
</template>
```

`.rtl-flip` applies `scale: -1 1` only when the element's own direction is RTL
(`.rtl-flip:dir(rtl)`), and `.rtl-noflip` inside a flipped subtree cancels it again for a child
that must stay put. Because the mirror uses the independent `scale` property, it composes with a
`transform` the element already carries instead of overwriting it. `:dir()` matches the
element's own direction — the direction in force from the nearest `dir` — so a flipped icon
inside a nested `dir="ltr"` island on an RTL page is not mirrored, and one inside an RTL island
inside that is. Like any transform, the mirror has no effect on a plain inline `<span>` — put it
on the `<svg>`/`<img>`, or give the wrapper `display: inline-block`. Nothing else in the
stylesheet touches your icons — the classification in the table above is still yours to make.

---

## 3. Latin runs breaking inside RTL text: emails, URLs, codes, numbers with units

### Broken

```vue
<script setup lang="ts">
const docsUrl = 'example.com/ar/'
const orderCode = '4821-B'
const weight = '10-20 kg'
const updatedAt = '12-05-2024'
const phone = '+1 555-0100'

const email = 'support@example.com'
const sku = 'SKU-4821-B'
const pricingUrl = 'example.com/ar/pricing'
const size = '2.5 kg'
</script>

<template>
  <!-- rendered in an Arabic page with dir="rtl" -->
  <p>زر {{ docsUrl }} للتفاصيل</p>
  <p>رمز الطلب {{ orderCode }} جاهز</p>
  <p>الوزن {{ weight }} تقريبًا</p>
  <p>آخر تحديث {{ updatedAt }}</p>
  <p>للدعم اتصل على {{ phone }}</p>

  <!-- look-alikes that render correctly -->
  <p>راسلنا على {{ email }}</p>
  <p>المنتج {{ sku }} متوفر</p>
  <p>الأسعار في {{ pricingUrl }}</p>
  <p>الحجم {{ size }}</p>
</template>
```

Read left to right, the browser draws the first five values as `/example.com/ar`, `B-4821`,
`kg 20-10`, `2024-05-12` and `0100-555 1+`: the URL's trailing slash jumps to its front, the code
and the weight range swap ends, the date reverses, and the phone number falls apart. The strings in
your data are correct; only the pixels are wrong. The last four lines are *not* broken:
`support@example.com`, `SKU-4821-B` and `example.com/ar/pricing` keep their order because every
separator in them sits between Latin letters or digits, and `2.5 kg` displays as `kg 2.5`, which is
the correct RTL reading order. (An email address does break while it is being typed into an RTL
field — see §5.)

**Why it breaks:** the bidi algorithm gives a neutral character (space, `-`, `/`, `+`) the direction
of its neighbours and counts numbers as right-to-left for that, so in an RTL paragraph a neutral
next to a number, or on the edge of a Latin run beside Arabic text, is drawn on the RTL side. After
an Arabic letter, digits also become Arabic numbers (rule W2), which only `:` `.` `,` `/` join
(rule W4), so the `-` in `12-05-2024` and `10-20 kg` splits the value too.

### Fix — plain Vue

Isolate each foreign run so the algorithm resolves it on its own. `<bdi>` is the DOM form of a
Unicode isolate; adding `dir="ltr"` states the run's own direction explicitly:

```vue
<script setup lang="ts">
const docsUrl = 'example.com/ar/'
const orderCode = '4821-B'
const weight = '10-20 kg'
const updatedAt = '12-05-2024'
const phone = '+1 555-0100'
</script>

<template>
  <p>زر <bdi dir="ltr">{{ docsUrl }}</bdi> للتفاصيل</p>
  <p>رمز الطلب <bdi dir="ltr">{{ orderCode }}</bdi> جاهز</p>
  <p>الوزن <bdi dir="ltr">{{ weight }}</bdi> تقريبًا</p>
  <p>آخر تحديث <bdi dir="ltr">{{ updatedAt }}</bdi></p>
  <p>للدعم اتصل على <bdi dir="ltr">{{ phone }}</bdi></p>
</template>
```

Each value now renders exactly as typed.

The equivalent without an element is a span carrying `unicode-bidi: isolate` in CSS — useful
inside components that render their children into a single text node. An element that already has
a `dir` attribute needs no help: the HTML UA stylesheet already gives `[dir]` elements
`unicode-bidi: isolate`, so a `span dir="ltr"` is already isolated. Explicit
`unicode-bidi: isolate` only earns its place on elements *without* a `dir`, or where direction is
being set from CSS alone.

### Fix — vue-rtl-kit

Wrapping every interpolation by hand is how this bug comes back: someone adds a field and forgets.
`<BidiText>` takes the whole sentence, splits it into directional runs, and isolates only the runs
that would actually move:

```vue
<script setup lang="ts">
import { BidiText } from 'vue-rtl-kit'

const message = 'آخر تحديث 12-05-2024 — رمز الطلب 4821-B — الوزن 10-20 kg'

const docsUrl = 'example.com/ar/'
const phone = '+1 555-0100'
</script>

<template>
  <BidiText as="p" :text="message" />

  <!-- not fixed: the symbol on the edge of each token stays outside the isolate -->
  <BidiText as="p" :text="`زر ${docsUrl} للتفاصيل`" />
  <BidiText as="p" :text="`للدعم اتصل على ${phone}`" />
</template>
```

It renders `<bdi>` elements (`strategy="element"`, the default) so no control characters leak into
copied text, and the date, the code and the weight range in `message` all render as typed. The
last two lines show the shape it does not solve: the run splitter deliberately leaves boundary
characters outside the isolate, so the URL still renders as `/example.com/ar` and the phone number
as `1 555-0100+`. Isolate the whole token yourself there, either in markup with
`<bdi dir="ltr">` as in the plain fix, or, in a plain-string channel, with `isolate()`:

```ts
import { isolate } from 'vue-rtl-kit'

const docsUrl = 'example.com/ar/'
const phone = '+1 555-0100'
export const toast = `زر ${isolate(docsUrl)} أو اتصل على ${isolate(phone)}`
```

Two places elements cannot go — attributes and plain-string channels such as toasts — use the
string form with the current direction from `useDirection()`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { BidiText, isolateRuns, useDirection } from 'vue-rtl-kit'

const props = defineProps<{ message: string }>()
const { dir } = useDirection()

const tooltip = computed(() => isolateRuns(props.message, dir.value))
</script>

<template>
  <!-- BidiText has no `title` prop, so the attribute goes on the wrapper -->
  <p :title="tooltip">
    <BidiText :text="message" />
  </p>
</template>
```

If you are interpolating user-controlled text into a sentence you wrote, `<BidiText>` in the
template is the habit to build; reach for `isolateRuns` only when the destination is a string.

---

## 4. Punctuation jumping to the wrong side

### Broken

```vue
<script setup lang="ts">
const tool = 'C++'
const userName = 'John Smith'
const fileName = 'report-2024.pdf'
const languageName = 'English'
</script>

<template>
  <p>تم تثبيت {{ tool }} بنجاح</p>
  <p lang="he">הכלי {{ tool }} הותקן בהצלחה</p>

  <!-- these three render correctly -->
  <p>مرحبًا {{ userName }}!</p>
  <p>هل تريد حذف {{ fileName }}؟</p>
  <p>اللغة الإنجليزية ({{ languageName }})</p>
</template>
```

In the first two lines the `+` signs land on the wrong side of the `C`, in the Arabic and the
Hebrew sentence alike, so the tool reads as `++C`. The other marks stay put: the final `!`
resolves to the paragraph direction, `؟` (U+061F) is a strong Arabic character (class AL), and
`(English)` is resolved as a pair by rule N0.

**Why it breaks:** `+` is bidi class ES (European Separator), which only binds between digits, so
after the letter `C` it becomes a neutral; with Arabic or Hebrew on its other side, that neutral
takes the RTL paragraph direction and is drawn before the `C`.

### Fix — plain Vue

Put punctuation that belongs *to the inserted run* inside the isolate, so the run resolves it
against its own direction, and keep sentence punctuation *outside* the isolated run, written in
logical order (the order you would type it), so the paragraph owns it:

```vue
<script setup lang="ts">
const tool = 'C++'
const userName = 'John Smith'
const fileName = 'report-2024.pdf'
</script>

<template>
  <p>تم تثبيت <bdi dir="ltr">{{ tool }}</bdi> بنجاح</p>
  <p>مرحبًا <bdi dir="ltr">{{ userName }}</bdi>!</p>
  <p>هل تريد حذف <bdi dir="ltr">{{ fileName }}</bdi>؟</p>
</template>
```

The question to ask is always "whose punctuation is this — the sentence's, or the inserted run's?"
The `++` is part of the product name, so it goes inside; the `!` and `؟` end the Arabic sentence,
so they stay outside.

### Fix — vue-rtl-kit

For a value whose trailing symbols must travel with it, isolate the *whole inserted value* —
`isolate()` wraps it in `U+2068 FSI … U+2069 PDI`, and the `++` stays attached to the `C`:

```ts
import { isolate } from 'vue-rtl-kit'

const tool = 'C++'
export const toast = `تم تثبيت ${isolate(tool)} بنجاح`
```

In markup the equivalent is a `<bdi dir="ltr">` around the whole token, as in the plain fix. Do
not rely on `<BidiText>` alone for this shape: its run splitter isolates the `C` and deliberately
leaves the `++` outside the isolate, so the first line below still shows `++C`. That same
behaviour is right for sentence punctuation, which is why the trailing `!` / `؟` stay with the
sentence in the other two lines:

```vue
<script setup lang="ts">
import { BidiText } from 'vue-rtl-kit'

const tool = 'C++'
const userName = 'John Smith'
const fileName = 'report-2024.pdf'
</script>

<template>
  <BidiText as="p" :text="`تم تثبيت ${tool} بنجاح`" />
  <BidiText as="p" :text="`مرحبًا ${userName}!`" />
  <BidiText as="p" :text="`هل تريد حذف ${fileName}؟`" />
</template>
```

One warning that applies to every approach in this section: do not "fix" jumping punctuation by
reordering characters in the string, and do not sprinkle `U+200F` (RLM) marks through your data.
Both corrupt search, copy/paste and screen-reader output. Fix the *isolation*, never the data.

---

## 5. Mixed-direction user input in forms

### Broken

```vue
<script setup lang="ts">
import { ref } from 'vue'

const email = ref('name@') // half-typed, as it is mid-keystroke
const bio = ref('Hello!')
</script>

<template>
  <form>
    <label>
      البريد الإلكتروني
      <input v-model="email" type="email" placeholder="name@example.com">
    </label>
    <label>
      نبذة قصيرة
      <textarea v-model="bio" placeholder="اكتب نبذة…"></textarea>
    </label>
  </form>
</template>
```

In an RTL page both fields inherit `dir="rtl"`. While an address is being typed into the email
field, its trailing symbol jumps to the front: the half-typed `name@` displays as `@name` until the
next letter arrives. The bio has the same problem for anyone who writes in English: `Hello!`
displays as `!Hello`, right-aligned.

**Why it breaks:** form controls inherit the direction of the nearest `dir` attribute, and the bidi
algorithm applies inside the control exactly as it does in a paragraph. An email address is
intrinsically LTR content, while a bio is in whichever language its author types first.

### Fix — plain Vue

Give each control the direction of the *data it holds*, not of the page:

```vue
<script setup lang="ts">
import { ref } from 'vue'

const email = ref('name@')
const site = ref('')
const bio = ref('Hello!')
</script>

<template>
  <form>
    <label>
      البريد الإلكتروني
      <!-- known-LTR data: pin it, and let the placeholder follow -->
      <input
        v-model="email" type="email" dir="ltr" class="ltr-field"
        autocomplete="email" placeholder="name@example.com"
      >
    </label>
    <label>
      الموقع الإلكتروني
      <input v-model="site" type="url" dir="ltr" class="ltr-field" placeholder="https://example.com">
    </label>
    <label>
      نبذة قصيرة
      <!-- unknown data: the browser's first-strong-character rule decides -->
      <textarea v-model="bio" dir="auto" placeholder="اكتب نبذة…" />
    </label>
  </form>
</template>

<style scoped>
.ltr-field {
  text-align: left; /* inside a dir="ltr" control this is the inline start */
}
</style>
```

No `unicode-bidi: isolate` there, and none is needed: the control already carries `dir`, and
elements with a `dir` attribute are isolated by the UA stylesheet — adding the property to an
`<input>` that already has `dir` does nothing.

`dir="auto"` applies the same first-strong heuristic the browser uses for `dir="auto"` on any
element: the control adopts the direction of the first strong character typed, and the caret and
selection behave consistently from then on. Use it for names, bios, comments and search boxes; use
pinned `dir="ltr"` for email, URL, phone, password, code and file-path fields. Then *display* what
the user typed with the techniques from §3 — `<bdi>` around the value in read views — so a Latin
name stored from this form cannot break the Arabic sentence around it elsewhere in the app.

### Fix — vue-rtl-kit

The `v-rtl` directive sets `dir` reactively, restores the element's previous `dir` when the element
is removed, and — because it implements `getSSRProps` — the attribute is already in the
server-rendered HTML:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { vRtl } from 'vue-rtl-kit'

const email = ref('name@')
const bio = ref('Hello!')
</script>

<template>
  <form>
    <label>
      البريد الإلكتروني
      <input
        v-model="email" v-rtl:ltr type="email" autocomplete="email"
        placeholder="name@example.com"
      >
    </label>
    <label>
      نبذة قصيرة
      <textarea v-model="bio" v-rtl:auto placeholder="اكتب نبذة…"></textarea>
    </label>
  </form>
</template>
```

`v-rtl` with no argument means `dir="rtl"`; an argument pins a direction (`v-rtl:ltr`,
`v-rtl:auto`), and a string value is reactive (`v-rtl="fieldDir"`). The object form's
`isolate: true` or the `.isolate` modifier also writes an inline `unicode-bidi: isolate` — normally
redundant, since the UA stylesheet already isolates any element with `dir`, but it keeps the run
isolated if a reset such as `all: unset` has cleared that:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { vRtl } from 'vue-rtl-kit'

const branchName = ref('feature/rtl-forms')
const code = ref('AB-1234')
const fieldDir = ref<'ltr' | 'rtl' | 'auto'>('ltr')
</script>

<template>
  <p>الفرع الحالي: <span v-rtl.ltr.isolate>{{ branchName }}</span></p>
  <p>رمز التفعيل: <span v-rtl="{ dir: 'ltr', isolate: true }">{{ code }}</span></p>
  <input v-model="code" v-rtl="fieldDir">
</template>
```

---

## 6. Numbers and dates in the wrong numbering system

### Broken

```vue
<script setup lang="ts">
const total = 2500
const due = new Date(2024, 4, 12)
</script>

<template>
  <p>الإجمالي: {{ total }} EGP — يستحق في {{ due.toLocaleDateString('ar-EG') }}</p>
  <!-- the same screen in the Persian build -->
  <p lang="fa">سررسید: {{ due.toLocaleDateString('fa-IR') }}</p>
</template>
```

The raw interpolation prints `2500` with no grouping, `toLocaleDateString('ar-EG')` prints
`١٢‏/٥‏/٢٠٢٤` in Arabic-Indic digits, and `toLocaleDateString('fa-IR')` prints `۱۴۰۳/۲/۲۳`: Persian
digits *and* a date in the Persian calendar. The product spec said Western (`0123`) digits in the
Arabic build and the Gregorian calendar in every build.

**Why it breaks:** a locale tag carries numbering-system and calendar defaults you did not choose:
`ar-EG` defaults to `arab` digits (`٠١٢٣`), `fa-IR` to `arabext` digits (`۰۱۲۳`) and the `persian`
calendar, while bare `ar` defaults to `latn`. A raw interpolation bypasses `Intl` entirely, so it
gets neither grouping nor the digits you specified.

### Fix — plain Vue

State the numbering system and calendar explicitly through the `-u-nu-` locale extension and the
`calendar` option, and isolate the result where it meets the sentence:

```vue
<script setup lang="ts">
const due = new Date(2024, 4, 12)

const money = new Intl.NumberFormat('ar-EG-u-nu-latn', {
  style: 'currency',
  currency: 'EGP',
}).format(2500) // '‏2,500.00 ج.م.‏' with Western digits — see the note on the wrapping marks below

const dueText = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
  dateStyle: 'long',
  calendar: 'gregory',
}).format(due) // '12 مايو 2024'

// Persian build: Persian digits are fine, the Persian calendar is not.
const dueTextFa = new Intl.DateTimeFormat('fa-IR', {
  dateStyle: 'long',
  calendar: 'gregory',
}).format(due) // '۱۲ مهٔ ۲۰۲۴'
</script>

<template>
  <p>الإجمالي: <bdi>{{ money }}</bdi> — يستحق في <bdi>{{ dueText }}</bdi></p>
  <p lang="fa">سررسید: <bdi>{{ dueTextFa }}</bdi></p>
</template>
```

Keep the choice consistent per *kind of data*, not per page: prices and quantities in the chosen
system, but phone numbers, order IDs and version strings usually stay `latn` and isolated, because
users read them back over the phone and type them into other systems.

One invisible detail in that currency string: the real output is wrapped in U+200F RIGHT-TO-LEFT
MARK characters (`'\u200F2,500.00 ج.م.\u200F'`). They are deliberate — they anchor the LTR amount
inside RTL text — but they will fail a naive `expect(text).toBe('2,500.00 ج.م.')`, so compare
formatted money with the marks in the expectation (or strip bidi controls before comparing), and
never paste a formatted amount into a field that expects a parseable number.

### Fix — vue-rtl-kit

Configure the decision once, then let `useFormat()` bind every formatter to the current locale and
that numbering system. Switching the whole app from Arabic-Indic to Western digits becomes one
option, not a find-and-replace:

```ts
// main.ts (or the `rtl` key in nuxt.config.ts)
import { createApp } from 'vue'
import { createRtl } from 'vue-rtl-kit'
import App from './App.vue'

const rtl = createRtl({
  locales: { en: 'ltr', ar: 'rtl', fa: 'rtl' },
  defaultLocale: 'ar',
  // Looked up by full tag, then by language subtag, so `ar` also pins
  // 'ar-EG' (engine default `arab`) to Western digits. `fa` is not listed,
  // so Persian keeps its own digits.
  numberingSystem: { ar: 'latn' },
})

createApp(App).use(rtl).mount('#app')
```

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useFormat, useRtl } from 'vue-rtl-kit'

const rtl = useRtl()
const fmt = useFormat() // a ComputedRef — use .value in script, plain `fmt` in templates

const total = computed(() => fmt.value.formatCurrency(2500, 'EGP', { isolate: true }))
const due = computed(() => fmt.value.formatDate(new Date(2024, 4, 12), {
  dateStyle: 'long',
  calendar: 'gregory',
  isolate: true,
}))
const count = computed(() => fmt.value.formatNumber(48210.5))
</script>

<template>
  <button type="button" @click="rtl.setLocale('ar-EG')">مصر</button>
  <button type="button" @click="rtl.setLocale('fa-IR')">ایران</button>

  <p>الإجمالي: {{ total }} — يستحق في {{ due }}</p>
  <p>عدد العناصر: {{ count }}</p>
  <!-- in a template you can also call it inline: -->
  <p>{{ fmt.formatNumber(0.256, { style: 'percent', maximumFractionDigits: 1 }) }}</p>
</template>
```

What it renders (Chrome; isolate and bidi marks not shown):

| Locale | Total and due date | Count | Percent |
|---|---|---|---|
| `ar` (start) and `ar-EG` (after **مصر**) | `2,500.00 ج.م.` — `12 مايو 2024` | `48,210.5` | `25.6%` |
| `fa-IR` (after **ایران**) | `EGP ۲٬۵۰۰٫۰۰` — `۱۲ مهٔ ۲۰۲۴` | `۴۸٬۲۱۰٫۵` | `۲۵٫۶٪` |

`ar-EG` keeps Western digits because the `ar` entry covers it; `fa-IR` keeps Persian digits but
gets the Gregorian date, because `calendar: 'gregory'` is passed on the call.

`isolate: true` wraps the formatted result in an FSI…PDI isolate (`isolate: 'ltr'` / `'rtl'` pick
LRI/RLI instead), which is §3's fix applied at the formatter. Per-call options override the
configured default, so one screen can still ask for `numberingSystem: 'arab'`.

For text you did not format yourself — a server-rendered invoice number, a pasted reference —
`transliterateDigits(text, 'latn' | 'arab' | 'arabext')` converts only the digits and leaves the
rest of the string untouched. Prefer reformatting through `Intl` whenever the value is still a
number or a `Date`; transliteration is for strings that are already strings.

---

## 7. The direction flash on SSR and hydration

### Broken

```vue
<!-- index.html ships <html lang="en"> with no dir, then: -->
<script setup lang="ts">
import { onMounted, ref } from 'vue'

const dir = ref('ltr')
onMounted(() => {
  dir.value = localStorage.getItem('locale') === 'ar' ? 'rtl' : 'ltr'
  document.documentElement.dir = dir.value
})
</script>
```

Every Arabic user gets a first paint in LTR — text left-aligned, margins on the wrong side — followed
by the whole page flipping once the client wakes up.

**Why it breaks:** direction decided in `onMounted` (or from `localStorage` during setup) does not
exist at the time the server rendered, and does not exist at first paint. SSR can only avoid the
flash if the *same* direction value drives the server HTML — starting with the attributes on
`<html>` itself.

### Fix — plain approach

Decide direction on the server, from something the server can see — the route (`/ar/…`), a cookie, an
`Accept-Language` negotiation you then persist — and write it into the shell before any CSS paints.
The route and the cookie are request input, so match them against an allowlist first; only a
locale from that list may reach `lang` and `dir`:

```ts
// server/shell.ts
// Static config, shared by every request: the locales this app ships.
const SUPPORTED = ['en', 'ar', 'he', 'fa'] as const
type Locale = (typeof SUPPORTED)[number]
const RTL_LOCALES: ReadonlySet<Locale> = new Set(['ar', 'he', 'fa'])

function toLocale(value: string | undefined): Locale | undefined {
  return SUPPORTED.find(locale => locale === value)
}

// Called by your server for every request; the locale only ever lives in
// this call's local variables, so one visitor's choice cannot leak into
// another visitor's HTML.
export function renderShell(request: Request, appHtml: string): string {
  const fromRoute = new URL(request.url).pathname.split('/')[1] // '/ar/pricing' -> 'ar'
  const fromCookie = /(?:^|;\s*)locale=([^;]*)/.exec(request.headers.get('cookie') ?? '')?.[1]
  const locale = toLocale(fromRoute) ?? toLocale(fromCookie) ?? 'ar'
  const dir = RTL_LOCALES.has(locale) ? 'rtl' : 'ltr'

  return `<!doctype html>
<html dir="${dir}" lang="${locale}">
  <body><div id="app">${appHtml}</div></body>
</html>`
}
```

Anything that is not one of the four known tags — a typo, an unsupported locale, or a crafted
cookie such as `"><script>` — falls back to `'ar'` and never reaches the markup; `appHtml` is the
app's already-escaped render output.

The client then *starts* from the same value (read it from the rendered `<html dir>` or the route,
not from storage after mount), so hydration matches. If the app is client-only, the cheap version of
the same idea is a static `<html dir="rtl" lang="ar">` for an RTL-default product, plus a tiny inline
script in `<head>` — before the stylesheet — for the stored-locale case. What you cannot do is fix
it from `onMounted` and call the flash acceptable.

### Fix — vue-rtl-kit

In Nuxt the wiring is done for you: the module's runtime plugin installs the store and feeds
`dir`/`lang` to `useHead()`, so both attributes are in the server-rendered `<html>` tag and update
reactively afterwards:

```ts
// nuxt.config.ts
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: ['vue-rtl-kit/nuxt'],
  rtl: {
    locales: { en: 'ltr', ar: 'rtl', he: 'rtl', fa: 'rtl' },
    defaultLocale: 'ar',
  },
})
```

That config alone is *not* the whole fix for anyone whose locale is not `defaultLocale`: the
plugin starts every request at that static default. The request's locale still has to be set on
the server, before render — for example from a cookie, in a plugin that runs for every request:

```ts
// plugins/request-locale.ts
import { defineNuxtPlugin, useCookie } from '#app'
import { useRtl } from 'vue-rtl-kit'

// Static config: the locales this app ships.
const SUPPORTED = ['en', 'ar', 'he', 'fa']

// Nuxt runs this function once per request on the server, before render.
export default defineNuxtPlugin(() => {
  const rtl = useRtl()
  const cookieLocale = useCookie<string | undefined>('locale').value
  if (cookieLocale && SUPPORTED.includes(cookieLocale)) rtl.setLocale(cookieLocale)
})
```

Module plugins run before your project's plugins, so the store already exists here. Do that and
`useHead` emits the *request's* `dir`/`lang`, not the default's, so the first paint and hydration
agree for those users too. The allowlist matters as much as in the plain fix: the cookie is
whatever the visitor sent, and only a known locale may become the page's `lang` and `dir`.

`<BidiText>` and `<RtlProvider>` render their isolates into the server HTML and `v-rtl` emits its
`dir` via `getSSRProps`, so the mixed-direction content is also correct in that first paint rather
than only after hydration.

For a hand-rolled Vue SSR shell, `createRtl` is safe to call on the server (it touches no DOM
during render) and `rtl.htmlAttrs()` gives you the shell attributes from the same store the app
renders with. Create the instance *inside* the request handler — a module-scope instance is one
store shared by every request, so one visitor's locale would leak into the next visitor's HTML —
and start it from the request's locale, validated against the same allowlist:

```ts
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createRtl } from 'vue-rtl-kit'
import App from './App.vue'

// Static config: the locales this app ships.
const SUPPORTED = ['en', 'ar', 'he', 'fa'] as const

// Called once per request with the raw locale from that request's route or cookie.
export async function render(requested: string | undefined): Promise<string> {
  const locale = SUPPORTED.find(known => known === requested) ?? 'ar'
  const rtl = createRtl({
    locales: { en: 'ltr', ar: 'rtl', he: 'rtl', fa: 'rtl' },
    defaultLocale: locale,
  })

  const app = createSSRApp(App)
  app.use(rtl)

  const appHtml = await renderToString(app)
  const { dir, lang } = rtl.htmlAttrs()

  return `<!doctype html>
<html dir="${dir}" lang="${lang}">
  <body><div id="app">${appHtml}</div></body>
</html>`
}
```

`dir` and `lang` there can only be values from the allowlist, and `appHtml` is Vue's own escaped
render output, so no request input is written into the shell unchecked. Either way, the rule from
the plain fix still applies: resolve the *initial locale* on the server (route or cookie) and
hydrate with that same locale; `'ar'` is the fallback for requests where the route and cookie name
no supported locale.

---

## 8. Transitions and transforms going the wrong way

### Broken

```vue
<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
const offset = ref(40) // px towards the end of the track
</script>

<template>
  <aside class="drawer" :class="{ open }">
    <!-- navigation -->
  </aside>
  <div class="track">
    <span class="dot" :style="{ transform: `translateX(${offset}px)` }" />
  </div>
</template>

<style scoped>
.drawer {
  position: fixed;
  inset-block: 0;
  inset-inline-start: 0;          /* anchored to the right in RTL — good */
  inline-size: 16rem;
  transform: translateX(-110%);   /* hidden off the *left* edge — wrong in RTL */
  transition: transform 0.25s ease;
}
.drawer.open { transform: translateX(0); }
.track { inline-size: 12rem; border-block-end: 2px solid; }
.dot {
  display: block; /* transforms skip plain inline boxes */
  inline-size: 12px;
  block-size: 12px;
  border-radius: 50%;
  background: currentColor;
  transition: transform 0.12s ease-out;
}
</style>
```

The drawer is anchored with a logical property but hidden with a physical transform, so in RTL the
closed drawer is not hidden at all: `translateX(-110%)` moves it from the right edge back across the
viewport, where it sits on top of the content. The dot starts at the track's inline start (the
right, in RTL) and `offset` pushes it further right, off the track, while "towards the end of the
track" in RTL means towards the left.

**Why it breaks:** `translateX()` lengths and pointer coordinates are physical — positive always
means "to the right". Logical properties stop at the stylesheet's property names; nothing rewrites
a pixel value for you.

### Fix — plain CSS/Vue

Keep the physical value in one place and multiply it by a sign that is switched on `[dir]`. Custom
properties inherit, so one global rule pair serves every component:

```vue
<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
const offset = ref(40) // px towards the end of the track
</script>

<template>
  <aside class="drawer" :class="{ open }">
    <!-- navigation -->
  </aside>
  <div class="track">
    <span class="dot" :style="{ '--offset': `${offset}px` }" />
  </div>
</template>

<style>
/* global: 1 in LTR, -1 in RTL */
:root, [dir="ltr"] { --inline-sign: 1; }
[dir="rtl"] { --inline-sign: -1; }
</style>

<style scoped>
.drawer {
  position: fixed;
  inset-block: 0;
  inset-inline-start: 0;
  inline-size: 16rem;
  transform: translateX(calc(-110% * var(--inline-sign)));
  transition: transform 0.25s ease;
}
.drawer.open { transform: translateX(0); }
.track { inline-size: 12rem; border-block-end: 2px solid; }
.dot {
  display: block;
  inline-size: 12px;
  block-size: 12px;
  border-radius: 50%;
  background: currentColor;
  transform: translateX(calc(var(--offset) * var(--inline-sign)));
  transition: transform 0.12s ease-out;
}
</style>
```

The `[dir="ltr"]` selector is not decoration: because the custom property inherits, a nested
`dir="ltr"` island on an RTL page would otherwise inherit `-1` and slide the RTL way.

### Fix — vue-rtl-kit

`useLogicalStyles()` exposes the current direction as reactive values built for exactly this:
`sign` (`1` in LTR, `-1` in RTL) and `mirror(value)` (which is `value * sign`):

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLogicalStyles } from 'vue-rtl-kit'

const { mirror, sign } = useLogicalStyles()

const open = ref(false)
const offset = ref(40) // px towards the end of the track

// LTR hides the start-anchored drawer at -110%; RTL hides it at +110%.
const drawerStyle = computed(() => ({
  transform: open.value ? 'translateX(0)' : `translateX(${mirror(-110)}%)`,
  transition: 'transform 0.25s ease',
}))

// Logical offset in, physical transform out.
const dotStyle = computed(() => ({
  transform: `translateX(${offset.value * sign.value}px)`,
}))

// Pointer deltas are physical too (movementX > 0 means "moved right"),
// so convert them into the logical offset the same way.
function dragBy(event: PointerEvent) {
  if (event.buttons) offset.value += event.movementX * sign.value
}
</script>

<template>
  <aside class="drawer" :style="drawerStyle"><!-- navigation --></aside>
  <div class="track" @pointermove="dragBy">
    <span class="dot" :style="dotStyle" />
  </div>
</template>

<style scoped>
.drawer {
  position: fixed;
  inset-block: 0;
  inset-inline-start: 0;
  inline-size: 16rem;
}
.track { inline-size: 12rem; border-block-end: 2px solid; }
.dot {
  display: block;
  inline-size: 12px;
  block-size: 12px;
  border-radius: 50%;
  background: currentColor;
}
</style>
```

Because `sign` and `mirror` are reactive, both transforms recompute when the direction changes
instead of stranding the drawer on-screen, and the dragged dot follows the pointer in either
direction. The same multiplication applies to an `x` you hand to a vendor component (§9).

---

## 9. Third-party components that hardcode LTR

The `Vendor*` components in this section are small local stand-ins, defined in each snippet so it
compiles on its own; in your app they are the components you import from the third-party package,
and the plain `<style>` block marked as the vendor's stands in for the stylesheet that package
ships.

### Broken

```vue
<script setup lang="ts">
import type { PropType } from 'vue'
import { defineComponent, h, ref } from 'vue'

// Stand-in for a third-party date picker whose internals you do not control.
const VendorDatePicker = defineComponent({
  props: { modelValue: { type: Date as PropType<Date | null>, default: null } },
  emits: ['update:modelValue'],
  setup: () => () => h('div', { class: 'vendor-popover' }, [
    h('span', { class: 'vendor-next-icon', 'aria-hidden': 'true' }, '→'),
  ]),
})

const date = ref<Date | null>(null)
</script>

<template>
  <div class="picker-wrap">
    <VendorDatePicker v-model="date" />
  </div>
</template>

<style>
/* stand-in for the vendor's stylesheet */
.vendor-popover {
  position: absolute;
  left: 0;
  margin-left: 8px;
  text-align: left;
}
</style>

<style scoped>
.picker-wrap { position: relative; }
</style>
```

The popover opens pinned to the physical left under a field that is anchored to the right, its text
is left-aligned inside an Arabic form, and its internal "next month" arrow points the wrong way.
Setting `dir="rtl"` on your page changed none of it, and the vendor has no RTL build.

**Why it breaks:** direction is not contagious across a library boundary. The vendor's stylesheet
(and often its inline styles and pixel math) was written in physical properties, and Vue's `dir`
inheritance does not rewrite another package's CSS, its `offsetLeft` calculations, or the plain
strings it renders into a toast.

### Fix — plain Vue, in this order

1. **Use the vendor's own knobs first.** Many components accept `dir`, `rtl`, `locale` or `align`
   props, or a locale object for their internal date/number formatting. One supported prop beats
   forty lines of overrides, and survives vendor upgrades.
2. **Scope it to the direction it actually supports.** If a code editor or terminal component is
   LTR-only by design, pin the whole subtree with `dir="ltr"` (a block carrying `dir` is already
   isolated by the UA stylesheet), instead of letting it half-inherit RTL and break in both
   directions.
3. **Override with logical properties via `:deep()`.** Keep the override list short and in one
   place so a vendor upgrade is easy to re-check.
4. **Fix strings at the boundary.** If the vendor renders your text into its own DOM (toasts,
   tooltips, canvas labels), hand it pre-isolated strings instead of raw ones — `unicode-bidi`
   cannot reach inside a `<canvas>`, and a toast component will not isolate for you.

Step 2, pinning an LTR-only editor:

```vue
<script setup lang="ts">
import { defineComponent, h, ref } from 'vue'

// Stand-in for a third-party, LTR-only code editor.
const VendorCodeEditor = defineComponent({
  props: { modelValue: { type: String, default: '' } },
  emits: ['update:modelValue'],
  setup: props => () => h('pre', { class: 'vendor-editor' }, props.modelValue),
})

const code = ref('git checkout -b feature/rtl')
</script>

<template>
  <div dir="ltr" class="vendor-scope">
    <VendorCodeEditor v-model="code" />
  </div>
</template>

<style scoped>
.vendor-scope { text-align: left; }
</style>
```

No `unicode-bidi: isolate` in that rule: on a block that already has `dir` it would do nothing.

Step 3, overriding the date picker's physical CSS:

```vue
<script setup lang="ts">
import type { PropType } from 'vue'
import { defineComponent, h, ref } from 'vue'

// Stand-in for the same third-party date picker as in the broken example.
const VendorDatePicker = defineComponent({
  props: { modelValue: { type: Date as PropType<Date | null>, default: null } },
  emits: ['update:modelValue'],
  setup: () => () => h('div', { class: 'vendor-popover' }, [
    h('span', { class: 'vendor-next-icon', 'aria-hidden': 'true' }, '→'),
  ]),
})

const date = ref<Date | null>(null)
</script>

<template>
  <div class="picker-wrap">
    <VendorDatePicker v-model="date" />
  </div>
</template>

<style>
/* stand-in for the vendor's stylesheet, unchanged */
.vendor-popover {
  position: absolute;
  left: 0;
  margin-left: 8px;
  text-align: left;
}
</style>

<style scoped>
.picker-wrap { position: relative; }
.picker-wrap :deep(.vendor-popover) {
  inset-inline-start: 0;
  margin-inline-start: 8px;
  text-align: start;
}
/* The vendor anchored the popover with physical `left` and `margin-left`,
   so both declarations have to be unset explicitly in RTL; the logical
   properties above are what steer it to the inline-start (right) side. */
[dir="rtl"] .picker-wrap :deep(.vendor-popover) { left: auto; margin-left: 0; }
[dir="rtl"] .picker-wrap :deep(.vendor-next-icon) { display: inline-block; transform: scaleX(-1); }
</style>
```

The flip rule is only legitimate under `[dir="rtl"]` for a *directional* glyph — §2's table applies
inside vendor markup too. Keep physical-property overrides to the minimum needed to unset the
vendor's (like the `left: auto; margin-left: 0` above) rather than building a second, hidden
physical stylesheet per direction.

Where a vendor measures pointer position or accepts an `x`/`offset` prop, no CSS reaches it at all;
that value has to be direction-flipped in JavaScript before it crosses the boundary.

### Fix — vue-rtl-kit

The same moves, with the direction kept reactive instead of re-derived per call site. The stand-ins
here take a pixel `offsetX` prop and a `message` string; substitute the real props your vendor
exposes:

```vue
<script setup lang="ts">
import type { PropType } from 'vue'
import { computed, defineComponent, h, ref } from 'vue'
import { RtlProvider, isolateRuns, useDirection, useLogicalStyles } from 'vue-rtl-kit'

// Stand-ins for the third-party components. Style attributes such as `:style`
// fall through to their root element, as they do on most real components.
const VendorDatePicker = defineComponent({
  props: {
    modelValue: { type: Date as PropType<Date | null>, default: null },
    offsetX: { type: Number, default: 0 },
  },
  emits: ['update:modelValue'],
  setup: props => () => h('div', {
    class: 'vendor-popover',
    style: { transform: `translateX(${props.offsetX}px)` },
  }),
})
const VendorCodeEditor = defineComponent({
  props: { modelValue: { type: String, default: '' } },
  emits: ['update:modelValue'],
  setup: props => () => h('pre', { class: 'vendor-editor' }, props.modelValue),
})
const VendorToast = defineComponent({
  props: { message: { type: String, required: true } },
  setup: props => () => h('output', { class: 'vendor-toast' }, props.message),
})

const date = ref<Date | null>(null)
const code = ref('git checkout -b feature/rtl')

const { dir } = useDirection()
const { toLogical, mirror } = useLogicalStyles()

// Styles you hand to the vendor: convert them at the boundary.
// toLogical() returns logical properties the vendor's DOM node can use as-is…
const popoverStyle = computed(() => toLogical({
  marginLeft: '8px',
  textAlign: 'left',
}))
// …and mirror() flips the one physical number it insists on computing itself.
const popoverOffset = computed(() => mirror(120))

// A toast/canvas channel that only takes strings gets a pre-isolated one.
const toastText = computed(() => isolateRuns('موعد التسليم 12-05-2024', dir.value))
</script>

<template>
  <div class="picker-wrap">
    <VendorDatePicker v-model="date" :style="popoverStyle" :offset-x="popoverOffset" />
  </div>

  <!-- an LTR-only editor, scoped from the RTL page around it; locale="en" so it
       is not labelled Arabic (lang follows the scope's locale) -->
  <RtlProvider dir="ltr" locale="en" tag="div" class="vendor-scope">
    <VendorCodeEditor v-model="code" />
  </RtlProvider>

  <!-- a string-only channel gets the pre-isolated text -->
  <VendorToast :message="toastText" />
</template>

<style scoped>
.vendor-scope { text-align: left; }
</style>
```

Notes on the snippet:

- `<RtlProvider dir="ltr" locale="en">` does more than the plain `dir` attribute in step 2:
  components inside the scope that call `useDirection()` / `useLogicalStyles()` (and nested
  `<BidiText>`) also see LTR, so your own wrappers around the vendor stay consistent with the
  vendor's internals, and `locale="en"` keeps the subtree's `lang` English instead of inheriting
  the page's Arabic. Its `isolate` prop defaults to `true`.
- If a component is only used inside such a scope, `v-rtl:ltr` on its wrapper element is the
  lighter-weight version of the same pin.

Two cases the snippet does not cover, to check against your own vendor:

- A vendor that renders to `<canvas>`, SVG, PDF or email HTML has no logical properties to
  resolve. Hand it `toPhysical(style)` from `useLogicalStyles()` instead of `toLogical()`; it
  resolves the logical properties to physical ones for the current direction.
- A vendor that teleports its popover to `<body>` takes it out of your `.picker-wrap`, so `:deep()`
  overrides stop matching. Move those overrides to a global stylesheet, or use the vendor's
  `teleport`/`attach` prop to keep the overlay inside your wrapper.

---

## Checklist

Run through this with `dir` toggled live (the README's playground does exactly that) in at least one
Arabic, one Hebrew and one Persian build before calling an RTL release done:

- [ ] No `margin-left`, `padding-right`, `left`, `right`, `text-align: left` etc. in component CSS,
      except where the meaning is genuinely physical (§1).
- [ ] Directional icons flip; logos, checkmarks and media controls do not (§2).
- [ ] Every interpolated email, URL, code and number with a unit or separator is isolated — ideally
      by rendering the sentence through `<BidiText>` — and tokens with edge symbols (`+1 …`, a
      trailing `/`, `C++`) are isolated whole (§3).
- [ ] Sentence punctuation sits outside the isolate; punctuation belonging to the inserted run sits
      inside it; no string data was reordered to "fix" rendering (§4).
- [ ] Email/URL/code inputs are pinned `dir="ltr"`; free-text inputs use `dir="auto"` (§5).
- [ ] Numbering system and calendar are explicit per data type, configured once, and formatted
      results are isolated where they meet a sentence (§6).
- [ ] `<html dir lang>` is correct in the *server-rendered* HTML; no direction is first decided in
      `onMounted` or from `localStorage` (§7).
- [ ] Every `translateX`, drag delta and vendor `x` prop is multiplied by the direction sign (§8).
- [ ] Each third-party component uses its own `dir`/`locale` prop if it has one, is otherwise
      scoped/isolated or overridden in logical properties — including its teleported overlays (§9).

The through-line: direction is a property of the *paragraph and the layout flow*, not of your data.
Keep strings in logical order, state direction as close to the content as possible (`dir`,
`<RtlProvider>`, `v-rtl`), express layout in logical properties, isolate foreign runs instead of
reordering them, and multiply the handful of physical pixel values that remain by the direction
sign. Do those five things and Arabic, Hebrew and Persian stop being a second, buggier UI.
