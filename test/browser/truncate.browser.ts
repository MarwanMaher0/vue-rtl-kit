/**
 * Real-Chromium layout proof for truncateText: a truncated Arabic title
 * inside an LTR card must show the ellipsis at the *visual left* end (the
 * logical end of RTL text) when isolated, while the naive un-isolated string
 * strands it at the visual right end.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { truncateText } from '../../src/truncate'
import { attachHost, removeHosts } from './hosts'

const BIDI_CONTROL_CHAR = /[\u200E\u200F\u061C\u202A-\u202E\u2066-\u2069]/u
const ELLIPSIS = '\u2026'
const TITLE = 'الإصدار التجريبي من المكتبة متاح الآن للجميع'

interface CharRect {
  char: string
  rect: DOMRect
}

/** Measure every visible character of the card title in logical order. */
function measureTitle(title: Element): CharRect[] {
  const measurements: CharRect[] = []
  const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT)
  let node: Node | null = walker.nextNode()
  while (node) {
    const textNode = node as Text
    let offset = 0
    for (const ch of textNode.data) {
      const next = offset + ch.length
      if (!BIDI_CONTROL_CHAR.test(ch)) {
        const range = document.createRange()
        range.setStart(textNode, offset)
        range.setEnd(textNode, next)
        measurements.push({ char: ch, rect: range.getBoundingClientRect() })
      }
      offset = next
    }
    node = walker.nextNode()
  }
  return measurements
}

/** An LTR card with an Arabic heading, laid out like a real dashboard tile. */
function createLtrCard(text: string): HTMLElement {
  const card = document.createElement('div')
  card.setAttribute('dir', 'ltr')
  card.style.cssText = 'width: 480px; padding: 16px; font-size: 20px; line-height: 1.5; white-space: pre;'
  const heading = document.createElement('h3')
  heading.className = 'card-title'
  heading.textContent = text
  card.appendChild(heading)
  attachHost(card)
  return card
}

describe('truncateText ellipsis placement in real Chromium', () => {
  afterEach(() => {
    removeHosts()
  })

  it('puts the ellipsis at the visual left end of truncated Arabic inside an LTR card when isolated', () => {
    const truncated = truncateText(TITLE, 12, { isolate: true })
    expect(truncated.endsWith('\u2069')).toBe(true)
    const card = createLtrCard(truncated)
    const chars = measureTitle(card.querySelector('.card-title')!)
    const ellipsis = chars.filter(c => c.char === ELLIPSIS)
    const arabic = chars.filter(c => c.char !== ELLIPSIS && c.rect.width > 0)

    expect(ellipsis).toHaveLength(1)
    expect(arabic.length).toBeGreaterThan(0)

    const epsilon = 0.75
    const ellipsisRect = ellipsis[0]!.rect
    expect(ellipsisRect.width).toBeGreaterThan(0)
    // The ellipsis sits strictly left of every Arabic character: the visual
    // left end, which is the logical end of the RTL run.
    for (const ch of arabic) {
      expect(ellipsisRect.right).toBeLessThanOrEqual(ch.rect.left + epsilon)
    }
    expect(ellipsisRect.left).toBeLessThan(Math.min(...arabic.map(c => c.rect.left)))
  })

  it('control case: without isolate the same cut strands the ellipsis at the visual right end', () => {
    const truncated = truncateText(TITLE, 12)
    expect(truncated.endsWith(ELLIPSIS)).toBe(true)
    const card = createLtrCard(truncated)
    const chars = measureTitle(card.querySelector('.card-title')!)
    const ellipsis = chars.filter(c => c.char === ELLIPSIS)
    const arabic = chars.filter(c => c.char !== ELLIPSIS && c.rect.width > 0)

    expect(ellipsis).toHaveLength(1)
    expect(arabic.length).toBeGreaterThan(0)

    const epsilon = 0.75
    const ellipsisRect = ellipsis[0]!.rect
    for (const ch of arabic) {
      expect(ellipsisRect.left).toBeGreaterThanOrEqual(ch.rect.right - epsilon)
    }
  })

  it('wraps fitting Arabic text too, and it still lays out RTL inside the LTR card', () => {
    const fitting = truncateText('مرحبا بالعالم', 20, { isolate: true })
    expect(fitting).toBe('\u2068مرحبا بالعالم\u2069')
    const card = createLtrCard(fitting)
    const chars = measureTitle(card.querySelector('.card-title')!).filter(c => c.rect.width > 0)
    expect(chars.length).toBeGreaterThan(1)
    // RTL run: the first logical character is drawn rightmost.
    const first = chars[0]!.rect
    for (const ch of chars.slice(1)) {
      expect(first.left).toBeGreaterThan(ch.rect.left)
    }
  })

  it('keeps the ellipsis at the visual right end for truncated English in the same LTR card', () => {
    const card = createLtrCard(truncateText('Release notes for the library', 12, { isolate: true }))
    const chars = measureTitle(card.querySelector('.card-title')!)
    const ellipsis = chars.filter(c => c.char === ELLIPSIS)
    const latin = chars.filter(c => c.char !== ELLIPSIS && c.rect.width > 0)

    expect(ellipsis).toHaveLength(1)
    const epsilon = 0.75
    for (const ch of latin) {
      expect(ellipsis[0]!.rect.left).toBeGreaterThanOrEqual(ch.rect.right - epsilon)
    }
  })
})