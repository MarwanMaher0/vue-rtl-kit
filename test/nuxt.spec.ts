// @vitest-environment node
import { execFile, spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { cp, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { fetch, setup } from '@nuxt/test-utils'

const run = promisify(execFile)
const rootDir = fileURLToPath(new URL('..', import.meta.url))
const fixtureDir = fileURLToPath(new URL('./fixtures/basic', import.meta.url))
const cookieFixtureDir = fileURLToPath(new URL('./fixtures/cookie', import.meta.url))
const registerGlobalsFixtureDir = fileURLToPath(new URL('./fixtures/register-globals', import.meta.url))
const componentsFixtureDir = fileURLToPath(new URL('./fixtures/components', import.meta.url))
const cssFixtureDir = fileURLToPath(new URL('./fixtures/css', import.meta.url))
const warningsFixtureDir = fileURLToPath(new URL('./fixtures/warnings', import.meta.url))
const warningsValidFixtureDir = fileURLToPath(new URL('./fixtures/warnings-valid', import.meta.url))
const warningsReplacedLocalesFixtureDir = fileURLToPath(new URL('./fixtures/warnings-replaced-locales', import.meta.url))
const warningsInlineFixtureDir = fileURLToPath(new URL('./fixtures/warnings-inline', import.meta.url))
const warningsExplicitConfigFixtureDir = fileURLToPath(new URL('./fixtures/warnings-explicit-config', import.meta.url))
const warningsExplicitInlineFixtureDir = fileURLToPath(new URL('./fixtures/warnings-explicit-inline', import.meta.url))
const warningsExplicitImportedFixtureDir = fileURLToPath(new URL('./fixtures/warnings-explicit-imported', import.meta.url))

/** Nuxt builds are the slow part; give them room on cold or loaded CI runners. */
const FIXTURE_TIMEOUT = 300_000
// The @nuxt/test-utils `setup()` in the basic fixture registers its own hooks,
// so raise the file-wide hook budget as well as passing the timeout explicitly.
vi.setConfig({ hookTimeout: FIXTURE_TIMEOUT })

interface BuiltFixture {
  server: ChildProcess
  baseUrl: string
  logs: () => string
}

async function modificationTimes(directory: string): Promise<number[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const times = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return modificationTimes(path)
    if (entry.isFile()) return [(await stat(path)).mtimeMs]
    return []
  }))
  return times.flat()
}

async function assertFreshBuild() {
  const missing = 'Nuxt SSR test requires dist/, but it is missing or empty. Run "npm run build" before running this test.'
  const stale = 'Nuxt SSR test found stale dist/. Run "npm run build" after changing source or build inputs.'
  let built: number[]
  try {
    built = await modificationTimes(join(rootDir, 'dist'))
  }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error(missing)
    throw error
  }
  if (!built.length) throw new Error(missing)
  const source = await Promise.all([
    modificationTimes(join(rootDir, 'src')),
    modificationTimes(join(rootDir, 'scripts')),
    ...[
      'package.json', 'package-lock.json', 'vite.config.ts', 'vite.nuxt.config.ts',
      'tsconfig.json', 'tsconfig.build.json',
    ].map(async file => [(await stat(join(rootDir, file))).mtimeMs]),
  ])
  if (Math.min(...built) < Math.max(...source.flat())) throw new Error(stale)
}

async function installPackedPackage(targetFixtureDir: string) {
  const packDir = await mkdtemp(join(tmpdir(), 'vue-rtl-kit-nuxt-'))
  try {
    const manifest = JSON.parse(await readFile(join(rootDir, 'package.json'), 'utf8')) as {
      files: string[]
      scripts?: Record<string, string>
    }
    await Promise.all(manifest.files.map(file => cp(join(rootDir, file), join(packDir, file), { recursive: true })))
    delete manifest.scripts
    await writeFile(join(packDir, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)
    const { stdout } = await run('npm', [
      'pack', '--ignore-scripts', '--json', '--offline', '--dry-run=false',
      '--pack-destination', packDir,
    ], { cwd: packDir })
    const [{ filename }] = JSON.parse(stdout) as [{ filename: string }]
    await rm(join(targetFixtureDir, 'node_modules/vue-rtl-kit'), { recursive: true, force: true })
    await run('npm', [
      'install', join(packDir, filename), '--ignore-scripts', '--offline', '--no-save',
      '--package-lock=false', '--legacy-peer-deps', '--no-audit', '--no-fund',
    ], { cwd: targetFixtureDir })
  }
  finally {
    await rm(packDir, { recursive: true, force: true })
  }
}

async function startBuiltFixture(directory: string): Promise<BuiltFixture> {
  await assertFreshBuild()
  await installPackedPackage(directory)
  await run(join(rootDir, 'node_modules/.bin/nuxt'), ['build'], { cwd: directory })

  const port = await new Promise<number>((resolvePort, reject) => {
    const probe = createServer()
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address()
      probe.close(() => resolvePort(typeof address === 'object' && address ? address.port : 0))
    })
  })
  const baseUrl = `http://127.0.0.1:${port}`
  const output: string[] = []
  const server = spawn(process.execPath, [join(directory, '.output/server/index.mjs')], {
    cwd: directory,
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  server.stdout?.on('data', chunk => output.push(String(chunk)))
  server.stderr?.on('data', chunk => output.push(String(chunk)))
  const logs = () => output.join('')
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const response = await globalThis.fetch(baseUrl)
      if (response.ok) return { server, baseUrl, logs }
    }
    catch { /* server is not up yet */ }
    await new Promise(resolveDelay => setTimeout(resolveDelay, 200))
  }
  server.kill()
  throw new Error(`Fixture server ${directory} did not start.`)
}

