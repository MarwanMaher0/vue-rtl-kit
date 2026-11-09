import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const BUDGETS = [
  {
    entry: 'vue-rtl-kit (ESM)',
    exportKey: '.',
    file: 'dist/vue-rtl-kit.js',
    maxRawBytes: Math.round(26.75 * 1024),
    maxGzipBytes: Math.round(8.85 * 1024),
  },
  {
    entry: 'vue-rtl-kit (CJS)',
    exportKey: '.',
    file: 'dist/vue-rtl-kit.cjs',
    maxRawBytes: Math.round(19.5 * 1024),
    maxGzipBytes: Math.round(7.4 * 1024),
  },
  {
    entry: 'vue-rtl-kit/nuxt',
    exportKey: './nuxt',
    file: 'dist/nuxt/module.js',
    maxRawBytes: 3 * 1024,
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
    const status = rawOk && gzipOk ? 'PASS' : 'FAIL'

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
