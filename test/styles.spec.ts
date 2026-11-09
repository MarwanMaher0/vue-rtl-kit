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
  beforeAll(() => {
    const style = document.createElement('style')
    style.textContent = css
    document.head.append(style)
    return () => style.remove()
  })

  afterEach(() => {
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

  it('keys off :dir() rather than any ancestor [dir] attribute', () => {
    expect(css).not.toMatch(/\[dir\s*=/)
    expect(css).toContain('.rtl-only:dir(ltr)')
    expect(css).toContain('.ltr-only:dir(rtl)')
    expect(css).toContain('.rtl-flip:dir(rtl)')
    expect(css).toContain('scale: -1 1')
    expect(css).not.toContain('transform: scaleX(-1)')
  })
})
