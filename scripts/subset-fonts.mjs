import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, extname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const arabicFontPath = resolve(root, 'site/public/fonts/NotoSansArabic-arabic.woff2')
const cssPath = resolve(root, 'site/.vitepress/theme/custom.css')
const textExts = new Set(['.md', '.vue', '.ts', '.mjs', '.css', '.svg', '.txt'])
const EXPECTED_FONTTOOLS_VERSION = '4.62.1'
const SOURCE_COMMIT = '2e61ff4'
const SOURCE_GIT_OBJECT = `${SOURCE_COMMIT}:site/public/fonts/NotoSansArabic-arabic.woff2`
const EXPECTED_SOURCE_SHA256 = 'ce85091f020920b65762b387b194ef59457ea5b25b760f2dcc35240a94bb8669'
const EXPECTED_SOURCE_BYTES = 165960

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

function verifyFonttoolsVersion() {
  let versionOutput = ''
  try {
    versionOutput = execFileSync('python3', ['-c', 'import fontTools; print(fontTools.__version__)'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  } catch (error) {
    throw new Error(
      `fonttools (pinned version ${EXPECTED_FONTTOOLS_VERSION}) is required, but could not be inspected via python3: ${error.message}`,
    )
  }
  if (versionOutput !== EXPECTED_FONTTOOLS_VERSION) {
    throw new Error(
      `Expected fonttools ${EXPECTED_FONTTOOLS_VERSION} for deterministic output, but found "${versionOutput}". Install with: pip install fonttools==${EXPECTED_FONTTOOLS_VERSION} brotli`,
    )
  }
}

async function loadOriginalSourceFont() {
  const sourceArg = process.argv.find(arg => arg.startsWith('--source='))
  let sourceFont
  let sourceLabel
  if (sourceArg) {
    const customPath = resolve(root, sourceArg.slice('--source='.length))
    sourceLabel = customPath
    try {
      sourceFont = await readFile(customPath)
    } catch (error) {
      throw new Error(`Could not read --source font at ${customPath}: ${error.message}`)
    }
  } else {
    sourceLabel = `git:${SOURCE_GIT_OBJECT}`
    try {
      sourceFont = execFileSync('git', ['show', SOURCE_GIT_OBJECT], {
        cwd: root,
        maxBuffer: 10 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } catch {
      throw new Error(
        `Could not read original un-subsetted font from ${SOURCE_GIT_OBJECT}. Refusing to fall back to ${arabicFontPath} (which is already subsetted). Fetch the source commit with "git fetch --depth=1 origin ${SOURCE_COMMIT}" or pass "--source=/path/to/original-NotoSansArabic-arabic.woff2".`,
      )
    }
  }

  const actualSha256 = sha256(sourceFont)
  if (sourceFont.length !== EXPECTED_SOURCE_BYTES || actualSha256 !== EXPECTED_SOURCE_SHA256) {
    throw new Error(
      `Source font verification failed for ${sourceLabel}: expected ${EXPECTED_SOURCE_BYTES} bytes (sha256 ${EXPECTED_SOURCE_SHA256}), got ${sourceFont.length} bytes (sha256 ${actualSha256}).`,
    )
  }
  return sourceFont
}

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const out = []
  for (const entry of entries) {
    if (entry.name === 'dist' || entry.name === 'cache' || entry.name === 'node_modules') continue
    const full = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...await collectFiles(full))
    } else if (textExts.has(extname(entry.name))) {
      out.push(full)
    }
  }
  return out
}

function isArabicCodepoint(cp) {
  return (
    (cp >= 0x0600 && cp <= 0x06FF)
    || (cp >= 0x0750 && cp <= 0x077F)
    || (cp >= 0x08A0 && cp <= 0x08FF)
    || (cp >= 0xFB50 && cp <= 0xFDFF)
    || (cp >= 0xFE70 && cp <= 0xFEFF)
    || (cp >= 0x200C && cp <= 0x200F)
  )
}

function toHex(cp) {
  return cp.toString(16).toUpperCase().padStart(4, '0')
}

function formatUnicodeRange(codepoints) {
  const sorted = [...codepoints].sort((a, b) => a - b)
  const ranges = []
  let start = sorted[0]
  let end = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i]
    } else {
      ranges.push(start === end ? `U+${toHex(start)}` : `U+${toHex(start)}-${toHex(end)}`)
      start = sorted[i]
      end = sorted[i]
    }
  }
  if (sorted.length > 0) {
    ranges.push(start === end ? `U+${toHex(start)}` : `U+${toHex(start)}-${toHex(end)}`)
  }
  return ranges.join(', ')
}