/** The stylesheet is either linked or inlined into the server-rendered HTML. */
function hasStylesheet(html: string): boolean {
  return /<link\b[^>]*\brel="stylesheet"/i.test(html)
    || html.includes('.rtl-flip')
    || html.includes('--rtl-space')
}

async function fetchFixture(baseUrl: string, logs?: () => string): Promise<string> {
  const response = await globalThis.fetch(`${baseUrl}/`)
  const html = await response.text()
  expect(response.status).toBe(200)
  expect(html).not.toContain('is not defined')
  if (logs) {
    await new Promise(resolveDelay => setTimeout(resolveDelay, 250))
    expect(logs()).not.toContain('[request error]')
  }
  return html
}

async function prepareFixture(directory: string): Promise<string> {
  await assertFreshBuild()
  await installPackedPackage(directory)
  const { stdout, stderr } = await run(join(rootDir, 'node_modules/.bin/nuxt'), ['prepare'], { cwd: directory })
  return `${stdout}\n${stderr}`
}

describe('built nuxt module SSR', async () => {
  await assertFreshBuild()
  await installPackedPackage(fixtureDir)

  await setup({ rootDir: fixtureDir })

  it('renders <html dir="rtl" lang="ar"> for an Arabic default locale', async () => {
    const response = await fetch('/')
    const html = await response.text()
    expect(response.status).toBe(200)
    expect(html).not.toContain('is not defined')
    const htmlTag = html.match(/<html\b[^>]*>/i)?.[0]
    expect(htmlTag).toBeDefined()
    expect(htmlTag).toMatch(/\sdir="rtl"(?=\s|>)/)
    expect(htmlTag).toMatch(/\slang="ar"(?=\s|>)/)
    expect(html).toContain('rtl|ar|right|-1|-12|1,234')
    expect(html).toContain('<bdi dir="ltr">12-05-2024</bdi>')
    expect(html).toContain('id="scoped-ltr"')
    // Cross-check for the `css: false` case: the stylesheet is linked or
    // inlined when (and only when) the module includes it.
    expect(hasStylesheet(html)).toBe(true)
  })
})

describe('built nuxt module SSR with cookie persistence', () => {
  // A second @nuxt/test-utils `setup()` in one file clobbers the shared test
  // context, so this fixture is built and served manually instead.
  let fixture: BuiltFixture | undefined

  beforeAll(async () => {
    fixture = await startBuiltFixture(cookieFixtureDir)
  }, FIXTURE_TIMEOUT)

  afterAll(() => {
    fixture?.server.kill()
  })

  const htmlTagOf = async (cookie?: string) => {
    const response = await globalThis.fetch(`${fixture!.baseUrl}/`, cookie ? { headers: { cookie } } : undefined)
    const html = await response.text()
    expect(response.status).toBe(200)
    expect(html).not.toContain('is not defined')
    return { html, htmlTag: html.match(/<html\b[^>]*>/i)?.[0] }
  }

  it('renders the default locale when no cookie is sent', async () => {
    const { html, htmlTag } = await htmlTagOf()
    expect(htmlTag).toMatch(/\sdir="ltr"(?=\s|>)/)
    expect(htmlTag).toMatch(/\slang="en"(?=\s|>)/)
    expect(html).toContain('ltr|en|left|1|12|1,234')
  })

  it('renders <html dir="rtl" lang="ar"> for a saved Arabic cookie', async () => {
    const { html, htmlTag } = await htmlTagOf('fixture-rtl=ar')
    expect(htmlTag).toMatch(/\sdir="rtl"(?=\s|>)/)
    expect(htmlTag).toMatch(/\slang="ar"(?=\s|>)/)
    expect(html).toContain('rtl|ar|right|-1|-12|1,234')
  })

  it('honours the locale:dir pair written back by the plugin', async () => {
    const { html, htmlTag } = await htmlTagOf('fixture-rtl=en%3Artl')
    expect(htmlTag).toMatch(/\sdir="rtl"(?=\s|>)/)
    expect(htmlTag).toMatch(/\slang="en"(?=\s|>)/)
    expect(html).toContain('rtl|en|right|-1|-12|1,234')
  })

  it('falls back to the default for unknown cookie values', async () => {
    for (const cookie of ['fixture-rtl=unknown', 'fixture-rtl=ar%3Asideways', 'fixture-rtl=%3A%3A']) {
      const { htmlTag } = await htmlTagOf(cookie)
      expect(htmlTag).toMatch(/\sdir="ltr"(?=\s|>)/)
      expect(htmlTag).toMatch(/\slang="en"(?=\s|>)/)
    }
  })

  it('serves every cookie variant without logging request errors', async () => {
    await htmlTagOf('fixture-rtl=ar')
    await new Promise(resolveDelay => setTimeout(resolveDelay, 250))
    expect(fixture!.logs()).not.toContain('[request error]')
  })
})

