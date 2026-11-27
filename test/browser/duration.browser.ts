/**
 * Real-Chromium proof for formatDuration: an Arabic duration rendered inside
 * an RTL card reads right to left with its plural forms and digits intact, a
 * digital time keeps its h:mm:ss order inside the RTL line, and the strings
 * Chromium's own Intl.DurationFormat returns are the ones the fallback builds
 * from Intl.NumberFormat and Intl.ListFormat.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatDuration } from '../../src'
import type { DurationInput, DurationStyle, FormatDurationOptions } from '../../src'
import { resetDurationCache } from '../../src/duration'
import { attachHost, removeHosts } from './hosts'

const EPSILON = 0.75

interface DurationCard {
  card: HTMLElement
  label: HTMLElement
  value: HTMLElement
}

/** A video card as an Arabic page lays it out: label, then the duration. */
function createRtlCard(duration: string): DurationCard {
  const card = document.createElement('article')
  card.setAttribute('dir', 'rtl')
  card.setAttribute('lang', 'ar')
  card.style.cssText = 'width: 420px; padding: 16px; border: 1px solid #ccc; font-size: 20px; line-height: 1.6;'
  const label = document.createElement('h3')
  label.style.cssText = 'margin: 0 0 8px; font-size: 20px;'
  label.textContent = 'مدة الفيديو'
  const value = document.createElement('p')
  value.className = 'duration'
  value.style.cssText = 'margin: 0; white-space: pre;'
  value.textContent = duration
  card.append(label, value)
  attachHost(card)
  return { card, label, value }
}

/** The box of the characters from `start` to `end` in the element's text node. */
function rectOf(element: Element, start: number, end: number): DOMRect {
  const range = document.createRange()
  range.setStart(element.firstChild!, start)
  range.setEnd(element.firstChild!, end)
  return range.getBoundingClientRect()
}

/** The box of every space-separated word, in logical order. */
function wordRects(element: Element): { word: string, rect: DOMRect }[] {
  const text = element.textContent!
  return [...text.matchAll(/\S+/g)].map(match => ({
    word: match[0],
    rect: rectOf(element, match.index!, match.index! + match[0].length),
  }))
}

afterEach(() => {
  removeHosts()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  resetDurationCache()
})

