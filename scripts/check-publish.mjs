/**
 * Publish-readiness checks for the packed tarball: `publint`, then
 * `@arethetypeswrong/cli` (attw) against `npm pack` output.
 *
 * attw runs in two passes because its `ignoreRules` option is global and its
 * JSON config cannot scope a rule to one entry point:
 *
 *   1. Every entry point except `./nuxt`, strict - no rules ignored.
 *   2. `./nuxt` alone, ignoring only `cjs-resolves-to-esm`.
 *
 * Why `./nuxt` is allowed to be ESM-only: it is a Nuxt module. Nuxt loads
 * modules through jiti and its own ESM loader, never through `require()`, and
 * `@nuxt/kit` - which the module imports - ships ESM only. A CommonJS build
 * would therefore be dead code that could not even load on Node 18/20, so the
 * entry point deliberately has no `require` condition, and attw's "require
 * resolves to ESM" warning is expected there and only there. Everything else
 * (`.`, `./styles.css`, `./package.json`) must stay fully green.
 */
import { spawnSync } from 'node:child_process'
import process from 'node:process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const bin = name => resolve(root, 'node_modules/.bin', process.platform === 'win32' ? `${name}.cmd` : name)

function run(name, args) {
  console.log(`\n$ ${name} ${args.join(' ')}`)
  const { status, error } = spawnSync(bin(name), args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' })
  if (error) throw error
  if (status !== 0) process.exit(status ?? 1)
}

run('publint', [])
run('attw', ['--pack', '.', '--exclude-entrypoints', './nuxt'])
run('attw', ['--pack', '.', '--entrypoints', './nuxt', '--ignore-rules', 'cjs-resolves-to-esm'])
