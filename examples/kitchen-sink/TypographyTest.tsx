import React from 'react';
import {
  CalloutBox,
  CompactTable,
  Document,
  Page,
  SpecificationTable,
  StatCard,
  SyntaxHighlighter,
  Theme,
} from '@flanksource/facet';
import type { TableSize, TypographyStyle } from '@flanksource/facet';
import { IoCloudDone, IoPulse, IoShieldCheckmark } from 'react-icons/io5';
import FlanksourceHeader from './FlanksourceHeader';
import FlanksourceFooter from './FlanksourceFooter';
import {
  BODY_COPY,
  CALLOUT_ANNOTATION,
  CALLOUT_EMPHASIS,
  CALLOUT_HEADER_SOURCE,
  CALLOUT_SAMPLE,
  CALLOUT_TONES,
  PROSE_PROBE,
  REPORT,
  SIZE_ROWS,
  SIZE_SPECS,
  SNIPPET,
  UTILITY_SPECS,
} from './typography-data';

const TABLE_SIZES: TableSize[] = ['xs', 'sm', 'base', 'md'];
const LINE_SAMPLES = [
  { label: 'text-xs — 7pt / 9pt', className: 'text-xs' },
  { label: 'text-sm — 9pt / 12pt', className: 'text-sm' },
  { label: 'text-base — 10pt / 14pt', className: 'text-base' },
  { label: 'text-lg — 15pt / 19pt', className: 'text-lg' },
] as const;

// ── Building blocks ────────────────────────────────────────────────

/**
 * One specimen: the live sample on the left, its measured spec on the right.
 *
 * `children` renders through the real element or a literal utility class, so
 * the sample is whatever the stylesheet actually produces. `style` is only ever
 * read — applying Theme.H1.fontSize to the specimen would force the size
 * instead of measuring it, and the row would prove nothing.
 */
function SpecimenRow({ selector, style, children }: {
  selector: string;
  style: TypographyStyle;
  children: React.ReactNode;
}) {
  // flex, not `grid-cols-[1fr_36mm]` — Tailwind does not generate that
  // arbitrary track list, so the grid silently collapsed to one column and
  // stacked each label under its specimen instead of beside it.
  return (
    <div className="flex items-start gap-[4mm] border-b border-gray-100 pb-1">
      <div className="flex-1 min-w-0">{children}</div>
      <div className="w-32 shrink-0 text-xs leading-[9pt] text-gray-500">
        <div className="font-mono font-semibold text-gray-700">{selector}</div>
        <div>size <span className="font-mono text-gray-800">{style.fontSize}</span></div>
        {style.lineHeight && <div>leading <span className="font-mono text-gray-800">{style.lineHeight}</span></div>}
        {style.margin && <div>margin <span className="font-mono text-gray-800">{style.margin}</span></div>}
      </div>
    </div>
  );
}

/** House-convention demo heading. */
function Demo({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
      {children}
    </div>
  );
}

/** Bare table markup, so the stylesheet's own table rules are what is on show. */
function SurfaceTable({ label, className }: { label: string; className?: string }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 mb-1">{label}</h4>
      <table className={className}>
        <thead><tr><th>Region</th><th>p99</th></tr></thead>
        <tbody>
          <tr><td>us-east-1</td><td>142 ms</td></tr>
          <tr><td>eu-west-1</td><td>168 ms</td></tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Page 1 — element scale ─────────────────────────────────────────

function ElementScale() {
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">
        Every sample below is the bare HTML element, styled only by the facet stylesheet.
        The figures beside it are read from <code>Theme</code> — printed, never applied.
      </p>

      <SpecimenRow selector="h1" style={Theme.H1}>
        <h1>Ingress Reliability Review</h1>
      </SpecimenRow>

      <SpecimenRow selector="h2" style={Theme.H2}>
        <h2>Availability and error budget</h2>
      </SpecimenRow>

      <SpecimenRow selector="h3" style={Theme.H3}>
        <h3>Latency at the edge</h3>
      </SpecimenRow>

      <SpecimenRow selector="h4" style={Theme.H4}>
        <h4>p99 by region</h4>
      </SpecimenRow>

      <SpecimenRow selector="p" style={Theme.P}>
        <p>{BODY_COPY}</p>
      </SpecimenRow>

      {/* Same sentence as the row above, in a bare div that takes the body rule.
          The pair is the difference between the document baseline and a
          paragraph, which sits one step below it. */}
      <SpecimenRow selector="body" style={Theme.Body}>
        <div>{BODY_COPY}</div>
      </SpecimenRow>

      <SpecimenRow selector="strong" style={Theme.P}>
        <p>
          Nodes were drained in a <strong>rolling sequence</strong> to preserve quorum.
          <strong> strong</strong> changes weight only, and inherits its parent&apos;s size.
        </p>
      </SpecimenRow>
    </div>
  );
}