async function subsetArabicFont() {
  const checkMode = process.argv.includes('--check')
  verifyFonttoolsVersion()
  const files = [
    ...await collectFiles(resolve(root, 'site')),
    resolve(root, 'scripts/generate-og.mjs'),
  ]
  const codepoints = new Set()
  for (const file of files) {
    const content = await readFile(file, 'utf8')
    for (const ch of content) {
      const cp = ch.codePointAt(0)
      if (cp !== undefined && isArabicCodepoint(cp)) {
        codepoints.add(cp)
      }
    }
  }

  const unicodeRange = formatUnicodeRange(codepoints)
  const unicodesArg = unicodeRange.replaceAll(', ', ',')
  const sourceFont = await loadOriginalSourceFont()
  const tempDir = await mkdtemp(join(tmpdir(), 'vue-rtl-kit-font-'))
  try {
    const sourcePath = join(tempDir, 'source.woff2')
    const instancedPath = join(tempDir, 'instanced.woff2')
    const outPath = join(tempDir, 'subset.woff2')
    await writeFile(sourcePath, sourceFont)
    execFileSync(
      'fonttools',
      [
        'varLib.instancer',
        '--no-recalc-timestamp',
        sourcePath,
        'wght=400:800',
        '-o',
        instancedPath,
      ],
      { stdio: ['ignore', 'ignore', 'inherit'] },
    )
    execFileSync(
      'pyftsubset',
      [
        instancedPath,
        `--unicodes=${unicodesArg}`,
        '--flavor=woff2',
        '--no-recalc-timestamp',
        `--output-file=${outPath}`,
      ],
      { stdio: 'inherit' },
    )
    const subsetBuffer = await readFile(outPath)
    const subsetHash = sha256(subsetBuffer)
    const css = await readFile(cssPath, 'utf8')
    const rangeMatch = css.match(/@font-face\s*\{\s*font-family:\s*'Noto Sans Arabic';[\s\S]*?unicode-range:\s*([^;]+);/)

    if (checkMode) {
      const currentCssRange = rangeMatch?.[1]?.trim() || ''
      if (currentCssRange !== unicodeRange) {
        throw new Error(
          `custom.css unicode-range mismatch: expected "${unicodeRange}", found "${currentCssRange}"`,
        )
      }
      const existingBuffer = await readFile(arabicFontPath)
      const existingHash = sha256(existingBuffer)
      if (!subsetBuffer.equals(existingBuffer)) {
        throw new Error(
          `NotoSansArabic-arabic.woff2 is out of date: expected ${subsetBuffer.length} bytes (sha256 ${subsetHash}), found ${existingBuffer.length} bytes (sha256 ${existingHash})`,
        )
      }
      process.stdout.write(
        `Verified NotoSansArabic-arabic.woff2 (${subsetBuffer.length} bytes, sha256 ${subsetHash}, ${codepoints.size} Arabic codepoints, fonttools ${EXPECTED_FONTTOOLS_VERSION})\nunicode-range: ${unicodeRange}\n`,
      )
      return
    }

    await writeFile(arabicFontPath, subsetBuffer)
    const updatedCss = css.replace(
      /(@font-face\s*\{\s*font-family:\s*'Noto Sans Arabic';[\s\S]*?unicode-range:\s*)([^;]+)(;)/,
      `$1${unicodeRange}$3`,
    )
    if (updatedCss !== css) {
      await writeFile(cssPath, updatedCss)
    }
    process.stdout.write(
      `Subset NotoSansArabic-arabic.woff2 to ${codepoints.size} Arabic codepoints (${subsetBuffer.length} bytes, sha256 ${subsetHash}, fonttools ${EXPECTED_FONTTOOLS_VERSION})\nunicode-range: ${unicodeRange}\n`,
    )
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

function subsetDisplayFonts() {
  const result = spawnSync(process.env.PYTHON ?? 'python3', ['-c', String.raw`
from hashlib import sha256
from pathlib import Path
import subprocess
import sys

from fontTools.ttLib import TTFont

root = Path(sys.argv[1])
source = root / "scripts" / "fonts"
output = root / "site" / "public" / "fonts"
expected = {
    "NotoSerifDisplay-Bold.ttf": "cd898729b4abd86ba20c468564a6d5f59781c7a1db5b38af4a428430fa4f76c1",
    "NotoSerifDisplay-BoldItalic.ttf": "a655a6ed8cb29a5acf351c1caa355e8cd78cb83a3cd3b4dcd7715d258f24b0aa",
    "NotoNaskhArabic-Bold.ttf": "76e7b3b17abc5068fda755d657d475863df2d48cee60dc21bd22efb11ecb2268",
}
latin = "0020-007E,00A0,00B7,2013,2014,2018-201D,2026"
arabic = "0020,0021,002C,002E,0030-003A,00AB,00BB,060C,0621-0623,0625-063A,0640-064B,064D,064F-0651"
jobs = [
    ("NotoSerifDisplay-Bold.ttf", "NotoSerifDisplay-Bold.woff2", latin, "liga", False, 112, 106, {"liga"}),
    ("NotoSerifDisplay-BoldItalic.ttf", "NotoSerifDisplay-BoldItalic.woff2", latin, "liga", False, 112, 106, {"liga"}),
    ("NotoNaskhArabic-Bold.ttf", "NotoNaskhArabic-Bold.woff2", arabic, "*", True, 138, 59, {"ccmp", "fina", "init", "locl", "medi", "rlig"}),
]

def features(font):
    gsub = font.get("GSUB")
    if gsub is None:
        return set()
    return {record.FeatureTag for record in gsub.table.FeatureList.FeatureRecord}

for name, digest in expected.items():
    path = source / name
    if not path.is_file():
        raise SystemExit(f"Missing pinned font: {path}")
    actual = sha256(path.read_bytes()).hexdigest()
    if actual != digest:
        raise SystemExit(f"Pinned font hash mismatch for {name}: {actual}")

for name in ("NotoSerifDisplay-OFL.txt", "NotoNaskhArabic-OFL.txt"):
    if not (source / name).is_file():
        raise SystemExit(f"Missing OFL license: {source / name}")

output.mkdir(parents=True, exist_ok=True)
for source_name, target_name, unicodes, layout, allow_missing, glyph_count, cmap_count, feature_set in jobs:
    target = output / target_name
    command = [
        sys.executable,
        "-m",
        "fontTools.subset",
        str(source / source_name),
        f"--unicodes={unicodes}",
        f"--layout-features={layout}",
        "--flavor=woff2",
        f"--output-file={target}",
    ]
    if allow_missing:
        command.append("--no-ignore-missing-unicodes")
    completed = subprocess.run(command, check=False)
    if completed.returncode != 0:
        raise SystemExit(f"fontTools subset failed for {source_name}")
    with TTFont(target) as font:
        cmap = font.getBestCmap() or {}
        actual_features = features(font)
        if len(font.getGlyphOrder()) != glyph_count or len(cmap) != cmap_count or actual_features != feature_set:
            raise SystemExit(
                f"{target_name}: expected {glyph_count} glyphs, {cmap_count} cmap, {sorted(feature_set)}; "
                f"got {len(font.getGlyphOrder())}, {len(cmap)}, {sorted(actual_features)}"
            )
        if target_name.startswith("NotoNaskh") and any(0x41 <= code <= 0x7A for code in cmap):
            raise SystemExit(f"{target_name}: Latin letters leaked into the Arabic subset")
        family = {record.toUnicode() for record in font["name"].names if record.nameID == 1 and record.toUnicode()}
        expected_family = "Noto Naskh Arabic" if target_name.startswith("NotoNaskh") else "Noto Serif Display"
        if expected_family not in family:
            raise SystemExit(f"{target_name}: family name {expected_family!r} missing from {family}")
    print(f"{target_name}: {target.stat().st_size} bytes, {glyph_count} glyphs")
`, root], { stdio: 'inherit' })

  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

async function main() {
  if (process.argv.includes('--arabic')) {
    await subsetArabicFont()
    return
  }
  subsetDisplayFonts()
}

main().catch((error) => {
  process.stderr.write(`Font subsetting failed: ${error.message}\n`)
  process.exitCode = 1
})
