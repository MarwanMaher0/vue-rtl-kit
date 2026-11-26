import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Main ESM and CJS budgets are measured byte counts + fixed margins (+256 B raw, +102 B gzip).
const RAW_MARGIN = 256
const GZIP_MARGIN = 102

const BUDGETS = [
  {
    entry: 'vue-rtl-kit (ESM)',
    exportKey: '.',
    file: 'dist/vue-rtl-kit.js',
    maxRawBytes: 41811 + RAW_MARGIN,
    maxGzipBytes: 13265 + GZIP_MARGIN,
  },
  {
    entry: 'vue-rtl-kit (CJS)',
    exportKey: '.',
    file: 'dist/vue-rtl-kit.cjs',
    maxRawBytes: 30414 + RAW_MARGIN,
    maxGzipBytes: 11223 + GZIP_MARGIN,
  },
  {
    entry: 'vue-rtl-kit/nuxt',
    exportKey: './nuxt',
    file: 'dist/nuxt/module.js',
    maxRawBytes: 3.25 * 1024,
    maxGzipBytes: Math.round(1.5 * 1024),
  },
  {
    entry: 'vue-rtl-kit/nuxt (runtime plugin)',
    exportKey: './nuxt',
    file: 'dist/nuxt/runtime/plugin.js',
    maxRawBytes: 3 * 1024,
    maxGzipBytes: Math.round(1.2 * 1024),
  },
  {
    entry: 'vue-rtl-kit/styles.css',
    exportKey: './styles.css',
    file: 'dist/styles.css',
    maxRawBytes: 8 * 1024,
    maxGzipBytes: Math.round(2.5 * 1024),
  },
]

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(2)} kB`
}

function parseReadmeSizeTable(readme) {
  const lines = readme.split(/\r?\n/)
  const headerIndex = lines.findIndex(line =>
    /^\|\s*Entry point\s*\|\s*Artifact\s*\|\s*Raw \(current \/ budget\)\s*\|\s*Gzip \(current \/ budget\)\s*\|$/.test(line.trim()),
  )
  if (headerIndex === -1) return null

  const rows = new Map()
  for (let i = headerIndex + 2; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line.startsWith('|')) break
    const cells = line.split('|').slice(1, -1).map(cell => cell.trim())
    if (cells.length !== 4) return null
    const file = cells[1].replace(/^`|`$/g, '')
    if (rows.has(file)) return null
    rows.set(file, { raw: cells[2], gzip: cells[3] })
  }
  return rows
}

async function main() {
  const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
  const exportKeys = Object.keys(pkg.exports ?? {}).filter(key => key !== './package.json')
  const budgetedKeys = new Set(BUDGETS.map(b => b.exportKey))

  const failures = []
  for (const key of exportKeys) {
    if (!budgetedKeys.has(key)) {
      failures.push(`Published export "${key}" in package.json has no size budget in scripts/check-size.mjs`)
    }
  }

  const readme = await readFile(resolve(root, 'README.md'), 'utf8')
  const readmeRows = parseReadmeSizeTable(readme)
  if (!readmeRows) {
    failures.push('README.md is missing or has a malformed "Bundle size budgets" table')
  }
  else {
    const budgetedFiles = new Set(BUDGETS.map(b => b.file))
    for (const file of readmeRows.keys()) {
      if (!budgetedFiles.has(file)) {
        failures.push(`README.md "Bundle size budgets" table lists unknown artifact "${file}"`)
      }
    }
  }

  for (const budget of BUDGETS) {
    const fullPath = resolve(root, budget.file)
    let buf
    try {
      buf = await readFile(fullPath)
    }
    catch {
      failures.push(`${budget.entry} (${budget.file}): file not found. Run "npm run build" first.`)
      continue
    }

    const rawBytes = buf.length
    const gzipBytes = gzipSync(buf, { level: 9 }).length
    const rawOk = rawBytes <= budget.maxRawBytes
    const gzipOk = gzipBytes <= budget.maxGzipBytes
    let readmeOk = Boolean(readmeRows)

    if (readmeRows) {
      const row = readmeRows.get(budget.file)
      const expectedRaw = `${formatKb(rawBytes)} / ≤ ${formatKb(budget.maxRawBytes)}`
      const expectedGzip = `${formatKb(gzipBytes)} / ≤ ${formatKb(budget.maxGzipBytes)}`
      if (!row) {
        readmeOk = false
        failures.push(`README.md "Bundle size budgets" table has no row for ${budget.file}`)
      }
      else {
        if (row.raw !== expectedRaw) {
          readmeOk = false
          failures.push(`README.md raw column for ${budget.file} is "${row.raw}", expected "${expectedRaw}"`)
        }
        if (row.gzip !== expectedGzip) {
          readmeOk = false
          failures.push(`README.md gzip column for ${budget.file} is "${row.gzip}", expected "${expectedGzip}"`)
        }
      }
    }

    const status = rawOk && gzipOk && readmeOk ? 'PASS' : 'FAIL'

    console.log(
      `${status}  ${budget.entry.padEnd(34)} ${budget.file.padEnd(28)} raw: ${formatKb(rawBytes)} / ${formatKb(budget.maxRawBytes)}   gzip: ${formatKb(gzipBytes)} / ${formatKb(budget.maxGzipBytes)}`,
    )

    if (!rawOk) {
      failures.push(
        `${budget.entry} (${budget.file}) raw size ${formatKb(rawBytes)} (${rawBytes} B) exceeds budget ${formatKb(budget.maxRawBytes)} (${budget.maxRawBytes} B)`,
      )
    }
    if (!gzipOk) {
      failures.push(
        `${budget.entry} (${budget.file}) gzip size ${formatKb(gzipBytes)} (${gzipBytes} B) exceeds budget ${formatKb(budget.maxGzipBytes)} (${budget.maxGzipBytes} B)`,
      )
    }
  }

  if (failures.length > 0) {
    console.error('\nBundle size budget check failed:')
    for (const msg of failures) {
      console.error(`  - ${msg}`)
    }
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
