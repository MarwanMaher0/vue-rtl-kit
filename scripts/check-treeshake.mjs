import { gzipSync } from 'node:zlib'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { transform } from 'esbuild'
import { rollup } from 'rollup'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist/vue-rtl-kit.js')
const MAX_GZIP = 2 * 1024

const COMPONENT_OR_DIRECTIVE = [
  'BidiText',
  'RtlProvider',
  '__rtlPreviousDir',
  '__rtlStopWatch',
  'data-rtl-scope',
  'unicode-bidi',
]

const CASES = [
  { spec: 'isolateRuns', maxGzip: MAX_GZIP, forbidVue: true },
  { spec: 'toLogicalStyle', maxGzip: MAX_GZIP, forbidVue: true },
  { spec: 'directionOfLocale', maxGzip: MAX_GZIP, forbidVue: true },
  { spec: 'formatNumber', forbidComponents: true },
]

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(2)} kB`
}

// Vue is external, so Rollup cannot see its package and keeps a bare
// `import 'vue'` after every binding is dropped. Declare `vue` side-effect
// free with treeshake.moduleSideEffects — the same assumption a consumer
// bundler makes for an unused Vue import — so that import is removed.
// A binding that is actually used still appears in `chunk.imports`.
function vueIsSideEffectFree(id) {
  return id === 'vue'
}

function pullsVue(imports) {
  return imports.includes('vue')
}

async function bundle(spec) {
  const build = await rollup({
    input: 'entry',
    external: ['vue'],
    treeshake: {
      moduleSideEffects(id) {
        return !vueIsSideEffectFree(id)
      },
    },
    plugins: [
      {
        name: 'treeshake-entry',
        resolveId(source) {
          if (source === 'entry') return source
        },
        load(id) {
          if (id !== 'entry') return null
          return `import { ${spec} } from ${JSON.stringify(dist)}\nexport { ${spec} }\n`
        },
      },
    ],
  })
  try {
    const { output } = await build.generate({ format: 'es', exports: 'named' })
    const chunk = output[0]
    const minified = await transform(chunk.code, { minify: true, target: 'es2019' })
    return { code: minified.code, imports: chunk.imports }
  }
  finally {
    await build.close()
  }
}

async function main() {
  const failures = []
  for (const entry of CASES) {
    let bundled
    try {
      bundled = await bundle(entry.spec)
    }
    catch (error) {
      failures.push(`{ ${entry.spec} }: failed to bundle (${error.message})`)
      continue
    }
    const { code, imports } = bundled
    const gzipBytes = gzipSync(code, { level: 9 }).length
    const vue = pullsVue(imports)
    const markers = COMPONENT_OR_DIRECTIVE.filter(marker => code.includes(marker))
    const ok = gzipBytes > 0
      && (!entry.maxGzip || gzipBytes <= entry.maxGzip)
      && (!entry.forbidVue || !vue)
      && (!entry.forbidComponents || markers.length === 0)
    console.log(
      `${ok ? 'PASS' : 'FAIL'}  { ${entry.spec} }`.padEnd(28)
      + `gzip: ${formatKb(gzipBytes)}${entry.maxGzip ? ` / ${formatKb(entry.maxGzip)}` : ''}`
      + `   vue: ${vue ? 'yes' : 'no'}`
      + `   components: ${markers.length ? markers.join(', ') : 'no'}`,
    )
    if (!ok && gzipBytes === 0) failures.push(`{ ${entry.spec} }: bundle is empty`)
    if (entry.maxGzip && gzipBytes > entry.maxGzip) {
      failures.push(`{ ${entry.spec} } gzip ${formatKb(gzipBytes)} exceeds ${formatKb(entry.maxGzip)}`)
    }
    if (entry.forbidVue && vue) failures.push(`{ ${entry.spec} } still imports vue`)
    if (entry.forbidComponents && markers.length) {
      failures.push(`{ ${entry.spec} } still contains component or directive code: ${markers.join(', ')}`)
    }
  }

  if (failures.length) {
    console.error('\nTree-shake check failed:')
    for (const msg of failures) console.error(`  - ${msg}`)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
