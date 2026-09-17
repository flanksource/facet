import { describe, expect, it } from 'vitest';
import { PDFArray, PDFDict, PDFDocument, PDFName } from 'pdf-lib';
import {
  assembleGroups,
  buildPageGroups,
  pageSizesForType,
  resolveElementPageSize,
  type PageTypeInfo,
} from './pdf-multipass.js';
import { Logger } from './logger.js';

describe('assembleGroups', () => {
  it('preserves a named section destination across PDF groups', async () => {
    const cover = await PDFDocument.create();
    const contents = cover.addPage([595, 842]);
    contents.node.set(PDFName.of('Annots'), cover.context.obj([{
      Type: PDFName.of('Annot'),
      Subtype: PDFName.of('Link'),
      Rect: [20, 20, 80, 40],
      A: { S: PDFName.of('GoTo'), D: PDFName.of('section-1-2') },
    }]));
    const body = await PDFDocument.create();
    const section = body.addPage([595, 842]);
    body.catalog.set(PDFName.of('Dests'), body.context.obj({
      'section-1-2': [section.ref, PDFName.of('Fit')],
    }));

    const { buffer } = await assembleGroups([
      { group: { type: 'first', size: 'a4', elementIndices: [0] }, buffer: Buffer.from(await cover.save()), pageCount: 1 },
      { group: { type: 'default', size: 'a4', elementIndices: [1] }, buffer: Buffer.from(await body.save()), pageCount: 1 },
    ], new Logger());

    const merged = await PDFDocument.load(buffer);
    const destinations = merged.catalog.lookup(PDFName.of('Dests'));
    expect(destinations).toBeInstanceOf(PDFDict);
    const destination = (destinations as PDFDict).lookup(PDFName.of('section-1-2'));
    expect(destination).toBeInstanceOf(PDFArray);
    expect((destination as PDFArray).get(0).toString()).toBe(merged.getPage(1).ref.toString());
    const annotations = merged.getPage(0).node.lookup(PDFName.of('Annots'));
    expect(annotations).toBeInstanceOf(PDFArray);
    const annotation = merged.context.lookup((annotations as PDFArray).get(0)) as PDFDict;
    const action = annotation.lookup(PDFName.of('A')) as PDFDict;
    expect(action.lookup(PDFName.of('D'))?.toString()).toBe('/section-1-2');
  });
});

describe('resolveElementPageSize', () => {
  it('keeps an explicit Page size instead of replacing it with the document default', () => {
    expect(resolveElementPageSize('a3-landscape', 'a4')).toBe('a3-landscape');
  });

  it('uses the document default only when Page does not declare a size', () => {
    expect(resolveElementPageSize(null, 'letter')).toBe('letter');
  });
});

describe('pageSizesForType', () => {
  it('returns only type/size combinations that occur', () => {
    const types = ['first', 'default', 'default', 'last'] as const;
    const sizes = ['a4', 'a4-landscape', 'letter', 'legal'];
    expect(pageSizesForType([...types], sizes, 'first')).toEqual(['a4']);
    expect(pageSizesForType([...types], sizes, 'default')).toEqual(['a4-landscape', 'letter']);
    expect(pageSizesForType([...types], sizes, 'last')).toEqual(['legal']);
  });

  it('deduplicates repeated combinations', () => {
    expect(pageSizesForType(['default', 'default'], ['a4', 'a4'], 'default')).toEqual(['a4']);
  });
});

describe('buildPageGroups', () => {
  it('starts a new group when adjacent pages use different horizontal margins', () => {
    const typeInfo: PageTypeInfo = {
      types: ['default', 'default', 'default'],
      pageSizes: ['a4', 'a4', 'a4'],
      pageMargins: [
        { top: 5, right: 7, bottom: 5, left: 7 },
        { top: 5, right: 3, bottom: 5, left: 3 },
        { top: 5, right: 7, bottom: 5, left: 7 },
      ],
      definitions: new Map(),
    };

    expect(buildPageGroups(typeInfo)).toEqual([
      { type: 'default', size: 'a4', elementIndices: [0] },
      { type: 'default', size: 'a4', elementIndices: [1] },
      { type: 'default', size: 'a4', elementIndices: [2] },
    ]);
  });
});
