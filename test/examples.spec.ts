/**
 * Mount tests for `examples/vite/App.vue` and `playground/src/App.vue`.
 *
 * Neither `vitest.config.ts` nor `package.json` maps the bare `'vue-rtl-kit'`
 * specifier to `src/index.ts`: a direct `import('../examples/vite/App.vue')`
 * fails Vite's `vite:import-analysis` when `examples/vite/node_modules` is not
 * installed, and `vi.mock('vue-rtl-kit', ...)` / direct `playground/src/App.vue`
 * imports fail with "Failed to resolve entry for package vue-rtl-kit" when
 * `dist/` has not been built yet. Loading both SFCs through Vite's `createServer`
 * with `@vitejs/plugin-vue` and explicit aliases (`vue-rtl-kit` -> `src/index.ts`,
 * `vue` -> root `node_modules/vue`) runs the real SFC pipeline (`<script setup>`,
 * `<template>`, `<style>`, child `.vue` imports) with no `dist/`, no
 * `examples/vite/node_modules`, and no undeclared dependencies.
 */
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin, ViteDevServer } from 'vite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Component } from 'vue'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import {
  FSI,
  PDI,
  createRtl,
  formatList,
  formatRelativeTime,
  splitBidiRuns,
} from '../src/index'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ARABIC_INDIC = /[٠-٩]/
const WESTERN = /[0-9]/
const BIDI_ISOLATE_CHARS = /[\u2066-\u2069]/
const MIXED_NAMES = ['سارة', 'Alex', 'عمر']

/** Read the Vite example's useFormat card as `{ <dt label>: <dd text> }`. */
function readFormatCard(wrapper: VueWrapper): Record<string, string> {
  return Object.fromEntries(
    wrapper.findAll('section[aria-labelledby="numbers-title"] dl > div')
      .map(row => [row.find('dt').text(), row.find('dd').text()]),
  )
}

/**
 * Wrap `@vitejs/plugin-vue` so `server.ssrLoadModule()` compiles SFC templates
 * into client VNode `render` functions (instead of SSR string renderers) while
 * still running the full Vite + `@vitejs/plugin-vue` pipeline (`<script setup>`,
 * `<template>`, `<style>`, and child `.vue` imports).
 */
function clientVuePlugin(plugin: Plugin): Plugin {
  const rawLoad = plugin.load
  const rawTransform = plugin.transform
  return {
    ...plugin,
    load(id, opt) {
      const fn = typeof rawLoad === 'function' ? rawLoad : rawLoad?.handler
      return fn?.call(this, id, opt ? { ...opt, ssr: false } : opt)
    },
    transform(code, id, opt) {
      const fn = typeof rawTransform === 'function' ? rawTransform : rawTransform?.handler
      return fn?.call(this, code, id, opt ? { ...opt, ssr: false } : opt)
    },
  }
}

let viteServer: ViteDevServer
let ViteExampleApp: Component
let PlaygroundApp: Component

beforeAll(async () => {
  // jsdom replaces globalThis.Uint8Array with its own realm's constructor while
  // keeping Node's TextEncoder, which triggers esbuild's startup invariant when
  // Vite loads inside jsdom. Temporarily align Uint8Array with TextEncoder's
  // realm while Vite compiles and loads the SFCs, then restore it.
  const JsdomUint8Array = globalThis.Uint8Array
  const NodeUint8Array = Object.getPrototypeOf(new TextEncoder().encode('')).constructor as typeof Uint8Array
  globalThis.Uint8Array = NodeUint8Array
  try {
    const [{ createServer }, { default: vue }] = await Promise.all([
      import('vite'),
      import('@vitejs/plugin-vue'),
    ])
    viteServer = await createServer({
      configFile: false,
      root: rootDir,
      plugins: [clientVuePlugin(vue())],
      resolve: {
        alias: [
          { find: /^vue-rtl-kit$/, replacement: resolve(rootDir, 'src/index.ts') },
          { find: /^vue$/, replacement: resolve(rootDir, 'node_modules/vue') },
        ],
        dedupe: ['vue'],
      },
      ssr: {
        noExternal: ['vue-rtl-kit'],
        external: ['vue'],
      },
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      optimizeDeps: { noDiscovery: true },
      logLevel: 'silent',
    })

    const [viteMod, playgroundMod] = await Promise.all([
      viteServer.ssrLoadModule('/examples/vite/App.vue'),
      viteServer.ssrLoadModule('/playground/src/App.vue'),
    ])
    ViteExampleApp = viteMod.default as Component
    PlaygroundApp = playgroundMod.default as Component
  }
  finally {
    globalThis.Uint8Array = JsdomUint8Array
  }
})