describe('formatDuration in real Chromium', () => {
  it('renders an Arabic duration right to left inside an RTL card', () => {
    const duration = formatDuration({ hours: 2, minutes: 3 }, { locale: 'ar-EG', numberingSystem: 'arab' })
    // Dual without a number, then the 3-10 plural with an Arabic-Indic digit.
    expect(duration).toBe('ساعتان و٣ دقائق')

    const { card, label, value } = createRtlCard(duration)
    expect(getComputedStyle(value).direction).toBe('rtl')
    expect(value.textContent).toBe('ساعتان و٣ دقائق')

    const words = wordRects(value)
    expect(words.map(({ word }) => word)).toEqual(['ساعتان', 'و٣', 'دقائق'])
    for (const { rect } of words) expect(rect.width).toBeGreaterThan(0)

    // Each word sits to the left of the one before it: "ساعتان" is rightmost.
    for (let index = 1; index < words.length; index++) {
      expect(words[index]!.rect.right).toBeLessThanOrEqual(words[index - 1]!.rect.left + EPSILON)
    }

    // The digit follows the conjunction it is attached to, on its left.
    const conjunction = rectOf(value, duration.indexOf('و'), duration.indexOf('و') + 1)
    const digit = rectOf(value, duration.indexOf('٣'), duration.indexOf('٣') + 1)
    expect(digit.width).toBeGreaterThan(0)
    expect(digit.right).toBeLessThanOrEqual(conjunction.left + EPSILON)

    // The duration starts at the right edge of the card, under its label.
    const cardBox = card.getBoundingClientRect()
    const first = words[0]!.rect
    const last = words.at(-1)!.rect
    expect(Math.abs(first.right - rectOf(label, 0, label.textContent!.length).right)).toBeLessThanOrEqual(EPSILON)
    expect(first.right).toBeLessThanOrEqual(cardBox.right)
    expect(first.right).toBeGreaterThan(cardBox.left + cardBox.width / 2)
    expect(last.left).toBeGreaterThanOrEqual(cardBox.left)
  })

  it.each([
    ['Arabic-Indic', 'arab', '١:٠٢:٠٣'],
    ['Western', 'latn', '1:02:03'],
  ] as const)('keeps a digital time in h:mm:ss order inside the RTL card with %s digits', (_label, numberingSystem, expected) => {
    const time = formatDuration(3_723_000, { locale: 'ar-EG', numberingSystem, style: 'digital' })
    expect(time).toBe(expected)

    const { card, value } = createRtlCard(time)
    expect(getComputedStyle(value).direction).toBe('rtl')

    // Hours, minutes and seconds read left to right even though the line is RTL.
    const characters = Array.from(time, (_char, index) => rectOf(value, index, index + 1))
    for (const rect of characters) expect(rect.width).toBeGreaterThan(0)
    for (let index = 1; index < characters.length; index++) {
      expect(characters[index]!.left).toBeGreaterThanOrEqual(characters[index - 1]!.right - EPSILON)
    }

    // The time as a whole still starts at the right edge of the card.
    const cardBox = card.getBoundingClientRect()
    expect(characters.at(-1)!.right).toBeGreaterThan(cardBox.left + cardBox.width / 2)
    expect(characters.at(-1)!.right).toBeLessThanOrEqual(cardBox.right)
  })

  it('returns the strings Intl.DurationFormat returns when it is stubbed away', () => {
    const Native = (Intl as unknown as { DurationFormat?: { prototype: { format: (duration: DurationInput) => string } } }).DurationFormat
    // Chromium 129+ has it; this is the path the cards above went through.
    expect(typeof Native).toBe('function')
    const nativeFormat = vi.spyOn(Native!.prototype, 'format')

    const cases: [DurationInput | number, FormatDurationOptions][] = []
    for (const locale of ['ar', 'ar-EG', 'ar-SA', 'fa', 'he', 'en']) {
      for (const numberingSystem of ['latn', 'arab']) {
        for (const style of ['long', 'short', 'narrow', 'digital'] as DurationStyle[]) {
          const options = { locale, numberingSystem, style }
          for (const count of [1, 2, 3, 10, 11, 100]) cases.push([{ hours: count, minutes: count }, options])
          cases.push(
            [{ years: 1, months: 2, weeks: 3, days: 10, hours: 11, minutes: 100, seconds: 2, milliseconds: 3 }, options],
            [3_723_000, options],
            [-3_723_000, options],
            [{ hours: -1 }, options],
            [0, options],
            [{ minutes: 0 }, options],
            [5_400_000, { ...options, maxUnits: 1 }],
            [{ hours: 1.5 }, options],
          )
        }
      }
    }

    const withNative = cases.map(([duration, options]) => formatDuration(duration, options))
    expect(nativeFormat).toHaveBeenCalledTimes(cases.length)

    resetDurationCache()
    vi.stubGlobal('Intl', Object.create(Intl, { DurationFormat: { value: undefined } }))
    const withFallback = cases.map(([duration, options]) => formatDuration(duration, options))
    expect(nativeFormat).toHaveBeenCalledTimes(cases.length)

    expect(withFallback).toEqual(withNative)
    expect(withNative.every(text => text.length > 0)).toBe(true)
    expect(formatDuration({ hours: 2, minutes: 3 }, { locale: 'ar-EG', numberingSystem: 'arab' })).toBe('ساعتان و٣ دقائق')
    expect(formatDuration({ hours: 11, minutes: 2 }, { locale: 'ar', numberingSystem: 'latn' })).toBe('11 ساعة ودقيقتان')
  })
})
