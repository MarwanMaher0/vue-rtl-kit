import { afterEach, describe, expect, it } from 'vitest'
import type { Direction } from '../../src'
import { oppositeDirection } from '../../src'
import '../../src/styles/logical.css'
import { attachHost, removeHosts } from './hosts'

const DIRECTIONS: readonly Direction[] = ['ltr', 'rtl']

const ALL_COMBINATIONS: readonly [Direction, Direction, Direction][] = DIRECTIONS.flatMap(page =>
  DIRECTIONS.flatMap(island =>
    DIRECTIONS.map((inner): [Direction, Direction, Direction] => [page, island, inner]),
  ),
)

type LevelName = 'page' | 'island' | 'inner'

/**
 * Opposite-script text for a given inherited direction:
 * - On an LTR level, every element contains strong Arabic text so any
 *   jsdom/nwsapi-style text-content sniffing for `:dir()` would guess `rtl`.
 * - On an RTL level, every element contains strong Latin text so any
 *   text-content sniffing for `:dir()` would guess `ltr`.
 */
function oppositeScriptSample(expectedDir: Direction): string {
  return oppositeDirection(expectedDir) === 'rtl' ? 'مرحبا بالعالم' : 'Hello world'
}

function renderLevel(name: LevelName, expectedDir: Direction): string {
  const sample = oppositeScriptSample(expectedDir)
  return `<section data-level="${name}">`
    + `<span class="ltr-only">${sample}</span>`
    + `<span class="rtl-only">${sample}</span>`
    + `<span class="rtl-flip" style="transform: rotate(12deg)">${sample}<span class="rtl-noflip">${sample}</span></span>`
    + `<span class="rtl-scroll-x">${sample}</span>`
    + '</section>'
}

function renderFixture(page: Direction, island: Direction, inner: Direction): HTMLElement {
  document.documentElement.setAttribute('dir', page)
  const host = document.createElement('div')
  host.innerHTML = renderLevel('page', page)
    + `<div dir="${island}">${renderLevel('island', island)}<div dir="${inner}">${renderLevel('inner', inner)}</div></div>`
  attachHost(host)
  return host
}

function queryAtLevel(root: ParentNode, levelName: LevelName, className: string): HTMLElement {
  const el = root.querySelector(`[data-level="${levelName}"] > .${className}`)
  if (!el) throw new Error(`Missing .${className} at level ${levelName}`)
  return el as HTMLElement
}

function assertUtilitiesAtLevel(root: ParentNode, levelName: LevelName, expectedDir: Direction): void {
  const ltrOnly = window.getComputedStyle(queryAtLevel(root, levelName, 'ltr-only'))
  const rtlOnly = window.getComputedStyle(queryAtLevel(root, levelName, 'rtl-only'))
  const flip = queryAtLevel(root, levelName, 'rtl-flip')
  const flipStyle = window.getComputedStyle(flip)
  const noflip = flip.querySelector('.rtl-noflip') as HTMLElement
  const noflipStyle = window.getComputedStyle(noflip)
  const scrollStyle = window.getComputedStyle(queryAtLevel(root, levelName, 'rtl-scroll-x'))

  if (expectedDir === 'ltr') {
    expect(ltrOnly.display).toBe('inline')
    expect(rtlOnly.display).toBe('none')
    expect(flipStyle.scale).toBe('none')
    expect(noflipStyle.scale).toBe('none')
    expect(scrollStyle.direction).toBe('ltr')
  }
  else {
    expect(ltrOnly.display).toBe('none')
    expect(rtlOnly.display).toBe('inline')
    expect(flipStyle.scale).toBe('-1 1')
    expect(noflipStyle.scale).toBe('-1 1')
    expect(scrollStyle.direction).toBe('rtl')
  }

  // `.rtl-flip` uses independent `scale`, so inline `transform` resolves to a matrix and is preserved.
  expect(flipStyle.transform).toMatch(/^matrix\(/)
}

describe('styles/logical.css utilities in real Chromium', () => {
  afterEach(() => {
    removeHosts()
    document.documentElement.removeAttribute('dir')
  })

  it('runs in a real browser engine supporting selector(:dir(rtl))', () => {
    expect(ALL_COMBINATIONS).toHaveLength(8)
    expect(CSS.supports('selector(:dir(rtl))')).toBe(true)
    expect(navigator.userAgent).not.toMatch(/jsdom/i)
  })

  it.each(ALL_COMBINATIONS)(
    'computes .rtl-only, .ltr-only, .rtl-flip, .rtl-noflip and .rtl-scroll-x for page=%s > island=%s > inner=%s with opposite-script text',
    (page, island, inner) => {
      const host = renderFixture(page, island, inner)
      assertUtilitiesAtLevel(host, 'page', page)
      assertUtilitiesAtLevel(host, 'island', island)
      assertUtilitiesAtLevel(host, 'inner', inner)
    },
  )

  it('defaults pages with no dir attribute to :dir(ltr) even when fixture text is Arabic', () => {
    const host = document.createElement('div')
    host.innerHTML = '<span class="ltr-only">مرحبا</span><span class="rtl-only">مرحبا</span>'
    attachHost(host)

    expect(window.getComputedStyle(host.querySelector('.ltr-only')!).display).toBe('inline')
    expect(window.getComputedStyle(host.querySelector('.rtl-only')!).display).toBe('none')
  })

  it('keeps .rtl-scroll-x direction rtl via :dir(rtl) even when CSS direction was overridden on an ancestor', () => {
    document.documentElement.setAttribute('dir', 'rtl')
    const wrapper = document.createElement('div')
    wrapper.style.direction = 'ltr'
    wrapper.innerHTML = '<div class="rtl-scroll-x">Hello world</div>'
    attachHost(wrapper)

    const scroll = wrapper.querySelector('.rtl-scroll-x') as HTMLElement
    expect(window.getComputedStyle(scroll).direction).toBe('rtl')
  })
})
