import { spawnSync } from 'node:child_process'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const publicDirectory = fileURLToPath(new URL('../site/public/', import.meta.url))
const result = spawnSync(process.env.PYTHON ?? 'python3', ['-c', String.raw`
from functools import lru_cache
from io import BytesIO
from pathlib import Path
import sys

try:
    from PIL import Image, ImageDraw, ImageFont
    from fontTools.ttLib import TTFont
except ImportError as error:
    raise SystemExit("OG generation requires Python with Pillow, fonttools and brotli installed.") from error

public = Path(sys.argv[1])
scale = 3
paper = "#f6f5f0"
ink = "#202521"
cobalt = "#2458e8"
blue = "#e9edf9"
lime = "#d6ec8a"
image = Image.new("RGB", (1200 * scale, 630 * scale), paper)
draw = ImageDraw.Draw(image)
font_data = {}

for family, filename, characters in [
    ("latin", "Manrope-latin.woff2", "vue-rtl-kitTwo directions.One Vue.Aa"),
    ("arabic", "NotoSansArabic-arabic.woff2", "ع"),
]:
    with TTFont(public / "fonts" / filename) as source:
        missing = {char for char in characters if ord(char) not in source.getBestCmap()}
        if missing:
            raise SystemExit(f"Missing glyphs in {filename}: {missing}")
        axes = source["fvar"].axes
        if len(axes) != 1 or axes[0].axisTag != "wght":
            raise SystemExit(f"Expected a single weight axis in {filename}")
        source.flavor = None
        buffer = BytesIO()
        source.save(buffer)
        font_data[family] = buffer.getvalue()

@lru_cache(maxsize=None)
def font(size, weight=500, family="latin"):
    face = ImageFont.truetype(BytesIO(font_data[family]), size * scale)
    face.set_variation_by_axes([weight])
    return face

def text(x, y, value, size, color=ink, weight=500, family="latin", anchor="lt"):
    draw.text((x * scale, y * scale), value, font=font(size, weight, family), fill=color, anchor=anchor)

def rectangle(x, y, width, height, color):
    draw.rectangle((x * scale, y * scale, (x + width) * scale - 1, (y + height) * scale - 1), fill=color)

def line(points, color=cobalt, width=3):
    draw.line([(x * scale, y * scale) for x, y in points], fill=color, width=width * scale, joint="curve")

def arrow(x, y, length, direction=1, color=cobalt):
    end = x + length * direction
    line([(x, y), (end, y)], color)
    line([(end - 8 * direction, y - 8), (end, y), (end - 8 * direction, y + 8)], color)

line([(64, 64), (71, 64), (90, 83), (97, 83)])
line([(90, 76), (97, 83), (90, 90)])
line([(97, 64), (90, 64), (71, 83), (64, 83)])
line([(71, 76), (64, 83), (71, 90)])
text(115, 65, "vue-rtl-kit", 24, weight=750)
rectangle(1008, 56, 128, 36, lime)
text(1072, 65, "LTR / RTL", 15, weight=750, anchor="mt")
rectangle(64, 122, 1072, 1, ink)

headline = "Two directions."
if draw.textlength(headline, font=font(98, 750)) > 744 * scale:
    raise SystemExit("Headline exceeds its layout bounds.")
text(59, 198, headline, 98, weight=750)
text(59, 320, "One Vue.", 110, cobalt, weight=750)
rectangle(64, 476, 64, 8, lime)

rectangle(840, 154, 204, 184, blue)
text(860, 173, "ENGLISH", 13, weight=750)
text(860, 202, "Aa", 90, weight=650)
arrow(863, 313, 155)

rectangle(924, 350, 212, 184, cobalt)
text(1116, 369, "ARABIC", 13, paper, weight=750, anchor="rt")
text(1030, 400, "ع", 90, paper, weight=600, family="arabic", anchor="mt")
arrow(1112, 509, 163, -1, paper)

rectangle(64, 557, 1072, 1, ink)
text(64, 584, "Direction · Logical styles · Bidirectional text", 20, weight=550)
arrow(1058, 587, 72)
arrow(1130, 603, 72, -1)

output = public / "og-image.png"
image = image.resize((1200, 630), Image.Resampling.LANCZOS)
image.save(output, format="PNG", optimize=True, compress_level=9)
with Image.open(output) as check:
    if check.format != "PNG" or check.size != (1200, 630):
        raise SystemExit("Generated artwork is not a 1200×630 PNG.")
print(f"Generated {output.name}: 1200×630 RGB PNG, {output.stat().st_size:,} bytes")
`, publicDirectory], { stdio: 'inherit' })

if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)
