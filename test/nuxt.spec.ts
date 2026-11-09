// @vitest-environment node
import { execFile, spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { cp, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { fetch, setup } from '@nuxt/test-utils'

const run = promisify(execFile)
const rootDir = fileURLToPath(new URL('..', import.meta.url))
const fixtureDir = fileURLToPath(new URL('./fixtures/basic', import.meta.url))
const cookieFixtureDir = fileURLToPath(new URL('./fixtures/cookie', import.meta.url))

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
  })
})

describe('built nuxt module SSR with cookie persistence', () => {
  // A second @nuxt/test-utils `setup()` in one file clobbers the shared test
  // context, so this fixture is built and served manually instead.
  let server: ChildProcess | undefined
  let baseUrl = ''

  beforeAll(async () => {
    await assertFreshBuild()
    await installPackedPackage(cookieFixtureDir)
    await run(join(rootDir, 'node_modules/.bin/nuxt'), ['build'], { cwd: cookieFixtureDir })

    const port = await new Promise<number>((resolvePort, reject) => {
      const probe = createServer()
      probe.once('error', reject)
      probe.listen(0, '127.0.0.1', () => {
        const address = probe.address()
        probe.close(() => resolvePort(typeof address === 'object' && address ? address.port : 0))
      })
    })
    baseUrl = `http://127.0.0.1:${port}`
    server = spawn(process.execPath, [join(cookieFixtureDir, '.output/server/index.mjs')], {
      cwd: cookieFixtureDir,
      env: { ...process.env, HOST: '127.0.0.1', PORT: String(port) },
      stdio: 'ignore',
    })
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        const response = await globalThis.fetch(baseUrl)
        if (response.ok) return
      }
      catch { /* server is not up yet */ }
      await new Promise(resolveDelay => setTimeout(resolveDelay, 200))
    }
    throw new Error('Cookie fixture server did not start.')
  })

  afterAll(() => {
    server?.kill()
  })

  const htmlTagOf = async (cookie?: string) => {
    const response = await globalThis.fetch(`${baseUrl}/`, cookie ? { headers: { cookie } } : undefined)
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
})
