"""Write the facet masters (symbols, small cuts, lockups, wordmark) next to this script.

Needs fontTools and Inter Bold (SIL OFL 1.1, https://github.com/rsms/inter/releases):
    python3 build_kit.py path/to/Inter-Bold.ttf
"""
import sys
from pathlib import Path

from outline_text import outline

HERE = Path(__file__).parent
FONT = Path(sys.argv[1]) if len(sys.argv) > 1 else None

NAVY, BLUE, SKY, WHITE = "#131f3b", "#3578e5", "#0ea5e9", "#ffffff"
LIGHT = {"body": NAVY, "accent": BLUE, "word": NAVY}
DARK = {"body": WHITE, "accent": SKY, "word": WHITE}

# Each piece is (role, path data) on the 256 grid; role picks the colour.
BRANDS = {
    "facet": {
        "title": "facet",
        "symbol": [
            ("body", "M94 36H152V72H130V100H146V132H130V220H94V132H62V100H94Z"),
            ("accent", "M158 36L194 72V116H158Z"),
        ],
        # 16-unit seam (1 px at 16 px) instead of 6.
        "small": [
            ("body", "M88 36H144V72H124V100H140V132H124V220H88V132H60V100H88Z"),
            ("accent", "M160 36L196 72V116H160Z"),
        ],
        "symbol_right": 194,
    },
}

WORD_SIZE, WORD_BASELINE, WORD_TRACKING, WORD_GAP = 120, 172, -3, 40
STACK_SIZE, STACK_BASELINE = 96, 336


def paths(pieces, palette, dx=0.0, dy=0.0):
    group = "".join(f'<path fill="{palette[role]}" d="{d}"/>' for role, d in pieces)
    return f'<g transform="translate({dx:g} {dy:g})">{group}</g>' if dx or dy else group


def svg(view_box, title, body, background=None):
    bg = f'<rect width="100%" height="100%" fill="{background}"/>' if background else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_box}">'
            f"<title>{title} logo</title>{bg}{body}</svg>\n")


def write(brand, name, text):
    (HERE / name).write_text(text)


def build(brand, spec):
    title = spec["title"]
    for variant, palette, suffix in (("symbol", LIGHT, ""), ("symbol", DARK, "-reversed"),
                                     ("small", LIGHT, ""), ("small", DARK, "-reversed")):
        name = f"{brand}-{'symbol' if variant == 'symbol' else 'symbol-small'}{suffix}.svg"
        write(brand, name, svg("0 0 256 256", title, paths(spec[variant], palette)))

    word_x = spec["symbol_right"] + WORD_GAP
    word, right = outline(str(FONT), title, WORD_SIZE, word_x, WORD_BASELINE, WORD_TRACKING)
    width = round(right + 36)
    for palette, suffix in ((LIGHT, ""), (DARK, "-reversed")):
        body = paths(spec["symbol"], palette) + f'<path fill="{palette["word"]}" d="{word}"/>'
        write(brand, f"{brand}-horizontal{suffix}.svg", svg(f"0 0 {width} 256", title, body))

    probe, probe_right = outline(str(FONT), title, STACK_SIZE, 0, STACK_BASELINE, WORD_TRACKING)
    stack_width = max(256, round(probe_right + 64))
    stacked_word, _ = outline(str(FONT), title, STACK_SIZE, (stack_width - probe_right) / 2, STACK_BASELINE, WORD_TRACKING)
    for palette, suffix in ((LIGHT, ""), (DARK, "-reversed")):
        body = paths(spec["symbol"], palette, dx=(stack_width - 256) / 2) + f'<path fill="{palette["word"]}" d="{stacked_word}"/>'
        write(brand, f"{brand}-stacked{suffix}.svg", svg(f"0 0 {stack_width} 372", title, body))

    wordmark, word_right = outline(str(FONT), title, WORD_SIZE, 0, WORD_BASELINE, WORD_TRACKING)
    write(brand, f"{brand}-wordmark.svg", svg(f"0 60 {round(word_right)} 140", title, f'<path fill="{NAVY}" d="{wordmark}"/>'))

    for name, background in ((f"{brand}-horizontal-on-dark.svg", NAVY),):
        body = paths(spec["symbol"], DARK) + f'<path fill="{WHITE}" d="{word}"/>'
        write(brand, name, svg(f"0 0 {width} 256", title, body, background))
    write(brand, f"{brand}-symbol-on-tile.svg",
          svg("0 0 256 256", title, f'<rect width="256" height="256" rx="56" fill="{NAVY}"/>'
              + paths(spec["symbol"], DARK, dx=0, dy=0).replace("<path", "<path transform=\"translate(25.6 25.6) scale(0.8)\"")))


if __name__ == "__main__":
    if FONT is None or not FONT.is_file():
        raise SystemExit("usage: build_kit.py path/to/Inter-Bold.ttf")
    for brand, spec in BRANDS.items():
        build(brand, spec)
        print(f"wrote {brand} masters to {HERE}")
