import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { formatPlural } from '../../src'
import type { PluralForms } from '../../src'
import { FSI, PDI } from '../../src/bidi'
import { attachHost, removeHosts } from './hosts'

const FILES: PluralForms = {
  zero: 'لا ملفات',
  one: 'ملف واحد',
  two: 'ملفان',
  few: '{count} ملفات',
  many: '{count} ملفًا',
  other: '{count} ملف',
}

const COUNTS = [0, 1, 2, 3, 11, 100] as const

const EXPECTED_LATN: Record<number, string> = {
  0: 'لا ملفات',
  1: 'ملف واحد',
  2: 'ملفان',
  3: '3 ملفات',
  11: '11 ملفًا',
  100: '100 ملف',
}

const EXPECTED_ARAB: Record<number, string> = {
  0: 'لا ملفات',
  1: 'ملف واحد',
  2: 'ملفان',
  3: '٣ ملفات',
  11: '١١ ملفًا',
  100: '١٠٠ ملف',
}

/**
 * Build a dir="rtl" list with one item per count, formatted through
 * formatPlural, and assert the rendered text and geometry: every item keeps
 * its exact UTF-16 text (combining marks such as the tanween in 'ملفًا' stay
 * attached), the list resolves to RTL, and every item's Range rects sit
 * inside the list's bounding box.
 */
function buildPluralList(numberingSystem?: 'latn'): { host: HTMLDivElement, ul: HTMLUListElement, items: HTMLLIElement[] } {
  const host = attachHost(document.createElement('div'))
  const ul = document.createElement('ul')
  ul.setAttribute('dir', 'rtl')
  ul.setAttribute('lang', 'ar')
  ul.style.cssText = 'margin: 0; padding: 8px 32px 8px 12px; width: 360px; font-size: 20px; line-height: 1.8;'

  const expected = numberingSystem === 'latn' ? EXPECTED_LATN : EXPECTED_ARAB
  for (const count of COUNTS) {
    const li = document.createElement('li')
    li.textContent = formatPlural(count, FILES, { locale: 'ar-EG', numberingSystem })
    expect(li.textContent).toBe(expected[count])
    ul.appendChild(li)
  }

  host.appendChild(ul)
  const items = Array.from(ul.querySelectorAll('li'))
  return { host, ul, items }
}

function assertRtlListGeometry(ul: HTMLUListElement, items: HTMLLIElement[], expectedTexts: string[]): void {
  expect(ul.getAttribute('dir')).toBe('rtl')
  expect(window.getComputedStyle(ul).direction).toBe('rtl')

  const ulRect = ul.getBoundingClientRect()
  expect(ulRect.width).toBeGreaterThan(0)
  expect(ulRect.height).toBeGreaterThan(0)

  const epsilon = 1.5
  items.forEach((li, index) => {
    expect(li.textContent).toBe(expectedTexts[index])
    expect(window.getComputedStyle(li).direction).toBe('rtl')

    const range = document.createRange()
    range.selectNodeContents(li)
    const rect = range.getBoundingClientRect()
    const clientRects = Array.from(range.getClientRects())
    expect(rect.width).toBeGreaterThan(0)
    expect(rect.height).toBeGreaterThan(0)
    expect(clientRects.length).toBeGreaterThan(0)
    expect(rect.left).toBeGreaterThanOrEqual(ulRect.left - epsilon)
    expect(rect.right).toBeLessThanOrEqual(ulRect.right + epsilon)
    expect(rect.top).toBeGreaterThanOrEqual(ulRect.top - epsilon)
    expect(rect.bottom).toBeLessThanOrEqual(ulRect.bottom + epsilon)

    // Each base+marks cluster keeps a positive-area rect inside its item, so
    // the tanween on 'ملفًا' never renders detached from its letter.
    const textNode = li.firstChild as Text
    const content = li.textContent ?? ''
    for (const cluster of content.matchAll(/\P{M}\p{M}*/gu)) {
      const clusterRange = document.createRange()
      clusterRange.setStart(textNode, cluster.index!)
      clusterRange.setEnd(textNode, cluster.index! + cluster[0].length)
      const cRect = clusterRange.getBoundingClientRect()
      expect(cRect.width).toBeGreaterThan(0)
      expect(cRect.height).toBeGreaterThan(0)
    }
  })

  // Items stack top to bottom in logical order regardless of direction.
  for (let i = 1; i < items.length; i++) {
    expect(items[i]!.getBoundingClientRect().top).toBeGreaterThanOrEqual(items[i - 1]!.getBoundingClientRect().bottom - epsilon)
  }
}

describe('Arabic plural forms in real Chromium', () => {
  afterEach(() => {
    removeHosts()
  })

  it('renders all six Arabic plural categories in a dir="rtl" list with Western digits', () => {
    const { ul, items } = buildPluralList('latn')
    expect(items.map(li => li.textContent)).toEqual(COUNTS.map(count => EXPECTED_LATN[count]))
    assertRtlListGeometry(ul, items, COUNTS.map(count => EXPECTED_LATN[count]!))
  })

  it('renders the same categories with Arabic-Indic digits by default', () => {
    const { ul, items } = buildPluralList()
    expect(items.map(li => li.textContent)).toEqual(COUNTS.map(count => EXPECTED_ARAB[count]))
    assertRtlListGeometry(ul, items, COUNTS.map(count => EXPECTED_ARAB[count]!))
  })

  it('keeps an isolated number inside the RTL item without reordering the sentence', () => {
    const host = attachHost(document.createElement('div'))
    const p = document.createElement('p')
    p.setAttribute('dir', 'rtl')
    p.setAttribute('lang', 'ar')
    p.style.cssText = 'margin: 0; padding: 8px; width: 360px; font-size: 20px;'
    const text = formatPlural(11, FILES, { locale: 'ar-EG', isolate: true })
    expect(text).toBe(`${FSI}١١${PDI} ملفًا`)
    p.textContent = text
    host.appendChild(p)

    expect(window.getComputedStyle(p).direction).toBe('rtl')
    const range = document.createRange()
    range.selectNodeContents(p)
    const rect = range.getBoundingClientRect()
    const pRect = p.getBoundingClientRect()
    expect(rect.width).toBeGreaterThan(0)
    expect(rect.left).toBeGreaterThanOrEqual(pRect.left - 1.5)
    expect(rect.right).toBeLessThanOrEqual(pRect.right + 1.5)
  })

  it('updates the rendered plural form reactively as the count changes', async () => {
    const count = ref(0)
    const host = attachHost(document.createElement('div'))
    const wrapper = mount(
      defineComponent({
        setup() {
          return () => h('ul', { dir: 'rtl', lang: 'ar', style: 'margin: 0; padding: 8px 32px; width: 360px; font-size: 20px;' }, [
            h('li', formatPlural(count.value, FILES, { locale: 'ar-EG', numberingSystem: 'latn' })),
          ])
        },
      }),
      { attachTo: host },
    )

    try {
      const ul = wrapper.element as HTMLUListElement
      expect(window.getComputedStyle(ul).direction).toBe('rtl')
      expect(ul.textContent).toBe('لا ملفات')

      for (const next of [1, 2, 3, 11, 100] as const) {
        count.value = next
        await nextTick()
        expect(ul.textContent).toBe(EXPECTED_LATN[next])
      }

      count.value = 11
      await nextTick()
      const items = Array.from(ul.querySelectorAll('li'))
      assertRtlListGeometry(ul, items, [EXPECTED_LATN[11]!])
    }
    finally {
      wrapper.unmount()
    }
  })
})