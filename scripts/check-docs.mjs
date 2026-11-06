import { readFile, readdir, stat } from 'node:fs/promises'
import { dirname, extname, relative, resolve, sep } from 'node:path'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'
import { JSDOM } from 'jsdom'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const output = resolve(root, process.argv[2] || 'site/.vitepress/dist')
const site = new URL(process.env.SITE_URL || 'https://marwanmaher0.github.io/vue-rtl-kit/')
if (site.pathname === '/') site.pathname = '/vue-rtl-kit/'
if (!site.pathname.endsWith('/')) site.pathname += '/'
const errors = []
const pages = new Map()
const titles = new Map()
const descriptions = new Map()
let references = 0

function check(condition, message) {
  if (!condition) errors.push(message)
}

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const groups = await Promise.all(entries.map(entry => {
    const path = resolve(directory, entry.name)
    return entry.isDirectory() ? filesIn(path) : [path]
  }))
  return groups.flat()
}

function routeFor(path) {
  return path.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '')
}

function normalized(value) {
  return (value || '').replace(/\s+/gu, ' ').trim()
}

function single(document, selector, label) {
  const nodes = [...document.querySelectorAll(selector)]
  check(nodes.length === 1, `${label}: expected one ${selector}, found ${nodes.length}`)
  return nodes[0]
}

function meta(document, selector, label) {
  const content = single(document, selector, label)?.getAttribute('content')?.trim() || ''
  check(content.length > 0, `${label}: empty ${selector}`)
  return content
}

function unique(map, value, label, field) {
  check(!map.has(value), `${label}: duplicate ${field} with ${map.get(value)}`)
  map.set(value, label)
}

async function localTarget(url, label) {
  if (url.origin !== site.origin) return
  check(url.pathname.startsWith(site.pathname), `${label}: URL escapes site base: ${url.href}`)
  if (!url.pathname.startsWith(site.pathname)) return
  let pathname
  try {
    pathname = decodeURIComponent(url.pathname.slice(site.pathname.length))
  } catch {
    check(false, `${label}: malformed URL encoding: ${url.href}`)
    return
  }
  const path = resolve(output, pathname || '.')
  if (path !== output && !path.startsWith(`${output}${sep}`)) {
    check(false, `${label}: URL escapes output directory: ${url.href}`)
    return
  }
  const candidates = url.pathname.endsWith('/')
    ? [resolve(path, 'index.html')]
    : extname(path) ? [path] : [`${path}.html`, resolve(path, 'index.html'), path]
  for (const candidate of candidates) {
    try {
      if ((await stat(candidate)).isFile()) return candidate
    } catch {
      continue
    }
  }
  check(false, `${label}: missing internal target: ${url.href}`)
}

async function checkReference(value, base, label) {
  if (!value || value === '#') return
  let url
  try {
    url = new URL(value, base)
  } catch {
    check(false, `${label}: invalid URL: ${value}`)
    return
  }
  if (!['https:', 'http:'].includes(url.protocol) || url.origin !== site.origin) return
  references++
  const target = await localTarget(url, label)
  if (!target || !url.hash || !target.endsWith('.html')) return
  const targetPage = pages.get(target)
  check(Boolean(targetPage), `${label}: fragment target is not a parsed page: ${url.href}`)
  if (!targetPage) return
  let fragment
  try {
    fragment = decodeURIComponent(url.hash.slice(1)).split(':~:text=')[0]
  } catch {
    check(false, `${label}: malformed fragment: ${url.href}`)
    return
  }
  if (!fragment) return
  const namedAnchor = [...targetPage.document.querySelectorAll('a[name]')]
    .some(anchor => anchor.getAttribute('name') === fragment)
  check(Boolean(targetPage.document.getElementById(fragment)) || namedAnchor, `${label}: missing fragment: ${url.href}`)
}

