/**
 * Copy the stylesheet and the Nuxt runtime plugin into `dist/`.
 *
 * The CSS is copied rather than bundled so importing the library's JavaScript
 * never pulls a stylesheet in as a side effect - consumers opt in with
 * `import 'vue-rtl-kit/styles.css'`.
 */
import { cp, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

await mkdir(resolve(root, 'dist'), { recursive: true })
await cp(resolve(root, 'src/styles/logical.css'), resolve(root, 'dist/styles.css'))
console.log('copied dist/styles.css')
