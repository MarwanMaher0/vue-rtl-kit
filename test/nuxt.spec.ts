// @vitest-environment node
import { execFile } from 'node:child_process'
import { cp, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'
import { fetch, setup } from '@nuxt/test-utils'

const run = promisify(execFile)
const rootDir = fileURLToPath(new URL('..', import.meta.url))
const fixtureDir = fileURLToPath(new URL('./fixtures/basic', import.meta.url))

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

describe('built nuxt module SSR', async () => {
  await assertFreshBuild()
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
    await rm(join(fixtureDir, 'node_modules/vue-rtl-kit'), { recursive: true, force: true })
    await run('npm', [
      'install', join(packDir, filename), '--ignore-scripts', '--offline', '--no-save',
      '--package-lock=false', '--legacy-peer-deps', '--no-audit', '--no-fund',
    ], { cwd: fixtureDir })
  }
  finally {
    await rm(packDir, { recursive: true, force: true })
  }

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
  })
})
