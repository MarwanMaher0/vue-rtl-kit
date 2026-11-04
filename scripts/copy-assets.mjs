/**
 * Final build step: copy the stylesheet and its type stub into `dist/`, and
 * drop the temporary per-file declarations that `rollup.dts.config.mjs` has
 * already bundled.
 *
 * The CSS is copied rather than bundled so importing the library's JavaScript
 * never pulls a stylesheet in as a side effect - consumers opt in with
 * `import 'vue-rtl-kit/styles.css'`. The stub is written twice (`.d.ts` and
 * `.d.cts`) so the subpath has a declaration under both `import` and `require`.
 */
import { cp, mkdir, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

await mkdir(resolve(root, 'dist'), { recursive: true })
await cp(resolve(root, 'src/styles/logical.css'), resolve(root, 'dist/styles.css'))
await cp(resolve(root, 'src/styles/styles.d.ts'), resolve(root, 'dist/styles.d.ts'))
await cp(resolve(root, 'src/styles/styles.d.ts'), resolve(root, 'dist/styles.d.cts'))
console.log('copied dist/styles.css, dist/styles.d.ts, dist/styles.d.cts')

await rm(resolve(root, 'dist/.types'), { recursive: true, force: true })
console.log('removed dist/.types')
