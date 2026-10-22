import type { DocxLocation, LintIssue, LintLocation } from './types.js';
import { inspectDOCX } from '../inspection/index.js';
import { inspectPdf } from '../inspection/pdf.js';
import type { AssetInfo, DocxInspection, PdfInspection } from '../inspection/types.js';

export const documentRules = ['docx-section', 'docx-embedded-image', 'pdf-page', 'pdf-embedded-image']
  .map(name => ({ name, severity: 'info' as const }));

function pdfIssues(options: { inspection: PdfInspection; file: string; owners?: DocxLocation[] }): LintIssue[] {
  const { inspection, file, owners } = options;
  const locations = (references: { page: number; object?: string; resource?: string }[]): LintLocation[] => references.flatMap<LintLocation>(reference => {
    const pdf = { type: 'pdf' as const, ...reference };
    return owners ? owners.map(owner => ({ ...owner, pdf })) : [pdf];
  });
  return [
    ...inspection.pageDetails.map(page => ({ file, rule: 'pdf-page', severity: 'info' as const, message: `Page ${page.page}: ${page.widthPt} × ${page.heightPt} pt`,
      locations: locations([{ page: page.page, object: page.object }]), data: { ...page, units: 'pt' } })),
    ...inspection.images.map(image => ({ file, rule: 'pdf-embedded-image', severity: 'info' as const, message: `Embedded image: ${image.width} × ${image.height} px, ${image.bytes} bytes`,
      locations: locations(image.locations), data: { width: image.width, height: image.height, bytes: image.bytes, bitsPerComponent: image.bitsPerComponent, imageMask: image.imageMask } })),
  ];
}

function assetLocations(asset: AssetInfo): DocxLocation[] {
  if (!asset.uses.length) return [{ type: 'docx', part: asset.path, asset: asset.path }];
  return asset.uses.map(use => ({ type: 'docx', part: use.part, elementPath: use.elementPath, relationshipId: use.relationshipId, asset: asset.path, role: use.role }));
}

function docxIssues(inspection: DocxInspection, file: string): LintIssue[] {
  const images = inspection.assets.filter(asset => asset.contentType.startsWith('image/') || asset.pdf);
  return [
    ...inspection.sections.map(section => ({ file, rule: 'docx-section', severity: 'info' as const, message: `Section ${section.index}${section.size ? `: ${section.size.widthMm} × ${section.size.heightMm} mm` : ''}`,
      locations: [{ type: 'docx' as const, part: inspection.part, elementPath: section.elementPath }], data: { index: section.index, units: 'mm', size: section.size, orientation: section.orientation, margins: section.margins } })),
    ...images.flatMap(asset => [
      { file, rule: 'docx-embedded-image', severity: 'info' as const, message: `${asset.path}: ${asset.format}, ${asset.bytes} bytes`, locations: assetLocations(asset),
        data: { path: asset.path, contentType: asset.contentType, format: asset.format, bytes: asset.bytes, payloadBytes: asset.payloadBytes, progIds: asset.progIds, streams: asset.streams, uses: asset.uses, previewFor: asset.previewFor } },
      ...(asset.pdf ? pdfIssues({ inspection: asset.pdf, file, owners: assetLocations(asset) }) : []),
    ]),
  ];
}

export async function lintDocument(options: { data: Uint8Array; file: string; format: 'pdf' | 'docx'; embeddedImages: boolean }): Promise<LintIssue[]> {
  const { data, file, embeddedImages } = options;
  if (options.format === 'pdf') return pdfIssues({ inspection: await inspectPdf({ data, asset: file, embeddedImages, fonts: false }), file });
  return docxIssues(await inspectDOCX({ data, embeddedImages, fonts: false }), file);
}