describe('built nuxt module with registerGlobals: false', () => {
  let fixture: BuiltFixture | undefined

  beforeAll(async () => {
    fixture = await startBuiltFixture(registerGlobalsFixtureDir)
  }, FIXTURE_TIMEOUT)

  afterAll(() => {
    fixture?.server.kill()
  })

  it('keeps Nuxt components but does not register either directive globally', async () => {
    const html = await fetchFixture(fixture!.baseUrl, fixture!.logs)
    expect(html).toContain('<bdi dir="ltr">12-05-2024</bdi>')
    expect(html).toMatch(/id="rtl-directive"[^>]*>false</)
    expect(html).toMatch(/id="digits-directive"[^>]*>false</)
  })
})

describe('built nuxt module with components: false', () => {
  let fixture: BuiltFixture | undefined

  beforeAll(async () => {
    fixture = await startBuiltFixture(componentsFixtureDir)
  }, FIXTURE_TIMEOUT)

  afterAll(() => {
    fixture?.server.kill()
  })

  it('still registers the runtime components and directive globally', async () => {
    const html = await fetchFixture(fixture!.baseUrl, fixture!.logs)
    expect(html).toMatch(/id="globals"[^>]*>true</)
    expect(html).toContain('<bdi dir="ltr">12-05-2024</bdi>')
    const preTag = html.match(/<pre\b[^>]*>/)?.[0]
    expect(preTag).toBeDefined()
    expect(preTag).toContain('id="directive"')
    expect(preTag).toContain('dir="ltr"')
  })
})

describe('built nuxt module with css: false', () => {
  let fixture: BuiltFixture | undefined

  beforeAll(async () => {
    fixture = await startBuiltFixture(cssFixtureDir)
  }, FIXTURE_TIMEOUT)

  afterAll(() => {
    fixture?.server.kill()
  })

  it('does not put the stylesheet in the HTML', async () => {
    const html = await fetchFixture(fixture!.baseUrl, fixture!.logs)
    expect(hasStylesheet(html)).toBe(false)
    expect(html).not.toContain('vue-rtl-kit/styles.css')
  })
})

describe('nuxt module logger warnings', () => {
  it('warns when defaultLocale is not configured and dir is invalid', async () => {
    const output = await prepareFixture(warningsFixtureDir)
    expect(output).toContain('defaultLocale "fr" is not one of the configured locales.')
    expect(output).toContain('rtl.dir must be "rtl" or "ltr"; received "sideways".')
  }, 240_000)

  it('does not warn when the defaultLocale language subtag is configured', async () => {
    const output = await prepareFixture(warningsValidFixtureDir)
    expect(output).not.toContain('is not one of the configured locales')
    expect(output).not.toContain('rtl.dir must be')
  }, 240_000)

  it('warns when replacing locales leaves the module default locale unlisted', async () => {
    const output = await prepareFixture(warningsReplacedLocalesFixtureDir)
    expect(output).toContain('defaultLocale "en" (module default) is not one of the configured locales; set rtl.defaultLocale')
  }, 240_000)

  it('warns for module options passed inline in the modules list', async () => {
    const output = await prepareFixture(warningsInlineFixtureDir)
    expect(output).toContain('defaultLocale "fr" is not one of the configured locales.')
  }, 240_000)

  it('uses the plain warning for an explicit default locale in the rtl config', async () => {
    const output = await prepareFixture(warningsExplicitConfigFixtureDir)
    expect(output).toContain('defaultLocale "en" is not one of the configured locales.')
    expect(output).not.toContain('(module default)')
  }, 240_000)

  it('uses the plain warning for an explicit inline default locale', async () => {
    const output = await prepareFixture(warningsExplicitInlineFixtureDir)
    expect(output).toContain('defaultLocale "en" is not one of the configured locales.')
    expect(output).not.toContain('(module default)')
  }, 240_000)

  it('uses the plain warning for an explicit default locale on the imported module', async () => {
    const output = await prepareFixture(warningsExplicitImportedFixtureDir)
    expect(output).toContain('defaultLocale "en" is not one of the configured locales.')
    expect(output).not.toContain('(module default)')
  }, 240_000)
})