// ── Page 2 — utility scale ─────────────────────────────────────────

function UtilityScale() {
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">
        The <code>text-*</code> utilities, largest first. Each step carries its own leading,
        so a sample sets on its own baseline rather than the one it inherits.
      </p>

      {UTILITY_SPECS.map(spec => (
        <SpecimenRow
          key={spec.cls}
          selector={`.${spec.cls}`}
          style={Theme[spec.themeKey]}
        >
          <p className={spec.cls}>{spec.sample}</p>
        </SpecimenRow>
      ))}

      <p className="text-xs text-gray-500">
        <code>text-base</code> and <code>text-md</code> are both 10pt — the Tailwind default step
        and facet&apos;s own name for it resolve to the same size.
      </p>
    </div>
  );
}

// ── Page 3 — line and paragraph spacing ────────────────────────────

function TypographySpacing() {
  return (
    <div className="grid grid-cols-2 gap-6">
      <Demo title="Line spacing — consecutive baselines">
        <div className="space-y-3">
          {LINE_SAMPLES.map(sample => (
            <div key={sample.label}>
              <div className="mb-1 font-mono text-xs text-gray-500">{sample.label}</div>
              <div className={`${sample.className} border-l-2 border-blue-400 bg-blue-50 px-2`}>
                First baseline: ingress stayed available.<br />
                Second baseline: latency held steady.<br />
                Third baseline: the budget remained intact.
              </div>
            </div>
          ))}
        </div>
      </Demo>

      <Demo title="Paragraph spacing — natural document flow">
        <div className="mb-3 grid grid-cols-2 gap-1 font-mono text-xs text-gray-500">
          <span>h2 space 6 / 4mm</span><span>h3 space 5 / 4mm</span>
          <span>h4 space 3 / 2mm</span><span>p space 0 / 4mm</span>
        </div>
        <div className="border border-gray-200 bg-gray-50 px-4 py-2">
          <h2 className="bg-blue-50">Availability and error budget</h2>
          <p className="bg-white">The first paragraph establishes the measure and shows the gap after the heading.</p>
          <p className="bg-white">A consecutive paragraph exposes the standard paragraph-to-paragraph rhythm.</p>
          <h3 className="bg-blue-50">Latency at the edge</h3>
          <p className="bg-white">Adjacent block margins collapse to the larger value instead of being added together.</p>
          <h4 className="bg-blue-50">Regional detail</h4>
          <p className="bg-white">The grey bands between tinted blocks make each before and after space visible.</p>
        </div>
      </Demo>
    </div>
  );
}

// ── Page 4 — text surfaces ─────────────────────────────────────────

