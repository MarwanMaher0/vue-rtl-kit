import { afterEach, describe, expect, it } from 'vitest'
import { formatDateRange, formatNumberRange } from '../../src'
import { FSI, PDI } from '../../src/bidi'
import { attachHost, removeHosts } from './hosts'

const DATE_OPTIONS = { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' } as const
const PRICE_OPTIONS = { locale: 'ar-EG', numberingSystem: 'latn', style: 'currency', currency: 'EGP' } as const

/** The rendered rect of one UTF-16 slice of a text node. */
function rectOf(textNode: Text, start: number, end: number): DOMRect {
  const range = document.createRange()
  range.setStart(textNode, start)
  range.setEnd(textNode, end)
  const rect = range.getBoundingClientRect()
  expect(rect.width).toBeGreaterThan(0)
  expect(rect.height).toBeGreaterThan(0)
  return rect
}

function buildCard(): { card: HTMLDivElement, price: HTMLParagraphElement, dates: HTMLParagraphElement } {
  const card = attachHost(document.createElement('div'))
  card.setAttribute('dir', 'rtl')
  card.setAttribute('lang', 'ar')
  card.style.cssText = 'width: 360px; padding: 12px; font-size: 20px; line-height: 1.8;'

  const price = document.createElement('p')
  price.style.margin = '0'
  price.textContent = formatNumberRange(100, 250, PRICE_OPTIONS)

  const dates = document.createElement('p')
  dates.style.margin = '0'
  dates.textContent = formatDateRange('2024-03-03', '2024-03-05', { ...DATE_OPTIONS, locale: 'ar-EG', numberingSystem: 'latn' })

  card.appendChild(price)
  card.appendChild(dates)
  return { card, price, dates }
}

describe('Arabic ranges in a real Chromium RTL card', () => {
  afterEach(() => {
    removeHosts()
  })

  it('renders a price range and a date range with the start endpoint on the right', () => {
    const { card, price, dates } = buildCard()
    const epsilon = 1.5

    expect(price.textContent).toBe('\u200F100.00–250.00\u00A0ج.م.\u200F')
    expect(dates.textContent).toBe('3–5 مارس 2024')
    expect(window.getComputedStyle(card).direction).toBe('rtl')
    expect(window.getComputedStyle(price).direction).toBe('rtl')
    expect(window.getComputedStyle(dates).direction).toBe('rtl')

    const cardRect = card.getBoundingClientRect()
    const inside = (rect: DOMRect) => {
      expect(rect.left).toBeGreaterThanOrEqual(cardRect.left - epsilon)
      expect(rect.right).toBeLessThanOrEqual(cardRect.right + epsilon)
      expect(rect.top).toBeGreaterThanOrEqual(cardRect.top - epsilon)
      expect(rect.bottom).toBeLessThanOrEqual(cardRect.bottom + epsilon)
    }

    // The price range reads right-to-left: 100.00 (start) rightmost, then the
    // en dash, then 250.00 (end), then the single currency symbol on the left.
    const priceText = price.firstChild as Text
    const priceContent = price.textContent!
    const startPrice = rectOf(priceText, priceContent.indexOf('100.00'), priceContent.indexOf('100.00') + 6)
    const endPrice = rectOf(priceText, priceContent.indexOf('250.00'), priceContent.indexOf('250.00') + 6)
    const symbol = rectOf(priceText, priceContent.indexOf('ج.م.'), priceContent.indexOf('ج.م.') + 4)
    expect(endPrice.right).toBeLessThanOrEqual(startPrice.left + epsilon)
    expect(symbol.right).toBeLessThanOrEqual(endPrice.left + epsilon)
    for (const rect of [startPrice, endPrice, symbol]) inside(rect)

    // The date range collapses the shared month: '3–5 مارس 2024' reads 3
    // (start) on the right, 5 (end) to its left, then مارس, then 2024.
    const dateText = dates.firstChild as Text
    const dateContent = dates.textContent!
    const startDay = rectOf(dateText, dateContent.indexOf('3'), dateContent.indexOf('3') + 1)
    const endDay = rectOf(dateText, dateContent.indexOf('5'), dateContent.indexOf('5') + 1)
    const month = rectOf(dateText, dateContent.indexOf('مارس'), dateContent.indexOf('مارس') + 4)
    const year = rectOf(dateText, dateContent.indexOf('2024'), dateContent.indexOf('2024') + 4)
    expect(endDay.right).toBeLessThanOrEqual(startDay.left + epsilon)
    expect(month.right).toBeLessThanOrEqual(endDay.left + epsilon)
    expect(year.right).toBeLessThanOrEqual(month.left + epsilon)
    for (const rect of [startDay, endDay, month, year]) inside(rect)

    // The bug this replaces: a plain hyphen join keeps '100.00-250.00' as one
    // LTR digit run (hyphen-minus is a European separator), so the start ends
    // up on the LEFT inside the RTL card - the wrong reading order.
    const naive = document.createElement('p')
    naive.style.margin = '0'
    naive.textContent = '100.00-250.00'
    card.appendChild(naive)
    const naiveText = naive.firstChild as Text
    const naiveStart = rectOf(naiveText, 0, 6)
    const naiveEnd = rectOf(naiveText, 7, 13)
    expect(naiveStart.right).toBeLessThanOrEqual(naiveEnd.left + epsilon)
  })

  it('keeps the same visual order on the documented formatRange fallback', () => {
    const descriptor = Object.getOwnPropertyDescriptor(Intl.NumberFormat.prototype, 'formatRange')!
    delete (Intl.NumberFormat.prototype as { formatRange?: unknown }).formatRange
    try {
      const card = attachHost(document.createElement('div'))
      card.setAttribute('dir', 'rtl')
      card.setAttribute('lang', 'ar')
      card.style.cssText = 'width: 360px; padding: 12px; font-size: 20px;'
      const p = document.createElement('p')
      p.style.margin = '0'
      p.textContent = formatNumberRange(100, 250, { locale: 'ar-EG', numberingSystem: 'latn' })
      expect(p.textContent).toBe(`${FSI}100${PDI}–${FSI}250${PDI}`)
      card.appendChild(p)

      const text = p.firstChild as Text
      const content = p.textContent!
      const start = rectOf(text, content.indexOf('100'), content.indexOf('100') + 3)
      const end = rectOf(text, content.indexOf('250'), content.indexOf('250') + 3)
      // Each endpoint sits in its own first-strong isolate, so the start
      // still reads first (rightmost) in the RTL paragraph.
      expect(end.right).toBeLessThanOrEqual(start.left + 1.5)
    }
    finally {
      Object.defineProperty(Intl.NumberFormat.prototype, 'formatRange', descriptor)
    }
  })
})