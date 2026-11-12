#!/usr/bin/env python3
"""Put two lines of large text on a still to make a cover (1080x1920).

  python3 make_cover.py <still.png> "<line 1>" "<line 2>" <out.jpg> [--en] [--band 3a2a68] [--accent ffd9a0]

Line 1 is white, line 2 uses the accent colour. Text sits on a soft colour band low in the frame.
Pick a still from a moment with no subtitle on screen (the lead-in or the tail), e.g.
  node tools/render.mjs still <ep> 1.0 /tmp/cover_base.png
"""
import argparse
from PIL import Image, ImageDraw, ImageFont

ZH = ['/System/Library/Fonts/Supplemental/Songti.ttc', '/System/Library/Fonts/PingFang.ttc', '/System/Library/Fonts/STHeiti Medium.ttc']
EN = ['/System/Library/Fonts/Supplemental/Georgia Bold.ttf', '/System/Library/Fonts/Supplemental/Baskerville.ttc']


def font(paths, size):
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            continue
    raise SystemExit('no usable font found: ' + ', '.join(paths))


def fit(draw, text, paths, size, max_w):
    while size > 40:
        f = font(paths, size)
        if draw.textlength(text, font=f) <= max_w:
            return f
        size -= 4
    return font(paths, size)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('still'); ap.add_argument('line1'); ap.add_argument('line2'); ap.add_argument('out')
    ap.add_argument('--en', action='store_true', help='use the English fonts')
    ap.add_argument('--band', default='3a2a68', help='band colour, hex')
    ap.add_argument('--accent', default='ffd9a0', help='colour of line 2, hex')
    a = ap.parse_args()

    img = Image.open(a.still).convert('RGB').resize((1080, 1920))
    band = tuple(int(a.band[i:i + 2], 16) for i in (0, 2, 4))
    # soft band: transparent at y=1180, strongest from y=1420 down
    grad = Image.new('L', (1, 1920), 0)
    for y in range(1920):
        grad.putpixel((0, y), int(215 * min(1, max(0, (y - 1180) / 240))))
    img.paste(Image.new('RGB', img.size, band), (0, 0), grad.resize(img.size))

    d = ImageDraw.Draw(img)
    paths = EN if a.en else ZH
    base = 84 if a.en else 104
    y = 1470
    for text, colour in ((a.line1, '#ffffff'), (a.line2, '#' + a.accent)):
        f = fit(d, text, paths, base, 960)
        w = d.textlength(text, font=f)
        d.text(((1080 - w) / 2, y), text, font=f, fill=colour)
        y += int(f.size * 1.45)
    img.save(a.out, quality=93)
    print('wrote', a.out)


if __name__ == '__main__':
    main()
