import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

const css = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../src/styles/logical.css'),
  'utf8',
)

type Dir = 'ltr' | 'rtl'

function level(name: string): string {
  // jsdom/nwsapi also sniffs text content for :dir(), so fixture text matches each class's direction.
  return `<section data-level="${name}">`
    + '<span class="ltr-only">Hello</span>'
    + '<span class="rtl-only">مرحبا</span>'
    + '<span class="rtl-flip" style="transform: rotate(12deg)">&#8594;<span class="rtl-noflip">&#10003;</span></span>'
    + '<span class="rtl-scroll-x">scroll</span>'
    + '</section>'
}

function render(page: Dir, island: Dir, inner: Dir): void {
  document.documentElement.setAttribute('dir', page)
  document.body.innerHTML = level('page')
    + `<div dir="${island}">${level('island')}<div dir="${inner}">${level('inner')}</div></div>`
}

function element(levelName: string, className: string): HTMLElement {
  const found = document.querySelector(`[data-level="${levelName}"] > .${className}`)
  if (!found) throw new Error(`missing .${className} at ${levelName}`)
  return found as HTMLElement
}

function expectDirection(levelName: string, dir: Dir): void {
  const ltrOnly = window.getComputedStyle(element(levelName, 'ltr-only'))
  const rtlOnly = window.getComputedStyle(element(levelName, 'rtl-only'))
  const flip = element(levelName, 'rtl-flip')
  const flipStyle = window.getComputedStyle(flip)
  const noflip = flip.querySelector('.rtl-noflip') as HTMLElement
  const noflipStyle = window.getComputedStyle(noflip)
  const scrollStyle = window.getComputedStyle(element(levelName, 'rtl-scroll-x'))

  if (dir === 'ltr') {
    expect(ltrOnly.display).not.toBe('none')
    expect(rtlOnly.display).toBe('none')
    expect(flipStyle.scale).not.toBe('-1 1')
    expect(noflipStyle.scale).not.toBe('-1 1')
    expect(scrollStyle.direction).not.toBe('rtl')
  }
  else {
    expect(ltrOnly.display).toBe('none')
    expect(rtlOnly.display).not.toBe('none')
    expect(flipStyle.scale).toBe('-1 1')
    expect(noflipStyle.scale).toBe('-1 1')
    expect(scrollStyle.direction).toBe('rtl')
  }
  expect(flipStyle.transform).toBe('rotate(12deg)')
}

describe('styles/logical.css direction utilities', () => {
  let style: HTMLStyleElement

  beforeAll(() => {
    style = document.createElement('style')
    style.textContent = css
    document.head.append(style)
    return () => style.remove()
  })

  afterEach(() => {
    style.textContent = css
    document.body.innerHTML = ''
    document.documentElement.removeAttribute('dir')
  })

  it('uses the element\'s own direction in an rtl page > ltr island > rtl island', () => {
    render('rtl', 'ltr', 'rtl')
    expectDirection('page', 'rtl')
    expectDirection('island', 'ltr')
    expectDirection('inner', 'rtl')
  })

  it('uses the element\'s own direction in an ltr page > rtl island > ltr island', () => {
    render('ltr', 'rtl', 'ltr')
    expectDirection('page', 'ltr')
    expectDirection('island', 'rtl')
    expectDirection('inner', 'ltr')
  })

  it('hides rtl-only on pages with no dir attribute', () => {
    document.body.innerHTML = '<span class="rtl-only">RTL</span><span class="ltr-only">LTR</span>'
    expect(window.getComputedStyle(document.querySelector('.rtl-only')!).display).toBe('none')
    expect(window.getComputedStyle(document.querySelector('.ltr-only')!).display).not.toBe('none')
  })

  it('uses :dir() outside the guarded legacy fallback', () => {
    const rules = Array.from(style.sheet!.cssRules)
    const modernCss = rules.filter(rule => rule.type !== CSSRule.SUPPORTS_RULE)
      .map(rule => rule.cssText).join('\n')
    expect(modernCss).not.toMatch(/\[dir\s*=/)
    expect(modernCss).toContain('.rtl-only:dir(ltr)')
    expect(modernCss).toContain('.ltr-only:dir(rtl)')
    expect(modernCss).toContain('.rtl-flip:dir(rtl)')
    expect(modernCss).toContain('scale: -1 1')
    expect(modernCss).not.toContain('transform: scaleX(-1)')

    const supportsRules = rules.filter(rule => rule.type === CSSRule.SUPPORTS_RULE)
    expect(supportsRules).toHaveLength(1)
    const fallback = supportsRules[0] as CSSSupportsRule
    expect(fallback.conditionText).toBe('not selector(:dir(rtl))')
    const fallbackRules = Array.from(fallback.cssRules) as CSSStyleRule[]
    expect(fallbackRules.map(rule => rule.selectorText.replace(/\s+/g, ' '))).toEqual([
      "[dir='ltr'] .rtl-only, [dir='rtl'] .ltr-only",
      "[dir='rtl'] .rtl-flip",
      "[dir='rtl'] .rtl-flip .rtl-noflip",
      "[dir='rtl'] .rtl-scroll-x",
    ])
    expect(fallbackRules[0]!.style.getPropertyValue('display')).toBe('none')
    expect(fallbackRules[0]!.style.getPropertyPriority('display')).toBe('important')
    expect(fallbackRules[1]!.style.getPropertyValue('transform')).toBe('scaleX(-1)')
    expect(fallbackRules[2]!.style.getPropertyValue('transform')).toBe('scaleX(-1)')
    expect(fallbackRules[3]!.style.getPropertyValue('direction')).toBe('rtl')
  })

  it.each<Dir>(['rtl', 'ltr'])('retains explicit %s direction utilities in the legacy fallback', (dir) => {
    const fallback = Array.from(style.sheet!.cssRules)
      .find(rule => rule.type === CSSRule.SUPPORTS_RULE) as CSSSupportsRule
    style.textContent = Array.from(fallback.cssRules).map(rule => rule.cssText).join('\n')
    render(dir, dir, dir)
    for (const levelName of ['page', 'island', 'inner']) {
      const flip = element(levelName, 'rtl-flip')
      flip.style.removeProperty('transform')
      expect(window.getComputedStyle(element(levelName, 'ltr-only')).display === 'none').toBe(dir === 'rtl')
      expect(window.getComputedStyle(element(levelName, 'rtl-only')).display === 'none').toBe(dir === 'ltr')
      expect(window.getComputedStyle(flip).transform).toBe(dir === 'rtl' ? 'scaleX(-1)' : '')
      expect(window.getComputedStyle(flip.querySelector('.rtl-noflip')!).transform)
        .toBe(dir === 'rtl' ? 'scaleX(-1)' : '')
      expect(window.getComputedStyle(element(levelName, 'rtl-scroll-x')).direction)
        .toBe(dir === 'rtl' ? 'rtl' : '')
    }
  })
})
