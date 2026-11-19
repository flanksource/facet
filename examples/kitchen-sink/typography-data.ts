/**
 * Copy and constants for TypographyTest.tsx.
 *
 * Deliberately a .ts, not a .tsx: the gavel fixture in fixtures/html.md globs
 * `../*.tsx` and renders every match through `facet html`, so a .tsx here would
 * become a document of its own.
 */

/**
 * The `.text-*` steps, largest first.
 *
 * Class names are literal strings, never `text-${step}`. Tailwind scans source
 * text for class names, so an interpolated name is not generated and the sample
 * renders at the inherited size while its label claims otherwise.
 */
export const UTILITY_SPECS = [
  { cls: 'text-2xl', themeKey: 'Text2xl', sample: 'Hero display' },
  { cls: 'text-xl', themeKey: 'TextXl', sample: 'Large display' },
  { cls: 'text-lg', themeKey: 'TextLg', sample: 'Emphasised text and callouts' },
  { cls: 'text-md', themeKey: 'TextMd', sample: 'Default body equivalent' },
  { cls: 'text-base', themeKey: 'TextBase', sample: 'Tailwind’s default step — the same 10pt as text-md' },
  { cls: 'text-sm', themeKey: 'TextSm', sample: 'Secondary text, captions, supporting detail' },
  { cls: 'text-xs', themeKey: 'TextXs', sample: 'Fine print, footnotes, metadata annotations' },
] as const;

/**
 * Short rows for the size comparison on page 6. The shared fixtures in data.ts
 * carry long identifiers and a multi-value row, which at a fraction of the page
 * width wrap so heavily that the four sizes become impossible to compare —
 * the point of that page is the size step, not the content.
 */
export const SIZE_SPECS = [
  { category: 'Kubernetes', value: '1.24+' },
  { category: 'PostgreSQL', value: '13+' },
  { category: 'Memory', value: '4GB' },
];

export const SIZE_ROWS = [
  ['api', 'healthy'],
  ['db', 'healthy'],
  ['queue', 'degraded'],
];

/**
 * Used verbatim by both the `p` and `body` specimens on page 1. Holding the
 * text identical is what makes the 9pt/10pt step read as a difference rather
 * than as an assertion the reader has to take on trust.
 */
export const BODY_COPY =
  'Nodes were drained in a rolling sequence so quorum held throughout, and the ingress fleet absorbed the shifted load without breaching the error budget.';

/** Same idea as BODY_COPY, for the .prose comparison on page 4. */
export const PROSE_PROBE =
  'The same sentence, set once inside .prose and once outside it.';

export const SNIPPET = `kind: Canary
metadata:
  name: ingress-latency
spec:
  schedule: "@every 30s"`;

// ── Page 7: callouts and admonitions ───────────────────────────────

/**
 * The five GitHub alert tones, in the order the markdown plugin lists them.
 *
 * `variant` doubles as the markdown label — `note` is `> [!NOTE]` — which is the
 * whole point of the page: one tone set, reachable from TSX and from plain
 * markdown, rendering the same box. `md` carries the literal syntax so the
 * specimen shows the source beside the result rather than asserting they match.
 */
export const CALLOUT_TONES = [
  { variant: 'note', md: '> [!NOTE]', use: 'Context worth noticing while skimming' },
  { variant: 'tip', md: '> [!TIP]', use: 'A better way to do the thing' },
  { variant: 'important', md: '> [!IMPORTANT]', use: 'Necessary to get the result' },
  { variant: 'warning', md: '> [!WARNING]', use: 'Needs attention to avoid a problem' },
  { variant: 'caution', md: '> [!CAUTION]', use: 'Risk of data loss or a security hole' },
] as const;

/**
 * An annotated-review callout: identifier chip, tone label overriding the tone's
 * own name, and an attribution. This is the shape that motivated the header row
 * — a reviewed document needs to say which note this is and who raised it.
 */
export const CALLOUT_ANNOTATION = {
  badge: 'N14',
  label: 'Correction',
  source: 'Jonno',
  body: 'The two enforcement checks cannot be implemented as written. The ID token carries a single assurance string and a generic method list, and neither proves which factor ran.',
};

export const CALLOUT_EMPHASIS = {
  badge: 'N33',
  label: 'Correction — core blocker',
  source: 'Analysis',
  body: 'A full border replaces the left rule when a callout blocks rather than informs, so the reader can find the blockers without reading every aside.',
};

/** Body copy for the plain tone specimens, short enough that five fit a column. */
export const CALLOUT_SAMPLE = 'One tone set, two entry points, the same rendered box.';

/**
 * The header row has no plain-markdown form.
 *
 * `> [!TYPE]` carries the tone and nothing else — the label is fixed to the tone
 * name, and there is no slot for an identifier or an attribution. So the
 * equivalent is MDX, which is why the page shows this rather than a `>` block.
 */
export const CALLOUT_HEADER_SOURCE = `<CalloutBox variant="caution" badge="N14" label="Correction" source="Jonno">
  The two enforcement checks cannot be implemented as written.
</CalloutBox>`;

// ── Page 5: worked document ────────────────────────────────────────

export const REPORT = {
  title: 'Ingress Reliability Review',
  lede: 'The ingress fleet served 4.1 billion requests across twelve clusters this quarter.',
  availability:
    'Availability finished at 99.94%, inside the 99.9% objective. Both breaches came from the same regional load balancer, and both were resolved by draining rather than rollback.',
  budget: [
    'INC-4471 — 38 minutes of elevated 5xx in eu-west-1',
    'INC-4489 — 11 minutes of connection resets during a certificate rotation',
    'Remaining error budget at quarter end: 62%',
  ],
  latency:
    'Median latency was flat quarter on quarter. The p99 improved by 26 ms after connection reuse was enabled at the edge.',
  quote:
    'The p99 improvement came entirely from connection reuse — no capacity was added.',
  regions: [
    ['us-east-1', '142 ms', '99.97%'],
    ['eu-west-1', '168 ms', '99.88%'],
    ['ap-southeast-2', '211 ms', '99.95%'],
  ],
  next: [
    'Extend connection reuse to the internal mesh',
    'Re-baseline the latency objective against the new p99',
  ],
};
