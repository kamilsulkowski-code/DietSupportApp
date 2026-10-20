"""Rasterize the code-native Forma leaf at PWA/Apple sizes. Requires Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw


def curve(start, c1, c2, end, steps=60):
    return [tuple((1-t)**3*start[i]+3*(1-t)**2*t*c1[i]+3*(1-t)*t*t*c2[i]+t**3*end[i]
                  for i in (0, 1)) for t in (n/steps for n in range(steps+1))]


# Same path and transform as dist/icons/icon.svg; keep the leaf in the maskable safe zone.
outline = curve((51, 7), (23, 8), (9, 23), (9, 42))
outline += curve((9, 42), (9, 52), (16, 58), (24, 58))
outline += curve((24, 58), (45, 58), (53, 34), (51, 7))
icons = Path(__file__).resolve().parents[1] / "dist" / "icons"
for size, name in ((192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png")):
    scale = size * 4 / 512
    transform = lambda p: ((76 + p[0]*6)*scale, (56 + p[1]*6)*scale)
    image = Image.new("RGB", (size*4, size*4), "#102f29")
    draw = ImageDraw.Draw(image)
    draw.polygon([transform(p) for p in outline], fill="#b7f55b")
    draw.line([transform((19, 48)), transform((39, 23))], fill="#102f29", width=round(2.5*6*scale))
    image.resize((size, size), Image.Resampling.LANCZOS).save(icons / name, optimize=True)
    print(name, size)
