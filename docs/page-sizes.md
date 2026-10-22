# Page-size presets

Set `pageSize` on `Document` to establish the default, or on `Page` to override it. Named presets are case-insensitive. Custom `WIDTHxHEIGHT` strings continue to use millimetres, for example `297x210`.

```tsx
import { Document, Page } from '@flanksource/facet';

export default function Creative() {
  return (
    <Document pageSize="facebook-square">
      <Page id="creative" className="bg-slate-900 text-white">
        <h1>Build with clarity</h1>
        <p>A full-bleed square canvas.</p>
      </Page>
    </Document>
  );
}
```

Platform and PowerPoint presets establish a fixed canvas in HTML. PNG captures the native size at 1×; use `--selector '#creative'` to capture one page in a multi-page document. Explicit PNG scaling and autocrop still apply when requested. Content must fit the canvas; `Page` clips overflow. Margins remain millimetres and default to zero. PDF dimensions convert at 96 CSS pixels per inch.

## Render multiple sizes

Use repeatable `--sizes <name-or-glob>` with PNG or PDF. Quote globs so the shell passes them to Facet:

```bash
facet png examples/page-sizes/Canvas.tsx --sizes 'facebook-*' --sizes 'linkedin-*' -o .tmp/campaign.png
facet pdf examples/page-sizes/Canvas.tsx --sizes 'google-ads-*' -o .tmp/campaign.pdf
facet png examples/page-sizes/Canvas.tsx --sizes facebook-square --sizes 100x200 -o .tmp/campaign.png
```

Each match produces a separate file, for example `campaign-facebook-square.png`, `campaign-linkedin-portrait.png`, or `campaign-100x200.png`. A single selected size also gets a suffix. With a directory output, Facet resolves the usual data-derived or template-derived basename before appending the size.

Patterns match catalog names case-insensitively. Each pattern's matches are sorted alphabetically, patterns retain argument order, and overlapping selections render once. Exact custom sizes use millimetres and normalize numeric spelling (`100.0x200` becomes `100x200`). Empty, unknown, and unmatched selections fail before rendering. The same selection applies to every supplied template.

Every selected size overrides the template's page dimensions before layout, including live diagrams. Pixel presets clip overflow to their canvas; paper/custom sizes retain flowing content. PNG selector, raster scaling, and autocrop still apply after layout, so these can change the captured dimensions. In multi-page documents, select one page with `--selector` when needed. PDF landscape and margin options apply to each variant.

`--sizes` cannot be combined with an explicit PDF `--page-size` or PNG `--viewport`. Without `--sizes`, filenames and existing size defaults are unchanged. Data loads once per template. Rendering stops on the first failure, identifies the template and size, and leaves completed files in place. Intermediate/debug filenames receive the same suffix.

Remote CLI rendering supports the same syntax through `--facet-url` or `FACET_URL`. Facet expands the selection locally and submits one request per concrete size. API clients can set top-level `pageSizeOverride` to a concrete preset or custom size in JSON, multipart options, or the gzip query string. `/render` and `/render/stream` each return one artifact; the override takes precedence over `pdfOptions.defaultPageSize` and participates in cache identity.

## PowerPoint

`powerpoint-wide` is 16:9, 1280×720 CSS pixels (13⅓×7.5 inches). `powerpoint-standard` is 4:3, 960×720 CSS pixels (10×7.5 inches). Either preset selects the dimensions of the entire PPTX deck, including pages with other sizes. Conflicting PowerPoint presets in one deck fail explicitly. Templates without a PowerPoint preset retain widescreen reflow.

The selected width applies before live diagrams measure their layout. Text and tables remain editable and continue onto additional slides, with repeated table headers. The default presentation body size remains 18pt. Configure Office sizes with template props; `--page-size` and `pdfOptions.defaultPageSize` configure PDF defaults.

## Runnable examples

Run these commands from the repository root after installing the Facet CLI:

```bash
facet html examples/page-sizes/Canvas.tsx -o .tmp/page-sizes/facebook.html
facet png examples/page-sizes/Canvas.tsx --selector '#creative' -o .tmp/page-sizes/facebook.png
facet pdf examples/page-sizes/Canvas.tsx -o .tmp/page-sizes/facebook.pdf
facet pptx examples/page-sizes/Canvas.tsx -d examples/page-sizes/standard.json -o .tmp/page-sizes/standard.pptx
facet pptx examples/page-sizes/Canvas.tsx -d examples/page-sizes/wide.json -o .tmp/page-sizes/wide.pptx
```

## Catalog

`PAGE_SIZE_PRESETS` and the `PageSizePreset` type are exported from `@flanksource/facet`. Each entry includes its group, label, width, height, and unit. React, PDF, PowerPoint, and the playground selector consume the same catalog in `src/types/page-sizes.json`; existing paper and screen measurements are preserved.

