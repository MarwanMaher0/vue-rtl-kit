import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { findSearchMatches, matchesSearch } from '../../src'
import type { SearchOptions } from '../../src'
import { attachHost, removeHosts } from './hosts'

const LEADING_COMBINING_MARK = /^\p{M}/u

function buildHighlightedParagraph(
  text: string,
  query: string,
  options?: SearchOptions,
  nowrap = false,
): { host: HTMLDivElement, p: HTMLParagraphElement, marks: HTMLElement[] } {
  const host = attachHost(document.createElement('div'))
  const p = document.createElement('p')
  p.setAttribute('dir', 'rtl')
  p.style.cssText = [
    'margin: 0;',
    'padding: 8px 12px;',
    'font-size: 20px;',
    'line-height: 1.8;',
    nowrap ? 'white-space: nowrap; display: inline-block;' : 'width: 480px;',
  ].join(' ')

  const ranges = findSearchMatches(text, query, options)
  let cursor = 0
  for (const { start, end } of ranges) {
    if (start > cursor) {
      p.appendChild(document.createTextNode(text.slice(cursor, start)))
    }
    const mark = document.createElement('mark')
    mark.textContent = text.slice(start, end)
    p.appendChild(mark)
    cursor = end
  }
  if (cursor < text.length) {
    p.appendChild(document.createTextNode(text.slice(cursor)))
  }

  host.appendChild(p)
  const marks = Array.from(p.querySelectorAll('mark'))
  return { host, p, marks }
}

/**
 * Assert that wrapping `findSearchMatches` slices in `<mark>` inside `p`:
 * 1. Preserves the exact original UTF-16 text across `p.childNodes`.
 * 2. Leaves every `<mark>` and every surrounding `Text` node starting on a base
 *    character (never an orphaned combining mark / harakat / niqqud).
 * 3. Produces positive-area `Range` rects inside the paragraph's bounding box.
 */
function assertMarksAndRangeRectsInsideParagraph(
  p: HTMLElement,
  originalText: string,
  expectedMarkTexts: string[],
): DOMRect[] {
  expect(p.getAttribute('dir')).toBe('rtl')
  expect(window.getComputedStyle(p).direction).toBe('rtl')
  expect(p.textContent).toBe(originalText)

  for (const child of Array.from(p.childNodes)) {
    const text = child.textContent ?? ''
    if (text.length > 0) {
      expect(LEADING_COMBINING_MARK.test(text)).toBe(false)
    }
  }

  const marks = Array.from(p.querySelectorAll('mark'))
  expect(marks.map(m => m.textContent)).toEqual(expectedMarkTexts)

  const pRect = p.getBoundingClientRect()
  expect(pRect.width).toBeGreaterThan(0)
  expect(pRect.height).toBeGreaterThan(0)

  const epsilon = 1.5
  const rangeRects: DOMRect[] = []

  for (const mark of marks) {
    const content = mark.textContent ?? ''
    expect(content.length).toBeGreaterThan(0)
    expect(LEADING_COMBINING_MARK.test(content)).toBe(false)

    const range = document.createRange()
    range.selectNodeContents(mark)
    const rect = range.getBoundingClientRect()
    const clientRects = Array.from(range.getClientRects())

    expect(rect.width).toBeGreaterThan(0)
    expect(rect.height).toBeGreaterThan(0)
    expect(clientRects.length).toBeGreaterThan(0)

    expect(rect.left).toBeGreaterThanOrEqual(pRect.left - epsilon)
    expect(rect.right).toBeLessThanOrEqual(pRect.right + epsilon)
    expect(rect.top).toBeGreaterThanOrEqual(pRect.top - epsilon)
    expect(rect.bottom).toBeLessThanOrEqual(pRect.bottom + epsilon)

    for (const cr of clientRects) {
      expect(cr.width).toBeGreaterThan(0)
      expect(cr.height).toBeGreaterThan(0)
      expect(cr.left).toBeGreaterThanOrEqual(pRect.left - epsilon)
      expect(cr.right).toBeLessThanOrEqual(pRect.right + epsilon)
      expect(cr.top).toBeGreaterThanOrEqual(pRect.top - epsilon)
      expect(cr.bottom).toBeLessThanOrEqual(pRect.bottom + epsilon)
    }

    // Measure every base+marks cluster inside the <mark>'s Text node and ensure
    // each cluster's Range rect also sits inside the <mark> and paragraph boxes.
    const textNode = mark.firstChild as Text
    const markRect = mark.getBoundingClientRect()
    for (const cluster of content.matchAll(/\P{M}\p{M}*/gu)) {
      const start = cluster.index!
      const end = start + cluster[0].length
      const clusterRange = document.createRange()
      clusterRange.setStart(textNode, start)
      clusterRange.setEnd(textNode, end)
      const cRect = clusterRange.getBoundingClientRect()
      expect(cRect.width).toBeGreaterThan(0)
      expect(cRect.left).toBeGreaterThanOrEqual(markRect.left - epsilon)
      expect(cRect.right).toBeLessThanOrEqual(markRect.right + epsilon)
      expect(cRect.left).toBeGreaterThanOrEqual(pRect.left - epsilon)
      expect(cRect.right).toBeLessThanOrEqual(pRect.right + epsilon)
    }

    rangeRects.push(rect)
  }

  return rangeRects
}

