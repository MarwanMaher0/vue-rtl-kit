// @vitest-environment node
/**
 * The guide pages are executable documentation. This file runs the SSR shell,
 * v-rtl and BidiText examples from `site/guide/ssr.md` through
 * vue/server-renderer and compares the documented server HTML with the real
 * render, and evaluates every `// →` result in `site/guide/text-helpers.md`
 * against the real functions, so a page cannot drift from the implementation.
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import {
  detectDirection,
  hasRtlCharacters,
  isolate,
  isolateRuns,
  splitBidiRuns,
  stripBidiControls,
} from '../src/bidi'
import { createRtl } from '../src/core'
import { directionOfLocale, resolveDirection } from '../src/locale'

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
  ...args: string[]
) => (...values: unknown[]) => Promise<unknown>

function readSite(path: string): Promise<string> {
  return readFile(fileURLToPath(new URL(`../site/${path}`, import.meta.url)), 'utf8')
}

function fencedBlocks(markdown: string, language?: string): string[] {
  return [...markdown.matchAll(/```([^\n]*)\n([\s\S]*?)```/g)]
    .filter(match => language === undefined || match[1]!.trim() === language)
    .map(match => match[2]!)
}

/** Collapse a documented HTML block to one line, as renderToString emits it. */
function joinHtmlLines(html: string): string {
  return html
    .split('\n')
    .map(line => line.trim())
    .join('')
}

/** Server-render a documented Vue template with the direction store installed. */
async function renderTemplate(template: string): Promise<string> {
  const app = createSSRApp({ template })
  app.use(createRtl({ locales: ['en', 'ar'], defaultLocale: 'ar' }))
  const html = await renderToString(app)
  return html.replace(/<!--\[-->|<!--\]-->/g, '')
}

function headingLevels(markdown: string): number[] {
  return [...markdown.matchAll(/^(#{1,6})\s+/gm)].map(match => match[1]!.length)
}

function section(markdown: string, heading: string): string {
  const start = markdown.indexOf(`## ${heading}`)
  if (start === -1) throw new Error(`Missing section: ${heading}`)
  const rest = markdown.slice(start)
  const end = rest.indexOf('\n## ', 1)
  return end === -1 ? rest : rest.slice(0, end)
}

interface DocumentedResult {
  expression: string
  expected: string
}

function documentedResults(markdown: string): DocumentedResult[] {
  const results: DocumentedResult[] = []
  const lines = markdown.split('\n')
  for (let index = 0; index < lines.length; index++) {
    const match = /^(.+?)\s+\/\/\s+→\s+(.+)$/.exec(lines[index]!.trim())
    if (!match) continue
    let expected = match[2]!.trim()
    // A long result continues on the following `//` comment lines.
    while (index + 1 < lines.length && /^\/\/(?!\s+→)/.test(lines[index + 1]!.trim())) {
      index++
      expected += ` ${lines[index]!.trim().replace(/^\/\/\s*/, '')}`
    }
    results.push({ expression: match[1]!.trim(), expected })
  }
  return results
}

async function evaluate(body: string, names: string[] = [], values: unknown[] = []): Promise<unknown> {
  return new AsyncFunction(...names, body)(...values)
}

describe('site guide examples', () => {
  it('renders the SSR shell example with dir and lang in the output', async () => {
    const markdown = await readSite('guide/ssr.md')
    const code = fencedBlocks(section(markdown, 'Manual Vue SSR shell'))[0]!
    const executable = code
      .replace(/^import .*$/gm, '')
      .replace(/^export /gm, '')

    const html = await evaluate(
      `${executable}\nreturn renderShell()`,
      ['createSSRApp', 'h', 'renderToString', 'createRtl'],
      [createSSRApp, h, renderToString, createRtl],
    )

    expect(typeof html).toBe('string')
    expect(html).toContain('<html dir="rtl" lang="ar">')
    expect(html).toContain('<main dir="rtl">مرحبا بالعالم</main>')

    const documented = fencedBlocks(section(markdown, 'Manual Vue SSR shell'), 'html')[0]!
    expect(html).toContain(documented.trimEnd())
  })

  it('renders the v-rtl example to its documented server HTML', async () => {
    const markdown = await readSite('guide/ssr.md')
    const examples = section(markdown, 'v-rtl getSSRProps')
    const template = fencedBlocks(examples, 'vue')[0]!.replace(/<\/?template>/g, '')
    const documented = fencedBlocks(examples, 'html')[0]!

    expect(await renderTemplate(template)).toBe(joinHtmlLines(documented))
  })

  it('renders the BidiText example to its documented server HTML', async () => {
    const markdown = await readSite('guide/ssr.md')
    const examples = section(markdown, 'Isolates in server HTML')
    const template = fencedBlocks(examples, 'vue')[0]!
    const documented = fencedBlocks(examples, 'html')[0]!

    expect(await renderTemplate(template)).toBe(joinHtmlLines(documented))
  })

  it('matches every documented text-helper result', async () => {
    const markdown = await readSite('guide/text-helpers.md')
    const results = documentedResults(markdown)
    const names = [
      'isolate',
      'isolateRuns',
      'splitBidiRuns',
      'detectDirection',
      'hasRtlCharacters',
      'stripBidiControls',
      'directionOfLocale',
      'resolveDirection',
    ]
    const values = [
      isolate,
      isolateRuns,
      splitBidiRuns,
      detectDirection,
      hasRtlCharacters,
      stripBidiControls,
      directionOfLocale,
      resolveDirection,
    ]

    expect(results.length).toBeGreaterThanOrEqual(20)
    for (const name of names) {
      expect(results.some(result => result.expression.includes(`${name}(`))).toBe(true)
    }

    for (const result of results) {
      const actual = await evaluate(`return (${result.expression})`, names, values)
      const expected = await evaluate(`return (${result.expected})`)
      expect({ expression: result.expression, value: actual }).toEqual({ expression: result.expression, value: expected })
    }
  })

  it('keeps the Arabic guides in the same heading order with the same code blocks', async () => {
    for (const path of ['guide/ssr.md', 'guide/browser-support.md', 'guide/text-helpers.md']) {
      const [english, arabic] = await Promise.all([readSite(path), readSite(`ar/${path}`)])
      expect({ path, headings: headingLevels(arabic) }).toEqual({ path, headings: headingLevels(english) })
      expect({ path, blocks: fencedBlocks(arabic) }).toEqual({ path, blocks: fencedBlocks(english) })
    }
  })
})
