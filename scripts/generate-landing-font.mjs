#!/usr/bin/env node
/**
 * Regenerates site/public/fonts/NotoSansArabic-landing.woff2 from a pinned
 * upstream release. The generated subset is only used by the `.landing`
 * surface (see site/.vitepress/theme/custom.css), so it intentionally carries
 * just the Arabic characters used by the landing page.
 *
 * Source of truth
 *   URL:    https://github.com/notofonts/arabic/releases/download/NotoSansArabic-v2.012/NotoSansArabic-v2.012.zip
 *   SHA-256 of the archive:
 *           65bceb5106ca17e8e0b4660bacec4d362afd56e0251e71fedf83f76dfe9f4abe
 *   Member: NotoSansArabic/googlefonts/variable/NotoSansArabic[wdth,wght].ttf
 *   SHA-256 of the member:
 *           63111b5b2e074dd48cc67692e0a2726d86ee94c1c37fe8598257b7b4e87e869e
 *
 * Requirements
 *   - Node.js 18+ (global fetch, node:crypto, node:child_process)
 *   - Python 3 with fontTools and brotli installed
 *     (`python3 -m pip install fonttools brotli`)
 *
 * Usage
 *   node scripts/generate-landing-font.mjs
 *   node scripts/generate-landing-font.mjs --source /path/to/NotoSansArabic-v2.012.zip
 *
 * The script fails loudly when the source archive is missing, when either
 * SHA-256 does not match, when a required tool is unavailable, or when the
 * generated subset/CSS unicode-range drifts from the pinned character list.
 *
 * Exact fontTools invocations:
 *   python3 -m fontTools.varLib.instancer <variable.ttf> wdth=100 \
 *     --no-recalc-timestamp --output=<instanced.ttf>
 *   python3 -m fontTools.subset <instanced.ttf> \
 *     --text-file=<characters> --output-file=<output> \
 *     --flavor=woff2 \
 *     --layout-features=ccmp,fina,init,locl,medi,pnum,rlig,tnum \
 *     --no-hinting --desubroutinize
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { copyFile, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const output = resolve(root, 'site/public/fonts/NotoSansArabic-landing.woff2')
const cssFile = resolve(root, 'site/.vitepress/theme/custom.css')
const python = process.env.PYTHON ?? 'python3'

const SOURCE_URL = 'https://github.com/notofonts/arabic/releases/download/NotoSansArabic-v2.012/NotoSansArabic-v2.012.zip'
const SOURCE_SHA256 = '65bceb5106ca17e8e0b4660bacec4d362afd56e0251e71fedf83f76dfe9f4abe'
const FONT_MEMBER = 'NotoSansArabic/googlefonts/variable/NotoSansArabic[wdth,wght].ttf'
const FONT_SHA256 = '63111b5b2e074dd48cc67692e0a2726d86ee94c1c37fe8598257b7b4e87e869e'
const LAYOUT_FEATURES = 'ccmp,fina,init,locl,medi,pnum,rlig,tnum'
const LANDING_TEXT = ' ،؛؟ءآأؤإئابةتثجحخدذرزسشصضطظعغـفقكلمنهوىيًٍَُِّ٠١٢٣٤٥٦٧٨٩'

function fail(message) {
  throw new Error(message)
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.error) fail(`Could not run ${command}: ${result.error.message}`)
  if (result.status !== 0) fail(`${command} ${args.join(' ')} exited with status ${result.status}`)
}

function checkPython() {
  const result = spawnSync(python, ['-c', 'import brotli, fontTools; print(fontTools.version)'], { encoding: 'utf8' })
  if (result.error) fail(`Python interpreter ${python} is required but could not be started: ${result.error.message}`)
  if (result.status !== 0) {
    fail(`Python ${python} must provide fontTools and brotli (woff2) to regenerate the landing font. Run: ${python} -m pip install fonttools brotli`)
  }
  return result.stdout.trim()
}

function unicodeRange(text) {
  const points = [...new Set([...text].map(character => character.codePointAt(0)))].sort((a, b) => a - b)
  const ranges = []
  for (const point of points) {
    const previous = ranges.at(-1)
    if (previous && point === previous.end + 1) previous.end = point
    else ranges.push({ start: point, end: point })
  }
  const hex = value => `U+${value.toString(16).toUpperCase().padStart(4, '0')}`
  return ranges.map(({ start, end }) => start === end ? hex(start) : `${hex(start)}-${hex(end).slice(2)}`).join(', ')
}

function cssBlock(css, selector) {
  const escaped = selector.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
}

async function readSource(sourceArgument) {
  if (sourceArgument) {
    if (!existsSync(sourceArgument)) fail(`Pinned source archive not found: ${sourceArgument}`)
    return readFile(sourceArgument)
  }
  let response
  try {
    response = await fetch(SOURCE_URL, { redirect: 'follow' })
  } catch (error) {
    fail(`Could not download the pinned font source ${SOURCE_URL}: ${error.message}`)
  }
  if (!response.ok) fail(`Could not download the pinned font source ${SOURCE_URL}: HTTP ${response.status}`)
  return new Uint8Array(await response.arrayBuffer())
}

function parseSourceArgument() {
  const index = process.argv.indexOf('--source')
  if (index === -1) return undefined
  const value = process.argv[index + 1]
  if (!value) fail('--source expects a path to the NotoSansArabic-v2.012.zip archive')
  return resolve(value)
}

async function main() {
  const fontTools = checkPython()
  const source = await readSource(parseSourceArgument())
  const sourceHash = sha256(source)
  if (sourceHash !== SOURCE_SHA256) {
    fail(`Pinned source SHA-256 mismatch: expected ${SOURCE_SHA256}, got ${sourceHash}`)
  }

  const directory = await mkdtemp(join(tmpdir(), 'vue-rtl-kit-font-'))
  const archive = join(directory, 'NotoSansArabic-v2.012.zip')
  const font = join(directory, 'NotoSansArabic[wdth,wght].ttf')
  const instanced = join(directory, 'NotoSansArabic-wght.ttf')
  const generated = join(directory, 'NotoSansArabic-landing.woff2')
  const characters = join(directory, 'characters.txt')
  try {
    await writeFile(archive, source)
    await writeFile(characters, LANDING_TEXT, 'utf8')
    run(python, ['-c', String.raw`
from pathlib import Path
import sys
import zipfile
archive, member, output = map(Path, sys.argv[1:4])
with zipfile.ZipFile(archive) as package:
    try:
        data = package.read(member.as_posix())
    except KeyError:
        raise SystemExit(f"Pinned source archive is missing {member.as_posix()}")
    if not data:
        raise SystemExit(f"Pinned source archive member {member.as_posix()} is empty")
    output.write_bytes(data)
`, archive, FONT_MEMBER, font])

    const fontHash = sha256(await readFile(font))
    if (fontHash !== FONT_SHA256) {
      fail(`Pinned font member SHA-256 mismatch: expected ${FONT_SHA256}, got ${fontHash}`)
    }

    run(python, ['-m', 'fontTools.varLib.instancer', font, 'wdth=100', '--no-recalc-timestamp', `--output=${instanced}`])
    run(python, [
      '-m', 'fontTools.subset', instanced,
      `--text-file=${characters}`,
      `--output-file=${generated}`,
      '--flavor=woff2',
      `--layout-features=${LAYOUT_FEATURES}`,
      '--no-hinting',
      '--desubroutinize',
    ])

    const expectedRange = unicodeRange(LANDING_TEXT)
    const verification = spawnSync(python, ['-c', String.raw`
import io
import sys
from fontTools.ttLib import TTFont
path, text = sys.argv[1], sys.argv[2]
with TTFont(path) as font:
    cmap = set(font.getBestCmap())
    expected = {ord(character) for character in text}
    missing = sorted(expected - cmap)
    extra = sorted(cmap - expected)
    if missing or extra:
        raise SystemExit(f"Subset cmap mismatch. Missing: {missing}; unexpected: {extra}")
    if 'fvar' in font:
        axes = [(axis.axisTag, int(axis.minValue), int(axis.maxValue)) for axis in font['fvar'].axes]
    else:
        axes = []
    if axes != [('wght', 100, 900)]:
        raise SystemExit(f"Expected a single wght 100-900 axis, got {axes}")
    print(f"{len(cmap)} codepoints, {len(font.getGlyphOrder())} glyphs")
`, generated, LANDING_TEXT], { encoding: 'utf8' })
    if (verification.error) fail(`Could not verify the generated font: ${verification.error.message}`)
    if (verification.status !== 0) fail(verification.stderr.trim() || 'Generated font verification failed')
    process.stdout.write(`Verified generated subset: ${verification.stdout.trim()}\n`)

    const css = await readFile(cssFile, 'utf8')
    const landingFace = css.match(/@font-face\s*\{[^}]*font-family:\s*'Noto Sans Arabic Landing'[^}]*\}/)?.[0] ?? ''
    const declaredRange = landingFace.match(/unicode-range:\s*([^;]+);/)?.[1].trim()
    if (declaredRange !== expectedRange) {
      fail(`Landing @font-face unicode-range must match the subset cmap.\nExpected: ${expectedRange}\nFound:    ${declaredRange ?? '(missing)'}`)
    }
    const baseStack = css.match(/--vp-font-family-base:\s*([^;]+);/)?.[1] ?? ''
    if (baseStack.includes("'Noto Sans Arabic Landing'")) {
      fail('--vp-font-family-base must not reference the landing subset; it belongs to .landing only')
    }
    const rtlBody = cssBlock(css, "[dir='rtl'] body")
    if (rtlBody.includes("'Noto Sans Arabic Landing'")) {
      fail("[dir='rtl'] body must use the full 'Noto Sans Arabic' font, not the landing subset")
    }
    const landing = cssBlock(css, '.landing')
    if (!landing.includes("'Noto Sans Arabic Landing'")) {
      fail(".landing must be the only surface that uses 'Noto Sans Arabic Landing'")
    }

    await copyFile(generated, output)

    const hash = sha256(await readFile(output))
    const size = (await stat(output)).size
    process.stdout.write(`Generated ${output}: ${size.toLocaleString('en-US')} bytes, SHA-256 ${hash}\n`)
    process.stdout.write(`fontTools ${fontTools}; CSS unicode-range ${expectedRange}\n`)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

main().catch(error => {
  process.stderr.write(`Landing font generation failed: ${error.message}\n`)
  process.exitCode = 1
})