async function main() {
  const files = await filesIn(output)
  const htmlFiles = files.filter(file => file.endsWith('.html'))
  check(htmlFiles.length > 0, 'No built HTML pages found; run npm run docs:build first')
  for (const file of htmlFiles) {
    const label = relative(output, file).split(sep).join('/')
    const canonical = new URL(routeFor(label), site).href
    const dom = new JSDOM(await readFile(file, 'utf8'), { url: canonical })
    pages.set(file, { document: dom.window.document, dom, label, canonical })
  }

  const indexable = [...pages.values()].filter(page => page.label !== '404.html')
  for (const { document, label, canonical } of pages.values()) {
    const title = single(document, 'head > title', label)?.textContent?.trim() || ''
    check(Boolean(title), `${label}: empty title`)
    unique(titles, title, label, 'title')
    const description = meta(document, 'meta[name="description"]', label)
    unique(descriptions, description, label, 'description')
    const canonicalLink = single(document, 'link[rel="canonical"]', label)?.getAttribute('href')
    check(canonicalLink === canonical, `${label}: canonical must be ${canonical}, got ${canonicalLink}`)
    check(meta(document, 'meta[property="og:title"]', label) === title, `${label}: OG title differs from title`)
    check(meta(document, 'meta[property="og:description"]', label) === description, `${label}: OG description differs`)
    check(meta(document, 'meta[property="og:url"]', label) === canonical, `${label}: OG URL differs from canonical`)
    check(meta(document, 'meta[property="og:image"]', label) === new URL('og-image.png', site).href, `${label}: incorrect OG image`)
    check(meta(document, 'meta[property="og:image:width"]', label) === '1200', `${label}: OG width must be 1200`)
    check(meta(document, 'meta[property="og:image:height"]', label) === '630', `${label}: OG height must be 630`)
    check(meta(document, 'meta[name="twitter:card"]', label) === 'summary_large_image', `${label}: incorrect Twitter card`)
    check(meta(document, 'meta[name="twitter:title"]', label) === title, `${label}: Twitter title differs`)
    check(meta(document, 'meta[name="twitter:description"]', label) === description, `${label}: Twitter description differs`)
    check(meta(document, 'meta[name="twitter:image"]', label) === new URL('og-image.png', site).href, `${label}: incorrect Twitter image`)
    const language = label.startsWith('ar/') ? 'ar' : 'en'
    check(document.documentElement.lang === language, `${label}: expected html lang=${language}`)
    check(document.documentElement.dir === (language === 'ar' ? 'rtl' : 'ltr'), `${label}: incorrect html direction`)
    const icon = single(document, 'link[rel="icon"]', label)
    check(icon?.getAttribute('href') === '/vue-rtl-kit/favicon.svg', `${label}: incorrect favicon path`)
    const arabicPreloads = [...document.querySelectorAll('link[rel="preload"][as="font"]')]
      .filter(link => (link.getAttribute('href') || '').includes('NotoSansArabic-arabic.woff2'))
    check(
      arabicPreloads.length === (language === 'ar' ? 1 : 0),
      `${label}: expected ${language === 'ar' ? 1 : 0} NotoSansArabic font preloads, found ${arabicPreloads.length}`,
    )

    if (label === '404.html') {
      check(/noindex/.test(meta(document, 'meta[name="robots"]', label)), `${label}: error page must be noindex`)
      continue
    }
    check(!/noindex/.test(document.querySelector('meta[name="robots"]')?.getAttribute('content') || ''), `${label}: documentation must be indexable`)
    const h1 = single(document, 'h1', label)
    const h1Text = normalized(h1?.textContent)
    check(Boolean(h1Text), `${label}: missing meaningful h1`)

    const tables = [...document.querySelectorAll('table')]
    const tableLabels = new Set()
    for (const table of tables) {
      check(table.getAttribute('tabindex') === '0', `${label}: table missing tabindex="0"`)
      const ariaLabel = normalized(table.getAttribute('aria-label'))
      check(Boolean(ariaLabel), `${label}: table missing aria-label`)
      check(!tableLabels.has(ariaLabel), `${label}: duplicate table aria-label "${ariaLabel}"`)
      tableLabels.add(ariaLabel)
      const headers = [...table.querySelectorAll('thead th')].map(th => normalized(th.textContent)).filter(Boolean)
      const expectedHeaders = headers.join(language === 'ar' ? '، ' : ', ')
      if (expectedHeaders) {
        check(
          ariaLabel.endsWith(`: ${expectedHeaders}`) || ariaLabel === expectedHeaders,
          `${label}: table aria-label "${ariaLabel}" must end with column headers "${expectedHeaders}"`,
        )
      }
      check(
        !ariaLabel.startsWith(`${h1Text}:`),
        `${label}: table aria-label "${ariaLabel}" must use section heading, not h1 "${h1Text}"`,
      )
      check(
        !/\((Table|جدول)\s+\d+\)$/.test(ariaLabel),
        `${label}: table aria-label "${ariaLabel}" has unnecessary counter`,
      )
    }
    const englishLabel = label.replace(/^ar\//, '')
    const alternateLabels = [englishLabel, `ar/${englishLabel}`, englishLabel]
    const paired = [englishLabel, `ar/${englishLabel}`].every(path => pages.has(resolve(output, path)))
    const alternates = [...document.querySelectorAll('link[rel="alternate"][hreflang]')]
    check(alternates.length === (paired ? 3 : 0), `${label}: expected ${paired ? 3 : 0} hreflang links`)
    for (const [position, lang] of ['en', 'ar', 'x-default'].entries()) {
      if (!paired) break
      const href = new URL(routeFor(alternateLabels[position]), site).href
      check(alternates.filter(link => link.getAttribute('hreflang') === lang && link.getAttribute('href') === href).length === 1, `${label}: missing reciprocal ${lang} alternate ${href}`)
    }

    const schemas = []
    for (const element of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const schema = JSON.parse(element.textContent)
        check(schema['@context'] === 'https://schema.org', `${label}: incorrect JSON-LD context`)
        schemas.push(schema)
      } catch {
        check(false, `${label}: invalid JSON-LD`)
      }
    }
    const landing = englishLabel === 'index.html'
    const expectedTypes = landing ? ['SoftwareSourceCode', 'FAQPage'] : ['BreadcrumbList']
    check(schemas.length === expectedTypes.length, `${label}: unexpected JSON-LD count`)
    for (const type of expectedTypes) {
      check(schemas.filter(schema => schema['@type'] === type).length === 1, `${label}: expected one ${type} schema`)
    }
    const software = schemas.find(schema => schema['@type'] === 'SoftwareSourceCode')
    if (software) {
      check(software.url === canonical && software.description === description && software.inLanguage === language, `${label}: software metadata differs from page`)
      check(software.codeRepository === 'https://github.com/MarwanMaher0/vue-rtl-kit' && software.version === '0.1.1', `${label}: incorrect source repository or version`)
    }
    const faq = schemas.find(schema => schema['@type'] === 'FAQPage')
    if (faq) {
      check(faq.url === canonical && faq.inLanguage === language, `${label}: FAQ URL or language differs`)
      const questions = Array.isArray(faq.mainEntity) ? faq.mainEntity : []
      check(questions.length === 7, `${label}: expected seven shared FAQ entries`)
      const rendered = normalized(document.body.textContent)
      for (const question of questions) {
        check(question['@type'] === 'Question' && question.acceptedAnswer?.['@type'] === 'Answer', `${label}: malformed FAQ entry`)
        check(Boolean(question.name) && rendered.includes(normalized(question.name)), `${label}: FAQ question missing from rendered markup: ${question.name}`)
        check(Boolean(question.acceptedAnswer?.text) && rendered.includes(normalized(question.acceptedAnswer?.text)), `${label}: FAQ answer differs from rendered markup: ${question.name}`)
      }
    }
    const breadcrumb = schemas.find(schema => schema['@type'] === 'BreadcrumbList')
    if (breadcrumb) {
      const items = breadcrumb.itemListElement || []
      check(items.length >= 2, `${label}: breadcrumb needs home and current page`)
      check(items.at(-1)?.item === canonical, `${label}: breadcrumb does not end at canonical`)
      check(items[0]?.item === new URL(language === 'ar' ? 'ar/' : '', site).href, `${label}: breadcrumb home has wrong locale`)
      for (const [index, item] of items.entries()) {
        check(item['@type'] === 'ListItem' && item.position === index + 1 && Boolean(item.name), `${label}: malformed breadcrumb item`)
        if (item.item) await checkReference(item.item, canonical, label)
      }
    }
  }

  for (const { document, label, canonical } of pages.values()) {
    for (const element of document.querySelectorAll('[href], [src]')) {
      for (const attribute of ['href', 'src']) {
        if (element.hasAttribute(attribute)) await checkReference(element.getAttribute(attribute), canonical, label)
      }
    }
  }

  const sitemap = new JSDOM(await readFile(resolve(output, 'sitemap.xml'), 'utf8'), { contentType: 'text/xml' })
  const locations = [...sitemap.window.document.querySelectorAll('url > loc')].map(node => node.textContent)
  check(locations.length === new Set(locations).size, 'sitemap.xml: duplicate URLs')
  check(locations.length === indexable.length, 'sitemap.xml: page count differs from indexable HTML')
  for (const page of indexable) check(locations.includes(page.canonical), `sitemap.xml: missing ${page.canonical}`)
  for (const location of locations) {
    check(indexable.some(page => page.canonical === location), `sitemap.xml: unexpected URL ${location}`)
    await checkReference(location, site, 'sitemap.xml')
  }
  for (const entry of sitemap.window.document.querySelectorAll('url')) {
    const page = indexable.find(candidate => candidate.canonical === entry.querySelector('loc')?.textContent)
    if (!page) continue
    const expected = [...page.document.querySelectorAll('link[rel="alternate"][hreflang]')]
    const links = [...entry.getElementsByTagNameNS('http://www.w3.org/1999/xhtml', 'link')]
    check(links.length === expected.length, `sitemap.xml: alternate count differs for ${page.label}`)
    for (const link of expected) {
      check(links.some(item => item.getAttribute('hreflang') === link.getAttribute('hreflang') && item.getAttribute('href') === link.getAttribute('href')), `sitemap.xml: alternate mismatch for ${page.label}`)
    }
  }
  sitemap.window.close()

  const robots = await readFile(resolve(output, 'robots.txt'), 'utf8')
  for (const agent of ['*', 'GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']) {
    const group = robots.split(/\n\s*\n/).find(block => block.split('\n').some(line => line.trim() === `User-agent: ${agent}`))
    check(Boolean(group) && /^Allow:\s*\/\s*$/m.test(group) && !/^Disallow:\s*\S/m.test(group), `robots.txt: ${agent} must be allowed`)
  }
  check(robots.includes(`Sitemap: ${new URL('sitemap.xml', site).href}`), 'robots.txt: incorrect sitemap URL')
  for (const name of ['llms.txt', 'llms-full.txt']) {
    const text = await readFile(resolve(output, name), 'utf8')
    check(text.includes('github:MarwanMaher0/vue-rtl-kit#v0.1.1'), `${name}: missing tagged installation guidance`)
    check(text.length >= (name === 'llms-full.txt' ? 10000 : 1000), `${name}: content is too short to be a substantive reference`)
    for (const match of text.matchAll(/https?:\/\/[^\s)<>]+/g)) await checkReference(match[0], site, name)
  }
  const image = await readFile(resolve(output, 'og-image.png'))
  check(image.length >= 24 && image.subarray(1, 4).toString() === 'PNG' && image.readUInt32BE(16) === 1200 && image.readUInt32BE(20) === 630, 'og-image.png: expected a 1200x630 PNG')

  const landingCopySource = await readFile(resolve(root, 'site/.vitepress/theme/landing-copy.ts'), 'utf8')
  const landingVueSource = await readFile(resolve(root, 'site/.vitepress/theme/components/LandingPage.vue'), 'utf8')
  const bidiDemoSource = await readFile(resolve(root, 'site/.vitepress/theme/components/BidiDemo.vue'), 'utf8')
  const customCssSource = await readFile(resolve(root, 'site/.vitepress/theme/custom.css'), 'utf8')

  check(landingVueSource.includes("from '../landing-copy'"), 'LandingPage.vue: must import landingCopy from ../landing-copy')
  check(bidiDemoSource.includes("from '../landing-copy'"), 'BidiDemo.vue: must import landingCopy from ../landing-copy')
  check(!landingVueSource.includes('12-05-2024') && !landingVueSource.includes('2024 - 05 - 12'), 'LandingPage.vue: must derive date strings from landingCopy sourceText')
  check(!bidiDemoSource.includes('12-05-2024'), 'BidiDemo.vue: must read sample strings from landingCopy')
  for (const [name, content] of [
    ['landing-copy.ts', landingCopySource],
    ['LandingPage.vue', landingVueSource],
    ['BidiDemo.vue', bidiDemoSource],
  ]) {
    check(!/140\+|6\s*KB|35\+/.test(content), `${name}: must not contain stale hardcoded counters`)
  }
  for (const landingFile of ['index.html', 'ar/index.html']) {
    const landingPage = pages.get(resolve(output, landingFile))
    const bodyText = normalized(landingPage?.document.body.textContent)
    check(bodyText.includes('12-05-2024') && bodyText.includes('2024 - 05 - 12'), `${landingFile}: missing derived comparison dates in rendered HTML`)
  }

  check(!/--vp-font-family-mono:[^;]*Noto Sans Arabic/.test(customCssSource), 'custom.css: --vp-font-family-mono must not include Noto Sans Arabic')
  check(!/:root\s*\{[^}]*--vp-font-family-base:[^;]*Noto Sans Arabic/.test(customCssSource), 'custom.css: :root --vp-font-family-base must not include Noto Sans Arabic')
  check(!/^\.lab-index\s*\{[^}]*Noto Sans Arabic/m.test(customCssSource), 'custom.css: unscoped .lab-index must not include Noto Sans Arabic')
  check(!/^\.comparison-badge\s*\{[^}]*Noto Sans Arabic/m.test(customCssSource), 'custom.css: unscoped .comparison-badge must not include Noto Sans Arabic')

  for (const { dom } of pages.values()) dom.window.close()

  if (errors.length) {
    process.stderr.write(`Documentation checks failed (${errors.length}):\n${errors.map(error => `- ${error}`).join('\n')}\n`)
    process.exitCode = 1
  } else {
    process.stdout.write(`Documentation checks passed: ${indexable.length} indexable pages, ${references} internal references, metadata, JSON-LD, hreflang, sitemap, robots, and LLM references. No external network requests.\n`)
  }
}

main().catch(error => {
  process.stderr.write(`Documentation checks could not finish: ${error.message}\n${errors.join('\n')}\n`)
  process.exitCode = 1
})