afterAll(async () => {
  await viteServer?.close()
})

function resetDocument() {
  document.documentElement.removeAttribute('dir')
  document.documentElement.removeAttribute('lang')
  document.documentElement.className = ''
}

describe('examples/vite/App.vue', () => {
  beforeEach(resetDocument)
  afterEach(resetDocument)

  it('mounts with main.ts options, switches locale, formats digits/lists/relative time, isolates bidi text, and unmounts cleanly', async () => {
    const errors: unknown[] = []
    const errorSpy = vi.spyOn(console, 'error').mockImplementation((...args) => {
      errors.push(args)
    })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation((...args) => {
      errors.push(args)
    })

    const rtl = createRtl({
      locales: { ar: 'rtl', en: 'ltr' },
      defaultLocale: 'ar',
      numberingSystem: { ar: 'arab', en: 'latn' },
    })

    const wrapper = mount(ViteExampleApp, {
      global: {
        plugins: [rtl],
        config: {
          errorHandler: (err) => { errors.push(err) },
          warnHandler: (msg) => { errors.push(msg) },
        },
      },
    })

    try {
      await nextTick()

      // Initial <html dir lang>
      expect(document.documentElement.getAttribute('dir')).toBe('rtl')
      expect(document.documentElement.getAttribute('lang')).toBe('ar')

      // Real BidiText render isolates every opposite-direction run in <bdi dir="ltr">
      const bidiParagraph = wrapper.find('p.mixed')
      expect(bidiParagraph.attributes('dir')).toBe('rtl')
      const expectedArRuns = splitBidiRuns(bidiParagraph.text(), 'rtl').filter(run => run.isolated)
      expect(expectedArRuns.length).toBeGreaterThan(0)
      expect(bidiParagraph.findAll('bdi').map(node => ({
        dir: node.attributes('dir'),
        text: node.text(),
      }))).toEqual(expectedArRuns.map(run => ({ dir: run.dir, text: run.text })))

      // useFormat card in Arabic (Arabic-Indic digits, isolated list, relative time)
      const formatCardAr = readFormatCard(wrapper)
      expect(Object.keys(formatCardAr)).toHaveLength(5)
      const totalAr = formatCardAr['الإجمالي']
      const itemsAr = formatCardAr['عدد العناصر']
      const dateAr = formatCardAr['تاريخ الطلب']
      const listAr = formatCardAr['المراجعون']
      const relativeAr = formatCardAr['آخر تحديث']

      for (const numeric of [totalAr!, itemsAr!, dateAr!, relativeAr!]) {
        expect(ARABIC_INDIC.test(numeric)).toBe(true)
        expect(WESTERN.test(numeric)).toBe(false)
      }
      expect(listAr).toBe(formatList(MIXED_NAMES, { locale: 'ar', numberingSystem: 'arab', isolate: true }))
      expect(listAr).toMatch(BIDI_ISOLATE_CHARS)
      expect(listAr).toContain(FSI)
      expect(listAr).toContain(PDI)
      expect(relativeAr).toBe(formatRelativeTime(-3, 'day', { locale: 'ar', numberingSystem: 'arab' }))

      // Clicking the English button switches to ltr / en
      const englishButton = wrapper.findAll('nav button').find(btn => btn.text().trim() === 'English')
      expect(englishButton).toBeDefined()
      await englishButton!.trigger('click')
      await nextTick()

      expect(document.documentElement.getAttribute('dir')).toBe('ltr')
      expect(document.documentElement.getAttribute('lang')).toBe('en')

      // Real BidiText render now isolates every opposite-direction run in <bdi dir="rtl">
      expect(bidiParagraph.attributes('dir')).toBe('ltr')
      const expectedEnRuns = splitBidiRuns(bidiParagraph.text(), 'ltr').filter(run => run.isolated)
      expect(expectedEnRuns.length).toBeGreaterThan(0)
      expect(bidiParagraph.findAll('bdi').map(node => ({
        dir: node.attributes('dir'),
        text: node.text(),
      }))).toEqual(expectedEnRuns.map(run => ({ dir: run.dir, text: run.text })))

      // useFormat card in English (Western digits, isolated list, relative time)
      const formatCardEn = readFormatCard(wrapper)
      expect(Object.keys(formatCardEn)).toHaveLength(5)
      const totalEn = formatCardEn.Total
      const itemsEn = formatCardEn['Item count']
      const dateEn = formatCardEn['Order date']
      const listEn = formatCardEn.Reviewers
      const relativeEn = formatCardEn.Updated

      for (const numeric of [totalEn!, itemsEn!, dateEn!, relativeEn!]) {
        expect(WESTERN.test(numeric)).toBe(true)
        expect(ARABIC_INDIC.test(numeric)).toBe(false)
      }
      expect(listEn).toBe(formatList(MIXED_NAMES, { locale: 'en', numberingSystem: 'latn', isolate: true }))
      expect(listEn).toMatch(BIDI_ISOLATE_CHARS)
      expect(listEn).toContain(FSI)
      expect(listEn).toContain(PDI)
      expect(relativeEn).toBe(formatRelativeTime(-3, 'day', { locale: 'en', numberingSystem: 'latn' }))

      expect(() => wrapper.unmount()).not.toThrow()
      expect(() => rtl.dispose()).not.toThrow()
      expect(errors).toEqual([])
    }
    finally {
      errorSpy.mockRestore()
      warnSpy.mockRestore()
    }
  })
})

