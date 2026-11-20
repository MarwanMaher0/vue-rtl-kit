import { afterEach, describe, expect, it } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import { BidiText, createRtl, isolate, isolateRuns, stripBidiControls } from '../../src'
import '../../src/styles/logical.css'
import { attachHost, removeHosts } from './hosts'

const BIDI_CONTROL_CHAR = /[\u200E\u200F\u061C\u202A-\u202E\u2066-\u2069]/u

const PREFIX_AR = 'السعر'
const LATIN_RUN = '(USD) 100'
const SUFFIX_AR = 'فقط'
const SENTENCE = `${PREFIX_AR} ${LATIN_RUN} ${SUFFIX_AR}`

interface CharMeasurement {
  char: string
  index: number
  rect: DOMRect
}

/**
 * Measure the rendered `Range.getBoundingClientRect()` of every visible
 * character under `root` in logical string order, skipping zero-width Unicode
 * bidi control characters (`LRI`, `RLI`, `FSI`, `PDI`, etc.).
 */
function measureVisibleCharacters(root: Element): CharMeasurement[] {
  const measurements: CharMeasurement[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let logicalIndex = 0
  let current: Node | null = walker.nextNode()

  while (current) {
    const textNode = current as Text
    const content = textNode.data
    let offset = 0
    for (const ch of content) {
      const nextOffset = offset + ch.length
      if (!BIDI_CONTROL_CHAR.test(ch)) {
        const range = document.createRange()
        range.setStart(textNode, offset)
        range.setEnd(textNode, nextOffset)
        measurements.push({
          char: ch,
          index: logicalIndex,
          rect: range.getBoundingClientRect(),
        })
        logicalIndex++
      }
      offset = nextOffset
    }
    current = walker.nextNode()
  }

  return measurements
}

function horizontalOverlap(a: DOMRect, b: { left: number, right: number }): number {
  return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
}

interface SentenceParts {
  prefixChars: CharMeasurement[]
  runChars: CharMeasurement[]
  suffixChars: CharMeasurement[]
}

/**
 * Measure `root` and split its visible characters into the `prefix`, `run`
 * and `suffix` of `prefix + ' ' + run + ' ' + suffix`, asserting that the
 * rendered logical text is exactly that sentence.
 */
function measureSentence(root: Element, prefix: string, run: string, suffix: string): SentenceParts {
  const expectedPlain = `${prefix} ${run} ${suffix}`
  const chars = measureVisibleCharacters(root)
  expect(chars.map(c => c.char).join('')).toBe(stripBidiControls(expectedPlain))

  const prefixChars = chars.slice(0, prefix.length)
  const runStart = prefix.length + 1
  const runChars = chars.slice(runStart, runStart + run.length)
  const suffixStart = runStart + run.length + 1
  const suffixChars = chars.slice(suffixStart, suffixStart + suffix.length)

  expect(prefixChars.map(c => c.char).join('')).toBe(prefix)
  expect(runChars.map(c => c.char).join('')).toBe(run)
  expect(suffixChars.map(c => c.char).join('')).toBe(suffix)

  return { prefixChars, runChars, suffixChars }
}

/**
 * Logically adjacent characters of the Latin run that are drawn right to
 * left (the later character starts left of the earlier one).
 */
function outOfOrderPairs(runChars: CharMeasurement[]): string[] {
  const pairs: string[] = []
  for (let i = 0; i < runChars.length - 1; i++) {
    const curr = runChars[i]!
    const next = runChars[i + 1]!
    if (next.rect.left < curr.rect.left)
      pairs.push(`${curr.char}${next.char}`)
  }
  return pairs
}

/**
 * Control-case assertion: the sentence renders with the expected logical
 * text, but the Latin run is visibly reordered, i.e. at least one pair of
 * logically adjacent run characters is drawn right to left. This is the
 * specific failure `assertContiguousLatinRun` exists to catch.
 */
function expectLatinRunReordered(root: Element, prefix: string, run: string, suffix: string): void {
  const { runChars } = measureSentence(root, prefix, run, suffix)
  expect(outOfOrderPairs(runChars)).not.toEqual([])
}

/**
 * Assert that `run` inside `prefix + ' ' + run + ' ' + suffix` is laid out as a
 * single contiguous left-to-right block (per-character Range rects advancing
 * strictly left to right with no gaps) and does not overlap either Arabic
 * neighbour (`prefix` stays to the right, `suffix` stays to the left).
 */
function assertContiguousLatinRun(
  root: Element,
  prefix: string,
  run: string,
  suffix: string,
): void {
  const { prefixChars, runChars, suffixChars } = measureSentence(root, prefix, run, suffix)
  expect(outOfOrderPairs(runChars)).toEqual([])

  const epsilon = 0.75

  for (const ch of runChars) {
    expect(ch.rect.width).toBeGreaterThan(0)
  }

  for (let i = 0; i < runChars.length - 1; i++) {
    const curr = runChars[i]!.rect
    const next = runChars[i + 1]!.rect
    expect(curr.left).toBeLessThan(next.left)
    expect(Math.abs(next.left - curr.right)).toBeLessThanOrEqual(epsilon)
  }

  const runBounds = {
    left: Math.min(...runChars.map(c => c.rect.left)),
    right: Math.max(...runChars.map(c => c.rect.right)),
  }

  const prefixPositive = prefixChars.filter(c => c.rect.width > 0)
  const suffixPositive = suffixChars.filter(c => c.rect.width > 0)
  expect(prefixPositive.length).toBeGreaterThan(0)
  expect(suffixPositive.length).toBeGreaterThan(0)

  // Preceding Arabic word sits strictly to the right of the Latin run with no overlap.
  for (const ar of prefixPositive) {
    expect(horizontalOverlap(ar.rect, runBounds)).toBeLessThanOrEqual(epsilon)
    expect(ar.rect.left).toBeGreaterThanOrEqual(runBounds.right - epsilon)
  }

  // Following Arabic word sits strictly to the left of the Latin run with no overlap.
  for (const ar of suffixPositive) {
    expect(horizontalOverlap(ar.rect, runBounds)).toBeLessThanOrEqual(epsilon)
    expect(ar.rect.right).toBeLessThanOrEqual(runBounds.left + epsilon)
  }
}

function createLineHost(): HTMLElement {
  const host = document.createElement('div')
  host.setAttribute('dir', 'rtl')
  host.style.cssText = 'white-space: pre; font-family: monospace, sans-serif; font-size: 20px; line-height: 1.5;'
  attachHost(host)
  return host
}

describe('BidiText and isolate per-character Range contiguity in real Chromium', () => {
  afterEach(() => {
    removeHosts()
    document.documentElement.removeAttribute('dir')
    document.documentElement.removeAttribute('lang')
  })

  it('keeps a Latin run with digits and brackets contiguous left-to-right with BidiText (element and chars strategies)', () => {
    const rtl = createRtl({ locales: { en: 'ltr', ar: 'rtl' }, defaultLocale: 'ar', syncDocument: false })
    try {
      for (const strategy of ['element', 'chars'] as const) {
        const host = createLineHost()
        const wrapper = mount(BidiText, {
          props: {
            as: 'p',
            strategy,
            text: SENTENCE,
          },
          global: { plugins: [rtl] },
          attachTo: host,
        })

        try {
          assertContiguousLatinRun(wrapper.element, PREFIX_AR, LATIN_RUN, SUFFIX_AR)
        }
        finally {
          wrapper.unmount()
          host.remove()
        }
      }
    }
    finally {
      rtl.dispose()
    }
  })

  it('keeps the same Latin run with digits and brackets contiguous left-to-right with isolate() and isolateRuns()', () => {
    for (const isolatedText of [
      `${PREFIX_AR} ${isolate(LATIN_RUN)} ${SUFFIX_AR}`,
      `${PREFIX_AR} ${isolate(LATIN_RUN, 'ltr')} ${SUFFIX_AR}`,
      isolateRuns(SENTENCE, 'rtl'),
    ]) {
      const host = createLineHost()
      const p = document.createElement('p')
      p.setAttribute('dir', 'rtl')
      p.textContent = isolatedText
      host.appendChild(p)

      try {
        assertContiguousLatinRun(p, PREFIX_AR, LATIN_RUN, SUFFIX_AR)
      }
      finally {
        host.remove()
      }
    }
  })

  it.each([
    { prefix: 'الطلب', run: '[v2] - 100', suffix: 'جاهز' },
    { prefix: 'الإصدار', run: '[2024] (v1.2)', suffix: 'متاح' },
  ])(
    'keeps "$run" contiguous in BidiText and isolate() while failing without isolation',
    ({ prefix, run, suffix }) => {
      const sentence = `${prefix} ${run} ${suffix}`
      const host = createLineHost()
      const wrapper = mount(
        {
          setup() {
            return () => h('div', [
              h(BidiText, { class: 'bidi-el', as: 'p', dir: 'rtl', text: sentence }),
              h('p', { class: 'isolated-str', dir: 'rtl' }, `${prefix} ${isolate(run)} ${suffix}`),
              h('p', { class: 'raw-control', dir: 'rtl' }, sentence),
            ])
          },
        },
        { attachTo: host },
      )

      try {
        assertContiguousLatinRun(host.querySelector('.bidi-el')!, prefix, run, suffix)
        assertContiguousLatinRun(host.querySelector('.isolated-str')!, prefix, run, suffix)
        expectLatinRunReordered(host.querySelector('.raw-control')!, prefix, run, suffix)
      }
      finally {
        wrapper.unmount()
        host.remove()
      }
    },
  )

  it('visibly reorders the control case when rendered without isolation, proving the check can fail', () => {
    const host = createLineHost()
    const wrapper = mount(
      {
        setup() {
          return () => h('div', [
            h('p', { class: 'plain-rtl', dir: 'rtl' }, SENTENCE),
            h(BidiText, { class: 'disabled-bidi', as: 'p', dir: 'rtl', enabled: false, text: SENTENCE }),
          ])
        },
      },
      { attachTo: host },
    )

    try {
      for (const selector of ['.plain-rtl', '.disabled-bidi']) {
        const el = host.querySelector(selector)!

        // Same logical text, but the run is drawn out of left-to-right order without isolation.
        expectLatinRunReordered(el, PREFIX_AR, LATIN_RUN, SUFFIX_AR)

        const chars = measureVisibleCharacters(el)
        const runStart = PREFIX_AR.length + 1
        const openParen = chars[runStart]! // '('
        const letterU = chars[runStart + 1]! // 'U'
        const closeParen = chars[runStart + 4]! // ')'
        const digitOne = chars[runStart + 6]! // '1'

        // Without isolation in an RTL paragraph, `(USD) 100` visibly reorders in Chromium:
        // '1' in "100" moves to the left of 'U' in "USD", '(' sits to the right of 'U',
        // and ')' sits to the left of 'U'.
        expect(digitOne.rect.left).toBeLessThan(letterU.rect.left)
        expect(openParen.rect.left).toBeGreaterThan(letterU.rect.left)
        expect(closeParen.rect.left).toBeLessThan(letterU.rect.left)
      }
    }
    finally {
      wrapper.unmount()
      host.remove()
    }
  })
})