function TextSurfaces() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-5">
        <div className="space-y-4">
          <Demo title="ul / ol">
            <ul>
              <li>Unordered items take the ul rule in styles.css.</li>
              <li>Markers and indent come from that rule, not from preflight.</li>
            </ul>
            <ol>
              <li>Ordered items are numbered by a Tailwind base plugin</li>
              <li>declared in tailwind.config.js, not by styles.css.</li>
            </ol>
          </Demo>

          <Demo title="blockquote">
            <blockquote>Bare text in a blockquote takes the blockquote size, 10pt.</blockquote>
            <blockquote>
              <p>A nested paragraph takes it too — markdown produces one, so the two must match.</p>
            </blockquote>
            <blockquote className="info">
              <p>blockquote.info recolours the same box for advisory asides.</p>
            </blockquote>
          </Demo>

          <Demo title="inline code">
            <p>
              Run <code>facet pdf Report.tsx</code> to render, or <code>facet html</code> for a preview.
            </p>
          </Demo>

          <Demo title="font-sans vs font-mono">
            <p className="font-sans">The quick brown fox — 0123456789 Il1 O0</p>
            <p className="font-mono">The quick brown fox — 0123456789 Il1 O0</p>
          </Demo>
        </div>

        <div className="space-y-4">
          {/* The two must render identically: .prose carries paged spacing,
              not a second type scale. */}
          <Demo title=".prose vs bare markup">
            <div className="prose"><p>{PROSE_PROBE}</p></div>
            <div><p>{PROSE_PROBE}</p></div>
          </Demo>

          {/* Same 9pt Fira Code as the inline <code> above it. */}
          <Demo title="SyntaxHighlighter">
            <SyntaxHighlighter code={SNIPPET} language="yaml" />
          </Demo>

          {/* Two of the four table sizes are enough to show that the rule
              changes padding as well as size; page 6 walks the full set. */}
          <Demo title="table — bare markup">
            <div className="grid grid-cols-2 gap-[3mm]">
              <SurfaceTable label="no class — 9pt" />
              <SurfaceTable label="table.text-xs" className="text-xs" />
            </div>
          </Demo>
        </div>
      </div>
    </div>
  );
}

// ── Page 5 — the scale as a document ───────────────────────────────

/**
 * This page is full. Adding a CalloutBox alongside the blockquote below spilled
 * the closing heading and list onto another sheet — even shortened to a single
 * line, because Page clips rather than reflows. Callouts in running prose are
 * shown on the callouts page instead; do not add one here without re-rendering
 * and checking the page count.
 */
function WorkedDocument() {
  return (
    <div>
      <h1>{REPORT.title}</h1>
      <p className="text-lg">{REPORT.lede}</p>

      <div className="grid grid-cols-3 gap-[3mm] my-3">
        <StatCard variant="bordered" value="99.94%" label="Availability" icon={IoCloudDone} color="green" size="sm" />
        <StatCard variant="bordered" value="142 ms" label="p99 latency" icon={IoPulse} color="blue" size="sm" />
        <StatCard variant="bordered" value="2" label="Budget-consuming incidents" icon={IoShieldCheckmark} color="red" size="sm" />
      </div>

      <h2>Availability and error budget</h2>
      <p>{REPORT.availability}</p>
      <ul>
        {REPORT.budget.map(item => <li key={item}>{item}</li>)}
      </ul>

      <h3>Latency at the edge</h3>
      <p>{REPORT.latency}</p>
      <blockquote className="info">
        <p>{REPORT.quote}</p>
      </blockquote>


      <h3>p99 by region</h3>
      <CompactTable
        variant="reference"
        columns={['Region', 'p99', 'Availability']}
        data={REPORT.regions}
        size="sm"
      />

      <h4>Next quarter</h4>
      <ol>
        {REPORT.next.map(item => <li key={item}>{item}</li>)}
      </ol>
    </div>
  );
}

// ── Page 6 — component size variants ───────────────────────────────

function ComponentSizes() {
  return (
    <div className="space-y-1">
      <Demo title="CompactTable — size maps onto the table.text-* rules from page 4">
        <div className="grid grid-cols-4 gap-3">
          {TABLE_SIZES.map(size => (
            /* min-w-0: a grid item defaults to min-width:auto and cannot shrink
               below its content, so at md the table ran off the page edge. */
            <div key={size} className="min-w-0">
              <h4 className="text-xs font-semibold text-gray-500 mb-1">size=&quot;{size}&quot;</h4>
              <CompactTable
                variant="reference"
                columns={['Check', 'Status']}
                data={SIZE_ROWS}
                size={size}
              />
            </div>
          ))}
        </div>
      </Demo>

      <Demo title="SpecificationTable">
        <div className="grid grid-cols-4 gap-3">
          {TABLE_SIZES.map(size => (
            /* min-w-0: a grid item defaults to min-width:auto and cannot shrink
               below its content, so at md the table ran off the page edge. */
            <div key={size} className="min-w-0">
              <h4 className="text-xs font-semibold text-gray-500 mb-1">size=&quot;{size}&quot;</h4>
              <SpecificationTable specifications={SIZE_SPECS} size={size} />
            </div>
          ))}
        </div>
      </Demo>


    </div>
  );
}