describe('playground/src/App.vue', () => {
  beforeEach(resetDocument)
  afterEach(resetDocument)

  it('mounts with main.ts options, honours locale and numberingSystem toggles, isolates bidi text, and unmounts cleanly', async () => {
    const errors: unknown[] = []
    const errorSpy = vi.spyOn(console, 'error').mockImplementation((...args) => {
      errors.push(args)
    })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation((...args) => {
      errors.push(args)
    })

    const rtl = createRtl({
      locales: { 'en-GB': 'ltr', 'ar-EG': 'rtl', 'he-IL': 'rtl' },
      defaultLocale: 'ar-EG',
      htmlClass: true,
    })

    const wrapper = mount(PlaygroundApp, {
      global: {
        plugins: [rtl],
        config: {
          errorHandler: (err) => { errors.push(err) },
          warnHandler: (msg) => { errors.push(msg) },
        },
      },
    })

    try {
      await nextTick()

      // Initial <html dir lang>
      expect(document.documentElement.getAttribute('dir')).toBe('rtl')
      expect(document.documentElement.getAttribute('lang')).toBe('ar-EG')
      expect(document.documentElement.classList.contains('rtl')).toBe(true)

      // Compiled through @vitejs/plugin-vue with <style scoped> preserved
      expect((wrapper.element as Element).getAttributeNames().some(name => name.startsWith('data-v-'))).toBe(true)

      // Real BidiText renders in #bidi: raw card has no <bdi>; isolated card wraps each opposite-direction run in <bdi dir>
      const bidiCards = wrapper.findAll('#bidi .compare')
      expect(bidiCards[0]!.findAll('bdi')).toHaveLength(0)

      const isolatedSamples = bidiCards[1]!.findAll('p.samples__text')
      expect(isolatedSamples).toHaveLength(6)
      for (const sampleEl of isolatedSamples) {
        const expectedRuns = splitBidiRuns(sampleEl.text(), 'rtl').filter(run => run.isolated)
        expect(expectedRuns.length).toBeGreaterThan(0)
        expect(sampleEl.findAll('bdi').map(node => ({
          dir: node.attributes('dir'),
          text: node.text(),
        }))).toEqual(expectedRuns.map(run => ({ dir: run.dir, text: run.text })))
      }

      // Hebrew <BidiText dir="rtl"> card isolates LTR version and date runs
      expect(bidiCards[2]!.findAll('bdi')).toHaveLength(0)
      const hebrewIsolated = bidiCards[3]!.find('p.samples__text')
      const expectedHebrewRuns = splitBidiRuns(hebrewIsolated.text(), 'rtl').filter(run => run.isolated)
      expect(hebrewIsolated.findAll('bdi').map(node => ({
        dir: node.attributes('dir'),
        text: node.text(),
      }))).toEqual(expectedHebrewRuns.map(run => ({ dir: run.dir, text: run.text })))

      const formatRows = () => wrapper.findAll('#format tbody tr').map(row => ({
        label: row.findAll('td')[0]!.text(),
        output: row.findAll('td')[1]!.text(),
      }))

      // Initial #format rows in ar-EG with nu-arab
      const initialRows = formatRows()
      expect(initialRows).toHaveLength(8)

      for (const row of initialRows.filter(r => !r.label.startsWith('formatList'))) {
        expect(ARABIC_INDIC.test(row.output)).toBe(true)
        expect(WESTERN.test(row.output)).toBe(false)
      }

      const activeProfileNumbersAr = wrapper.find('#mirror > .section__body > .card .card__stats dd').text()
      expect(ARABIC_INDIC.test(activeProfileNumbersAr)).toBe(true)
      expect(WESTERN.test(activeProfileNumbersAr)).toBe(false)

      const plainListRow = initialRows.find(r => r.label.startsWith('formatList(['))!
      const isolatedListRow = initialRows.find(r => r.label.includes('isolate: true'))!
      const relativeRow = initialRows.find(r => r.label.startsWith('formatRelativeTime'))!

      expect(plainListRow.output).toBe(formatList(MIXED_NAMES, { locale: 'ar-EG', numberingSystem: 'arab' }))
      expect(plainListRow.output).not.toMatch(BIDI_ISOLATE_CHARS)
      expect(isolatedListRow.output).toBe(formatList(MIXED_NAMES, { locale: 'ar-EG', numberingSystem: 'arab', isolate: true }))
      expect(isolatedListRow.output).toMatch(BIDI_ISOLATE_CHARS)
      expect(isolatedListRow.output).toContain(FSI)
      expect(isolatedListRow.output).toContain(PDI)
      expect(relativeRow.output).toBe(formatRelativeTime(-3, 'day', { locale: 'ar-EG', numberingSystem: 'arab' }))
      expect(ARABIC_INDIC.test(relativeRow.output)).toBe(true)
      expect(WESTERN.test(relativeRow.output)).toBe(false)

      // Toggle numberingSystem to nu-latn while in ar-EG
      const latnButton = wrapper.findAll('#format .seg__btn').find(btn => btn.text().includes('nu-latn'))
      expect(latnButton).toBeDefined()
      await latnButton!.trigger('click')
      await nextTick()

      const latnRowsAr = formatRows()
      const relativeRowArLatn = latnRowsAr.find(r => r.label.startsWith('formatRelativeTime'))!
      expect(relativeRowArLatn.output).toBe(formatRelativeTime(-3, 'day', { locale: 'ar-EG', numberingSystem: 'latn' }))
      expect(WESTERN.test(relativeRowArLatn.output)).toBe(true)
      expect(ARABIC_INDIC.test(relativeRowArLatn.output)).toBe(false)
      expect(latnRowsAr.find(r => r.label.startsWith('formatList(['))!.output)
        .toBe(formatList(MIXED_NAMES, { locale: 'ar-EG', numberingSystem: 'latn' }))
      expect(latnRowsAr.find(r => r.label.includes('isolate: true'))!.output)
        .toBe(formatList(MIXED_NAMES, { locale: 'ar-EG', numberingSystem: 'latn', isolate: true }))

      // Click the English button in the header locale group
      const englishButton = wrapper.findAll('[aria-label="Locale"] button').find(btn => btn.text().trim() === 'English')
      expect(englishButton).toBeDefined()
      await englishButton!.trigger('click')
      await nextTick()

      expect(document.documentElement.getAttribute('dir')).toBe('ltr')
      expect(document.documentElement.getAttribute('lang')).toBe('en-GB')
      expect(document.documentElement.classList.contains('ltr')).toBe(true)
      expect(document.documentElement.classList.contains('rtl')).toBe(false)

      // Real BidiText renders in #bidi now flip to isolating RTL runs under LTR page direction
      for (const sampleEl of bidiCards[1]!.findAll('p.samples__text')) {
        const expectedRuns = splitBidiRuns(sampleEl.text(), 'ltr').filter(run => run.isolated)
        expect(expectedRuns.length).toBeGreaterThan(0)
        expect(sampleEl.findAll('bdi').map(node => ({
          dir: node.attributes('dir'),
          text: node.text(),
        }))).toEqual(expectedRuns.map(run => ({ dir: run.dir, text: run.text })))
      }

      // List and relative time outputs in en-GB with nu-latn
      const enLatnRows = formatRows()
      const enPlainList = enLatnRows.find(r => r.label.startsWith('formatList(['))!
      const enIsolatedList = enLatnRows.find(r => r.label.includes('isolate: true'))!
      const enRelative = enLatnRows.find(r => r.label.startsWith('formatRelativeTime'))!

      expect(enPlainList.output).toBe(formatList(MIXED_NAMES, { locale: 'en-GB', numberingSystem: 'latn' }))
      expect(enIsolatedList.output).toBe(formatList(MIXED_NAMES, { locale: 'en-GB', numberingSystem: 'latn', isolate: true }))
      expect(enIsolatedList.output).toMatch(BIDI_ISOLATE_CHARS)
      expect(enIsolatedList.output).toContain(FSI)
      expect(enIsolatedList.output).toContain(PDI)
      expect(enRelative.output).toBe(formatRelativeTime(-3, 'day', { locale: 'en-GB', numberingSystem: 'latn' }))
      expect(WESTERN.test(enRelative.output)).toBe(true)
      expect(ARABIC_INDIC.test(enRelative.output)).toBe(false)

      // All numeric rows in #format use Western digits under nu-latn in en-GB
      for (const row of enLatnRows.filter(r => !r.label.startsWith('formatList'))) {
        expect(WESTERN.test(row.output)).toBe(true)
        expect(ARABIC_INDIC.test(row.output)).toBe(false)
      }

      // Active ProfileCard in #mirror also shows Western digits in en-GB
      const activeProfileNumbers = wrapper.find('#mirror > .section__body > .card .card__stats dd').text()
      expect(WESTERN.test(activeProfileNumbers)).toBe(true)
      expect(ARABIC_INDIC.test(activeProfileNumbers)).toBe(false)

      expect(() => wrapper.unmount()).not.toThrow()
      expect(() => rtl.dispose()).not.toThrow()
      expect(errors).toEqual([])
    }
    finally {
      errorSpy.mockRestore()
      warnSpy.mockRestore()
    }
  })
})
