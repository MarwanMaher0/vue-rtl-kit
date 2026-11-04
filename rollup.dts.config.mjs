/**
 * Bundle the per-file declarations `tsc` emits into `dist/.types/` into one
 * `.d.ts` per entry point, plus a `.d.cts` twin for the CommonJS build.
 *
 * Why bundle at all: `tsc` leaves relative imports extensionless (`./types`),
 * which Node16-style resolution rejects, and a single `types` condition is
 * treated as ESM when the consumer `require()`s the package. Self-contained
 * files with no relative imports sidestep both problems, and the `.d.cts`
 * copy gives `require('vue-rtl-kit')` users the right module format.
 */
import { dts } from 'rollup-plugin-dts'

const types = 'dist/.types'

const shared = {
  // `vue`, `@nuxt/*` and the self-reference `vue-rtl-kit` stay external;
  // `respectExternal` keeps the plugin from inlining them via tsconfig paths.
  external: [/^vue$/, /^@nuxt\//, /^vue-rtl-kit$/],
  plugins: [dts({ respectExternal: false })],
}

export default [
  {
    ...shared,
    input: `${types}/index.d.ts`,
    output: [
      { file: 'dist/index.d.ts', format: 'es' },
      { file: 'dist/index.d.cts', format: 'es' },
    ],
  },
  {
    ...shared,
    input: {
      'module': `${types}/nuxt/module.d.ts`,
      'runtime/plugin': `${types}/nuxt/runtime/plugin.d.ts`,
    },
    output: { dir: 'dist/nuxt', format: 'es', entryFileNames: '[name].d.ts' },
  },
]
