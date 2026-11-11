# facet logo kit

The f's hook is a page corner folded on a 45° crease: print, made from the letter itself. Start with [the usage guide](GUIDELINES.md) and [the presentation](presentation/presentation.html).

## Files

| Folder | Contents |
| --- | --- |
| `source/` | Colour masters: horizontal, stacked, symbol, small symbol and wordmark, each with a `-reversed` version; the on-dark lockup and the on-tile symbol; `build_kit.py` and `outline_text.py`, which generate them |
| `digital/` | One-colour black, white, navy and blue SVGs with transparent PNG exports, plus the square, app-icon and favicon artwork |
| `web/` | Favicon SVG and ICO (16/32/48), matching PNGs, Apple touch icon, PWA icons, `site.webmanifest`, `head-snippet.html` |
| `presentation/` | Self-contained presentation HTML, its spec and the slide PNGs |

Use `source/facet-horizontal.svg` on light backgrounds and `source/facet-horizontal-reversed.svg` on dark ones. Use `source/facet-symbol-small.svg` below 32 px; the favicons are built from it. PNGs follow the repository's `*.png` ignore rule, so only the SVGs, ICO, manifest and snippet are tracked; regenerate the PNGs with the export script.

## Web handover

Copy `web/` to the host's public root and add the markup from `web/head-snippet.html`. The snippet assumes a public-root install; for a base path, prefix its URLs. The manifest's icon paths are relative to the manifest. `facet serve` inlines `web/favicon.svg` in the playground page, so it needs no extra route.

## Regenerating

```bash
pip install fonttools
python3 assets/brand/source/build_kit.py path/to/Inter-Bold.ttf
```

Inter is available from <https://github.com/rsms/inter/releases> under the SIL Open Font License 1.1. Regenerate the one-colour and web exports with `export_variants.py` from the logo-design skill.

## Status

The SVG audit (`svg_audit.py` from the logo-design skill) passes; the only notes are Inter's glyph angles and the intentional optical offset. No print proof or trademark clearance has been done.
