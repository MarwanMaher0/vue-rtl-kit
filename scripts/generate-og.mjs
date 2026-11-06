import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const version = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version
const result = spawnSync(process.env.PYTHON ?? 'python3', ['-c', String.raw`
from io import BytesIO
from pathlib import Path
import sys

try:
    from PIL import Image, ImageDraw, ImageFont
    from fontTools.ttLib import TTFont
    from fontTools.varLib.instancer import instantiateVariableFont
except ImportError as error:
    raise SystemExit("OG generation requires Python with Pillow, fonttools and brotli installed.") from error

root = Path(sys.argv[1])
version = sys.argv[2]
public = root / "site" / "public"
fonts = root / "scripts" / "fonts"
serif_path = fonts / "NotoSerifDisplay-Bold.ttf"
italic_path = fonts / "NotoSerifDisplay-BoldItalic.ttf"
naskh_path = fonts / "NotoNaskhArabic-Bold.ttf"
manrope_path = public / "fonts" / "Manrope-latin.woff2"
basic = ImageFont.Layout.BASIC

def require_glyphs(path, characters):
    with TTFont(path) as source:
        cmap = source.getBestCmap()
        missing = {char for char in characters if ord(char) not in cmap}
        if missing:
            raise SystemExit(f"Missing glyphs in {path}: {sorted(hex(ord(char)) for char in missing)}")

def static_manrope(weight):
    variable = TTFont(manrope_path)
    variable.flavor = None
    instanced = instantiateVariableFont(variable, {"wght": weight}, inplace=False)
    instanced.flavor = None
    buffer = BytesIO()
    instanced.save(buffer)
    buffer.seek(0)
    return buffer

arabic_glyphs = [".", "\uFEE5", "\uFE8E", "\uFEEB", "\uFE8E", "\uFEA0", "\uFE97", "\uFE8D"]
specimen_glyphs = ["\uFE8F", "\uFE83"]
release = f"v{version}"
tagline = "Logical styles · Bidirectional text"
require_glyphs(serif_path, "vue-rtl-kit Two directions. One Vue. Direction for Vue & Nuxt Aa")
require_glyphs(italic_path, "One Vue.")
require_glyphs(naskh_path, "".join(arabic_glyphs + specimen_glyphs))
manrope_regular = static_manrope(400)
manrope_bold = static_manrope(700)
require_glyphs(manrope_path, release + "LTR / RTL" + tagline)

scale = 3
paper = (243, 236, 223)
ink = (27, 22, 18)
copper = (154, 63, 27)
cream = (247, 241, 231)
muted = (92, 81, 72)
image = Image.new("RGB", (1200 * scale, 630 * scale), paper)
draw = ImageDraw.Draw(image)

def px(value):
    return int(round(value * scale))

def face(path, size):
    return ImageFont.truetype(path, px(size))

def measure(value, font):
    return font.getlength(value)

def text(x, y, value, font, color):
    draw.text((px(x), px(y)), value, font=font, fill=color, layout_engine=basic)

def glyphs(x, y, values, font, color):
    cursor = px(x)
    for value in values:
        draw.text((cursor, px(y)), value, font=font, fill=color, layout_engine=basic)
        cursor += font.getlength(value)
    return (cursor - px(x)) / scale

def rule(x, y, length, color=ink, width=2):
    draw.rectangle((px(x), px(y), px(x + length), px(y + width)), fill=color)

def crop(x, y, dx, dy):
    draw.line((px(x), px(y), px(x + dx), px(y)), fill=copper, width=px(2))
    draw.line((px(x), px(y), px(x), px(y + dy)), fill=copper, width=px(2))

serif = face(serif_path, 28)
serif_lg = face(serif_path, 76)
italic = face(italic_path, 76)
naskh = face(naskh_path, 54)
naskh_lg = face(naskh_path, 84)
label = face(manrope_bold, 18)
small = face(manrope_regular, 20)

headline = "Two directions."
accent = "One Vue."
if measure(headline, serif_lg) > px(700):
    raise SystemExit("Headline exceeds its column")
if measure(accent, italic) > px(700):
    raise SystemExit("Accent exceeds its column")
if sum(naskh.getlength(value) for value in arabic_glyphs) > px(280):
    raise SystemExit("Arabic title exceeds the proof plate")

crop(46, 42, 22, 22)
crop(1154, 42, -22, 22)
crop(46, 588, 22, -22)
crop(1154, 588, -22, -22)

draw.ellipse((px(72), px(62), px(96), px(86)), outline=copper, width=px(2))
draw.line((px(84), px(50), px(84), px(98)), fill=copper, width=px(2))
draw.line((px(60), px(74), px(108), px(74)), fill=copper, width=px(2))
text(118, 58, "vue-rtl-kit", serif, ink)
text(968, 62, release, label, copper)
rule(64, 118, 1072, ink, 2)

text(64, 156, headline, serif_lg, ink)
text(64, 248, accent, italic, copper)
rule(64, 360, 84, copper, 8)
text(64, 392, "Direction for Vue & Nuxt", face(serif_path, 28), ink)
text(64, 438, tagline, small, muted)

plate = (760, 156, 1088, 520)
draw.rectangle((px(plate[0]), px(plate[1]), px(plate[2]), px(plate[3])), fill=cream, outline=muted, width=px(2))
draw.line((px(784), px(180), px(806), px(180)), fill=copper, width=px(2))
draw.line((px(784), px(180), px(784), px(202)), fill=copper, width=px(2))
draw.line((px(1064), px(180), px(1042), px(180)), fill=copper, width=px(2))
draw.line((px(1064), px(180), px(1064), px(202)), fill=copper, width=px(2))
arabic_width = glyphs(792, 214, arabic_glyphs, naskh, ink)
specimen_width = glyphs(792, 292, specimen_glyphs, naskh_lg, copper)
text(792, 468, "LTR / RTL", label, ink)
if arabic_width > 280 or specimen_width > 280:
    raise SystemExit("Arabic proof is not left-aligned inside the plate")
rule(64, 548, 1072, ink, 2)
text(64, 566, "Aa", face(serif_path, 22), copper)

output = public / "og-image.png"
image = image.resize((1200, 630), Image.Resampling.LANCZOS)
image.save(output, format="PNG", optimize=True, compress_level=9)
with Image.open(output) as check:
    if check.format != "PNG" or check.size != (1200, 630):
        raise SystemExit("Generated artwork is not a 1200x630 PNG")
print(f"Generated {output.name}: 1200x630 RGB PNG, {output.stat().st_size:,} bytes")
`, root, version], { stdio: 'inherit' })

if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)