// ── Page 7 — callouts and admonitions ──────────────────────────────

function Callouts() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        One tone set, two entry points. <code>CalloutBox</code> is the TSX and MDX route,
        <code>&gt; [!TYPE]</code> the markdown one — and both land on the <code>blockquote</code>
        rules from page 4, so they produce the same box.
      </p>

      <div className="grid grid-cols-2 gap-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">The five tones</h3>
          {/* variant is a literal union member off CALLOUT_TONES, never an
              interpolated string — the class maps inside CalloutBox are what
              Tailwind scans, and this only picks between them. */}
          {CALLOUT_TONES.map(tone => (
            <CalloutBox key={tone.variant} variant={tone.variant}>
              {tone.use}
            </CalloutBox>
          ))}
        </div>

        <div className="space-y-4">
          <Demo title="Markdown equivalent">
            {/* The syntax as authored, not as rendered: the boxes on the left
                are what these produce. */}
            <SyntaxHighlighter
              code={CALLOUT_TONES.map(t => `${t.md}\n> ${t.use}`).join('\n\n')}
              language="markdown"
            />
          </Demo>

          <Demo title="default — the untinted aside">
            <CalloutBox variant="default">{CALLOUT_SAMPLE}</CalloutBox>
          </Demo>
        </div>
      </div>

      {/* The caveat rides in the heading rather than in a paragraph under the
          snippet: the page is full, and a trailing <p> here spilled a sheet. */}
      <Demo title="Header row — identifier, label and attribution (MDX only: > [!TYPE] has no slot for either)">
        <div className="grid grid-cols-2 gap-5">
          <CalloutBox
            variant="caution"
            badge={CALLOUT_ANNOTATION.badge}
            label={CALLOUT_ANNOTATION.label}
            source={CALLOUT_ANNOTATION.source}
          >
            {CALLOUT_ANNOTATION.body}
          </CalloutBox>

          {/* emphasis replaces the left rule rather than adding to it. */}
          <CalloutBox
            variant="caution"
            emphasis
            badge={CALLOUT_EMPHASIS.badge}
            label={CALLOUT_EMPHASIS.label}
            source={CALLOUT_EMPHASIS.source}
          >
            {CALLOUT_EMPHASIS.body}
          </CalloutBox>
        </div>

        {/* The tone list above pairs with `> [!TYPE]`; this one cannot, so the
            source shown is MDX rather than markdown. */}
        <div className="mt-3">
          <SyntaxHighlighter code={CALLOUT_HEADER_SOURCE} language="mdx" />
        </div>
      </Demo>
    </div>
  );
}

export default function TypographyTest() {
  return (
    <Document title="Typography Reference" css="" margins={{left: 5, right: 5, top: 10, bottom: 10}}>
      <FlanksourceHeader variant="solid" title="Typography Reference" subtitle="The print type scale, measured" />
      <FlanksourceFooter variant="compact" />

      <Page title="Element scale" product="h1–h4, p, body" margins={{ top: 5, bottom: 5 }}>
        <ElementScale />
      </Page>

      <Page title="Utility scale" product="text-xs — text-2xl" margins={{ top: 5, bottom: 5 }}>
        <UtilityScale />
      </Page>

      <Page title="Line and paragraph spacing" product="leading, block rhythm" margins={{ top: 5, bottom: 5 }}>
        <TypographySpacing />
      </Page>

      <Page title="Text surfaces" product="lists, quotes, code, tables" margins={{ top: 5, bottom: 5 }}>
        <TextSurfaces />
      </Page>

      {/* No page title: Page renders it as an 18pt h2, which would sit above
          this page's own h1 and defeat the point of showing the scale as a
          document someone actually reads. */}
      <Page margins={{ top: 5, bottom: 5 }}>
        <WorkedDocument />
      </Page>

      <Page title="Component size variants" product="table.text-*" margins={{ top: 5, bottom: 5 }}>
        <ComponentSizes />
      </Page>

      <Page
        title="Callouts and admonitions"
        product="CalloutBox, markdown-alert"
        margins={{ top: 5, bottom: 5 }}
      >
        <Callouts />
      </Page>
    </Document>
  );
}
