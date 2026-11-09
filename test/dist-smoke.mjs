// Smoke test for the built package on the oldest supported Node (18).
//
// The library is built on Node >= 20 (vite.config.ts uses import.meta.dirname),
// so this script only consumes dist/: it loads the package through both the
// ESM and the CJS entry, via the file paths and via the package's own
// `exports` map, and exercises the SSR-safe surface. Run with:
//
//   node test/dist-smoke.mjs
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { createSSRApp, defineComponent, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL('..', import.meta.url))

function check(label, api) {
  for (const name of ['createRtl', 'splitBidiRuns', 'isolateRuns', 'toLogicalStyle', 'toPhysicalStyle', 'formatNumber', 'directionOfLocale', 'BidiText', 'RtlProvider', 'vRtl']) {
    assert.equal(typeof api[name], name === 'BidiText' || name === 'RtlProvider' || name === 'vRtl' ? 'object' : 'function', `${label}: missing export ${name}`)
  }
  assert.equal(api.directionOfLocale('ar-EG'), 'rtl', `${label}: directionOfLocale`)
  assert.equal(api.splitBidiRuns('مرحبا abc', 'rtl').map(run => run.text).join(''), 'مرحبا abc', `${label}: splitBidiRuns`)
  assert.deepEqual(api.toLogicalStyle({ marginLeft: '8px' }), { marginInlineStart: '8px' }, `${label}: toLogicalStyle`)
  assert.deepEqual(api.toPhysicalStyle({ paddingInline: '1px 2px' }, 'rtl'), { paddingRight: '1px', paddingLeft: '2px' }, `${label}: toPhysicalStyle`)

  const rtl = api.createRtl({ locales: { en: 'ltr', ar: 'rtl' }, defaultLocale: 'ar' })
  assert.deepEqual(rtl.htmlAttrs(), { dir: 'rtl', lang: 'ar' }, `${label}: htmlAttrs`)
  rtl.setLocale('en')
  assert.equal(rtl.dir.value, 'ltr', `${label}: setLocale`)
  rtl.dispose()
}

async function checkSsr(label, api) {
  const rtl = api.createRtl({ locales: { en: 'ltr', ar: 'rtl' }, defaultLocale: 'ar', numberingSystem: 'latn' })
  const app = createSSRApp(defineComponent({
    setup() {
      const { dir } = api.useDirection()
      return () => h('div', { dir: dir.value }, [
        h(api.BidiText, { as: 'p', text: 'آخر تحديث 12-05-2024' }),
        h(api.RtlProvider, { dir: 'ltr', tag: 'pre' }, () => 'npm test'),
      ])
    },
  }))
  app.use(rtl)
  const html = await renderToString(app)
  rtl.dispose()
  assert.match(html, /^<div dir="rtl">/, `${label}: SSR root dir`)
  assert.ok(html.includes('<bdi dir="ltr">12-05-2024</bdi>'), `${label}: SSR BidiText`)
  assert.ok(html.includes('<pre dir="ltr" lang="ar"'), `${label}: SSR RtlProvider`)
}

const esmByPath = await import(new URL('../dist/vue-rtl-kit.js', import.meta.url))
const esmByName = await import('vue-rtl-kit')
const cjsByPath = require(`${root}dist/vue-rtl-kit.cjs`)
const cjsByName = require('vue-rtl-kit')

check('ESM (dist path)', esmByPath)
check('ESM (exports map)', esmByName)
check('CJS (dist path)', cjsByPath)
check('CJS (exports map)', cjsByName)
await checkSsr('ESM', esmByName)
await checkSsr('CJS', cjsByName)

assert.equal(require.resolve('vue-rtl-kit/styles.css'), `${root}dist/styles.css`, 'styles.css export')
assert.equal(require.resolve('vue-rtl-kit/package.json'), `${root}package.json`, 'package.json export')

console.warn(`dist smoke test passed on Node ${process.versions.node} (ESM + CJS, path + exports map, SSR)`)