describe('RTL search highlight ranges in real Chromium', () => {
  afterEach(() => {
    removeHosts()
    document.documentElement.removeAttribute('dir')
    document.documentElement.removeAttribute('lang')
  })

  it('wraps vocalized Arabic matches in <mark> inside a dir="rtl" paragraph without splitting harakat, keeping Range rects inside the paragraph', () => {
    const text = 'الْمُؤَلِّفُ: مُحَمَّدٌ أَحْمَدُ، وَعـبـدُٱللَّهِ مُحَمَّدٍ فِي الْقَاهِرَةِ ١٢٣'
    expect(matchesSearch(text, 'محمد')).toBe(true)

    const { p } = buildHighlightedParagraph(text, 'محمد', undefined, true)
    const rects = assertMarksAndRangeRectsInsideParagraph(p, text, ['مُحَمَّدٌ', 'مُحَمَّدٍ'])

    // On a single RTL line, the first logical occurrence sits to the right of the second.
    expect(rects[0]!.left).toBeGreaterThanOrEqual(rects[1]!.right - 1.5)
  })

  it('keeps trailing shadda and harakat attached when highlighting a prefix of a vocalized Arabic word', () => {
    const text = 'بِأَحْمَدَ وَمُحَمَّدٌ وَفَاطِمَةُ وَمُصْطَفَىٰ'

    // Partial match 'محم' inside 'مُحَمَّدٌ' extends end over shadda + fatha on 'م'
    // while leaving 'دٌ' intact in the following text node.
    const { p: partialP } = buildHighlightedParagraph(text, 'محم')
    assertMarksAndRangeRectsInsideParagraph(partialP, text, ['مُحَمَّ'])

    // Preceding 'بِ' stays outside <mark> with its kasra intact when matching 'احمد'.
    const { p: prefixedP } = buildHighlightedParagraph(text, 'احمد')
    assertMarksAndRangeRectsInsideParagraph(prefixedP, text, ['أَحْمَدَ'])

    // Ta marbuta and alef maqsura with superscript alef keep all trailing marks inside <mark>.
    const { p: namesP } = buildHighlightedParagraph(text, 'فاطمه ومصطفي')
    assertMarksAndRangeRectsInsideParagraph(namesP, text, ['فَاطِمَةُ وَمُصْطَفَىٰ'])
  })

  it('preserves exact UTF-16 highlight rects across emoji surrogate pairs, lam-alef ligatures, Persian, and pointed Hebrew', () => {
    const arabicWithEmojiAndLigature = '😀 سﻼمٌ ﻷَحْمَدَ 👨‍👩‍👧 فِي مِصْرَ'
    const { p: ligatureP } = buildHighlightedParagraph(arabicWithEmojiAndLigature, 'لاحمد')
    assertMarksAndRangeRectsInsideParagraph(ligatureP, arabicWithEmojiAndLigature, ['ﻷَحْمَدَ'])

    const persian = 'کتابخانهٔ مِلّیِ علی ۱۲۳ در تهران'
    const { p: persianP } = buildHighlightedParagraph(persian, 'كتابخانه ملي علي 123')
    assertMarksAndRangeRectsInsideParagraph(persianP, persian, ['کتابخانهٔ مِلّیِ علی ۱۲۳'])

    const hebrew = 'שָׁלוֹם לְדָּוִד וּלְמֹשֶׁה בִּירוּשָׁלַיִם'
    const { p: hebrewP } = buildHighlightedParagraph(hebrew, 'דוד')
    assertMarksAndRangeRectsInsideParagraph(hebrewP, hebrew, ['דָּוִד'])
  })

  it('renders reactive Vue <mark> highlights inside a dir="rtl" paragraph as the query changes', async () => {
    const text = 'مُحَمَّدٌ أَحْمَدُ — فَاطِمَةُ الزَّهْرَاءُ ٤٢'
    const query = ref('احمد')
    const host = attachHost(document.createElement('div'))

    const wrapper = mount(
      defineComponent({
        setup() {
          return () => {
            const ranges = findSearchMatches(text, query.value)
            const nodes: Array<string | ReturnType<typeof h>> = []
            let cursor = 0
            for (const { start, end } of ranges) {
              if (start > cursor) nodes.push(text.slice(cursor, start))
              nodes.push(h('mark', text.slice(start, end)))
              cursor = end
            }
            if (cursor < text.length) nodes.push(text.slice(cursor))
            return h('p', { dir: 'rtl', style: 'margin: 0; padding: 8px; width: 420px; font-size: 20px;' }, nodes)
          }
        },
      }),
      { attachTo: host },
    )

    try {
      const p = wrapper.element as HTMLElement
      assertMarksAndRangeRectsInsideParagraph(p, text, ['أَحْمَدُ'])

      query.value = 'فاطمه الزهراء 42'
      await nextTick()
      assertMarksAndRangeRectsInsideParagraph(p, text, ['فَاطِمَةُ الزَّهْرَاءُ ٤٢'])

      query.value = ''
      await nextTick()
      assertMarksAndRangeRectsInsideParagraph(p, text, [])
    }
    finally {
      wrapper.unmount()
    }
  })
})