| Name | Purpose | Dimensions |
| --- | --- | --- |
| `a4` | Paper — A4 | 210 × 297 mm |
| `a4-landscape` | Paper — A4 landscape | 297 × 210 mm |
| `a3` | Paper — A3 | 297 × 420 mm |
| `a3-landscape` | Paper — A3 landscape | 420 × 297 mm |
| `letter` | Paper — Letter | 215.9 × 279.4 mm |
| `letter-landscape` | Paper — Letter landscape | 279.4 × 215.9 mm |
| `legal` | Paper — Legal | 215.9 × 355.6 mm |
| `legal-landscape` | Paper — Legal landscape | 355.6 × 215.9 mm |
| `fhd` | Screen — FHD | 508 × 285.75 mm |
| `qhd` | Screen — QHD | 677.33 × 381 mm |
| `wqhd` | Screen — WQHD | 846.67 × 381 mm |
| `4k` | Screen — 4K | 1016 × 571.5 mm |
| `5k` | Screen — 5K | 1354.67 × 762 mm |
| `16k` | Screen — 16K | 406.4 × 304.8 mm |
| `powerpoint-wide` | PowerPoint — Widescreen (16:9) | 1280 × 720 px |
| `powerpoint-standard` | PowerPoint — Standard (4:3) | 960 × 720 px |
| `facebook-post` | Facebook — Post | 1200 × 630 px |
| `facebook-square` | Facebook — Square / carousel | 1080 × 1080 px |
| `facebook-portrait` | Facebook — Portrait | 1080 × 1350 px |
| `facebook-story` | Facebook — Story | 1080 × 1920 px |
| `facebook-ad` | Facebook — Landscape ad | 1200 × 628 px |
| `facebook-cover` | Facebook — Cover | 851 × 315 px |
| `facebook-profile` | Facebook — Profile | 400 × 400 px |
| `linkedin-post` | LinkedIn — Post / link | 1200 × 627 px |
| `linkedin-square` | LinkedIn — Square | 1200 × 1200 px |
| `linkedin-portrait` | LinkedIn — Portrait | 720 × 900 px |
| `linkedin-ad` | LinkedIn — Landscape ad | 1200 × 628 px |
| `linkedin-profile` | LinkedIn — Profile / company logo | 400 × 400 px |
| `linkedin-profile-cover` | LinkedIn — Profile cover | 1584 × 396 px |
| `linkedin-company-cover` | LinkedIn — Company cover | 1512 × 256 px |
| `linkedin-article-cover` | LinkedIn — Article cover | 1920 × 1080 px |
| `reddit-post` | Reddit — Post / landscape ad | 1440 × 1080 px |
| `reddit-square` | Reddit — Square | 1080 × 1080 px |
| `reddit-portrait` | Reddit — Portrait | 1080 × 1350 px |
| `reddit-wide` | Reddit — Widescreen | 1920 × 1080 px |
| `reddit-thumbnail` | Reddit — Conversation thumbnail | 400 × 300 px |
| `reddit-banner` | Reddit — Community banner | 1072 × 128 px |
| `reddit-banner-mobile` | Reddit — Mobile community banner | 1080 × 128 px |
| `google-ads-landscape` | Google Ads — Responsive landscape | 1200 × 628 px |
| `google-ads-square` | Google Ads — Responsive square | 1200 × 1200 px |
| `google-ads-portrait` | Google Ads — Responsive portrait | 900 × 1600 px |
| `google-ads-200x200` | Google Ads — Display 200×200 | 200 × 200 px |
| `google-ads-240x400` | Google Ads — Display 240×400 | 240 × 400 px |
| `google-ads-250x250` | Google Ads — Display 250×250 | 250 × 250 px |
| `google-ads-250x360` | Google Ads — Display 250×360 | 250 × 360 px |
| `google-ads-300x250` | Google Ads — Display 300×250 | 300 × 250 px |
| `google-ads-336x280` | Google Ads — Display 336×280 | 336 × 280 px |
| `google-ads-580x400` | Google Ads — Display 580×400 | 580 × 400 px |
| `google-ads-120x600` | Google Ads — Display 120×600 | 120 × 600 px |
| `google-ads-160x600` | Google Ads — Display 160×600 | 160 × 600 px |
| `google-ads-300x600` | Google Ads — Display 300×600 | 300 × 600 px |
| `google-ads-300x1050` | Google Ads — Display 300×1050 | 300 × 1050 px |
| `google-ads-468x60` | Google Ads — Display 468×60 | 468 × 60 px |
| `google-ads-728x90` | Google Ads — Display 728×90 | 728 × 90 px |
| `google-ads-930x180` | Google Ads — Display 930×180 | 930 × 180 px |
| `google-ads-970x90` | Google Ads — Display 970×90 | 970 × 90 px |
| `google-ads-970x250` | Google Ads — Display 970×250 | 970 × 250 px |
| `google-ads-980x120` | Google Ads — Display 980×120 | 980 × 120 px |
| `google-ads-300x50` | Google Ads — Display 300×50 | 300 × 50 px |
| `google-ads-320x50` | Google Ads — Display 320×50 | 320 × 50 px |
| `google-ads-320x100` | Google Ads — Display 320×100 | 320 × 100 px |

## Platform references

The image presets cover common publishing and advertising canvases. Square and portrait variants can also be used for carousel cards. Canvas dimensions do not enforce upload file-size limits, safe areas, compression, or campaign policy.

PowerPoint dimensions follow [Microsoft's slide-size documentation](https://support.microsoft.com/en-us/powerpoint/change-the-size-of-your-powerpoint-slides). LinkedIn presets distinguish [post/company images](https://www.linkedin.com/help/linkedin/answer/a564330), [single-image ads](https://business.linkedin.com/advertise/ads/sponsored-content/single-image-ads-specs), [profile covers](https://www.linkedin.com/help/linkedin/answer/a568217/), and [article covers](https://www.linkedin.com/help/linkedin/answer/a521719). Reddit presets follow its [ad specifications](https://business.reddithelp.com/articles/Knowledge/Reddit-Ad-Unit-Specifications) and [community banner guidance](https://support.reddithelp.com/hc/en-us/articles/15484339588884-Banner). Google formats follow its [responsive ad guidance](https://support.google.com/google-ads/answer/9823397?hl=en) and [uploaded display specifications](https://support.google.com/google-ads/answer/1722096?hl=en-GB); some display dimensions are region-specific.

Facebook dimensions are conventional authoring defaults. Meta's public specification pages required login when checked on 2026-10-22. Review the target placement's current preview and upload requirements before publishing.
