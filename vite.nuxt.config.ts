import { resolve } from 'node:path'
import { defineConfig } from 'vite'

/**
 * Second build pass: the Nuxt module and its runtime plugin.
 *
 * ESM only, with `@nuxt/kit` and the library itself left external - the runtime
 * plugin imports `vue-rtl-kit` rather than bundling a second copy of it, so the
 * app ends up with one direction store, not two.
 */
export default defineConfig({
  build: {
    target: 'node18',
    ssr: true,
    emptyOutDir: false,
    outDir: 'dist/nuxt',
    sourcemap: true,
    lib: {
      entry: {
        'module': resolve(import.meta.dirname, 'src/nuxt/module.ts'),
        'runtime/plugin': resolve(import.meta.dirname, 'src/nuxt/runtime/plugin.ts'),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: ['vue', 'vue-rtl-kit', '@nuxt/kit', '@nuxt/schema', /^node:/, /^#/],
    },
  },
})
