import type { Dimensions, DocxInspection } from './types.js';

function table(headers: string[], rows: string[][]): string {
  if (!rows.length) return '(none)';
  const widths = headers.map((header, column) => rows.reduce((width, row) => Math.max(width, row[column].length), header.length));
  const line = (row: string[]): string => row.map((cell, column) => cell.padEnd(widths[column])).join('  ').trimEnd();
  return [line(headers), line(widths.map((width) => '-'.repeat(width))), ...rows.map(line)].join('\n');
}

function dimensions(size: Dimensions | null | undefined): string { return size ? `${size.widthMm} × ${size.heightMm}` : 'unspecified'; }
function value(value: number | null | undefined): string { return value === null || value === undefined ? 'unspecified' : String(value); }
function escaped(text: string): string { return text.replace(/[\x00-\x1f\x7f]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`); }

export function formatInspection(result: DocxInspection): string {
  const output = ['Section settings (mm)', table(['Section', 'Size', 'Orientation', 'Top', 'Right', 'Bottom', 'Left', 'Header', 'Footer', 'Gutter'], result.sections.map((section) => [
    String(section.index), dimensions(section.size), section.orientation ?? 'unspecified', ...['topMm', 'rightMm', 'bottomMm', 'leftMm', 'headerMm', 'footerMm', 'gutterMm'].map((key) => value(section.margins[key as keyof typeof section.margins])),
  ])), '', `Embedded assets (${result.assets.length})`, table(['Part', 'Format', 'Stored bytes', 'Payload bytes', 'PDF pages / sizes (mm)', 'OLE type', 'Preview for'], result.assets.map((asset) => [
    asset.path, asset.format, String(asset.bytes), asset.payloadBytes === undefined ? '—' : String(asset.payloadBytes),
    asset.pdf ? `${asset.pdf.pages.length}: ${[...new Set(asset.pdf.pages.map(dimensions))].join('; ')}` : '—',
    asset.progIds.join(', ') || '—', asset.previewFor.join(', ') || '—',
  ]))];
  for (const asset of result.assets) if (asset.streams) output.push(`${asset.path} streams: ${asset.streams.map(escaped).join(', ')}`);
  const placements = result.assets.flatMap((asset) => asset.uses.map((use) => [asset.path, use.role, use.part, use.relationshipId, use.kind, dimensions(use.dimensions), use.preview ?? '—']));
  output.push('', `Asset references (${placements.length})`, table(['Asset', 'Role', 'Owner part', 'Relationship', 'Kind', 'Display size (mm)', 'Preview'], placements),
    '', `Word font references (${result.fonts.word.length})`, table(['Name', 'Kind', 'Sources', 'Embedded variants'], result.fonts.word.map((font) => [
      font.name, font.kind, font.sources.join(', '), font.embedded.map((embedded) => `${embedded.variant}: ${embedded.part}`).join(', ') || 'none',
    ])), '', `Embedded PDF fonts (${result.fonts.pdf.length})`, table(['Asset', 'Font', 'Type', 'Embedded', 'Subset', 'Pages'], result.fonts.pdf.map((font) => [
      font.asset, font.name, font.type, font.embedded === null ? 'unknown' : font.embedded ? 'yes' : 'no', font.subset ? 'yes' : 'no', font.pages.join(', '),
    ])));
  return output.join('\n') + '\n';
}
