import { describe, expect, it } from 'vitest';

import { layoutErrors, type ArrowMeasure, type BoxMeasure, type LabelMeasure, type LayoutMeasure, type Rect } from './layoutCheck';

const PX_PER_MM = 96 / 25.4;

function rect(left: number, top: number, width: number, height: number): Rect {
  return { left, top, right: left + width, bottom: top + height };
}

function label(name: string, box: Rect, lines: Rect[] = [box], arrowGroup?: number): LabelMeasure {
  return { name, box, lines, ...(arrowGroup === undefined ? {} : { arrowGroup }) };
}

const actionBox = rect(100, 100, 80, 12);
const detailBox = rect(100, 120, 80, 12);

const CLEAN: LayoutMeasure = { bounds: rect(0, 0, 400, 300), labels: [], arrows: [], texts: [], boxes: [] };
const ZONE_FILL = 'rgb(239, 246, 255)';
const ZONE_BORDER = 'rgb(147, 197, 253)';

function box(name: string, fill: string, parent?: number, border = ZONE_BORDER, borderStyle = 'solid'): BoxMeasure {
  return { name, fill, border, borderStyle, ...(parent === undefined ? {} : { parent }) };
}
describe('layoutErrors', () => {
  it('reports nothing for labels that fit their boxes, stay apart and sit clear of arrows', () => {
    expect(layoutErrors({
      ...CLEAN,
      labels: [label('step "a" action', actionBox, [rect(110, 100, 60, 12)]), label('step "a" detail', detailBox)],
      arrows: [{ name: 'a -> b', group: 0, points: [{ x: 90, y: 106 }, { x: 200, y: 106 }] }],
    })).toEqual([]);
  });

  it.each([
    ['right by 10mm', rect(100, 100, 80 + 10 * PX_PER_MM, 12), ['label step "a" action overflows its box by 10mm']],
    ['left by 2.5mm', rect(100 - 2.5 * PX_PER_MM, 100, 80, 12), ['label step "a" action overflows its box by 2.5mm']],
    ['right by exactly the 0.5px tolerance', rect(100, 100, 80.5, 12), []],
    ['right by just over the 0.5px tolerance', rect(100, 100, 80.6, 12), ['label step "a" action overflows its box by 0.2mm']],
  ])('checks a line that overflows %s', (_name, line, expected) => {
    expect(layoutErrors({ ...CLEAN, labels: [label('step "a" action', actionBox, [rect(100, 100, 40, 12), line])], arrows: [] })).toEqual(expected);
  });

  it.each([
    ['overlap by more than 0.5px on both axes', rect(179, 111, 40, 12), ['labels step "a" action and step "b" action overlap']],
    ['touch horizontally within the 0.5px tolerance', rect(179.5, 100, 40, 12), []],
    ['touch vertically within the 0.5px tolerance', rect(150, 111.5, 40, 12), []],
    ['overlap horizontally but sit on separate rows', rect(150, 130, 40, 12), []],
  ])('checks two labels whose lines %s', (_name, otherLine, expected) => {
    const other = rect(otherLine.left, otherLine.top, 60, 12);
    expect(layoutErrors({ ...CLEAN, labels: [label('step "a" action', actionBox), label('step "b" action', other, [otherLine])], arrows: [] })).toEqual(expected);
  });

  const crossing: ArrowMeasure = { name: 'b -> c', group: 1, points: [{ x: 140, y: 80 }, { x: 140, y: 106 }, { x: 140, y: 126 }, { x: 140, y: 160 }] };

  it('reports each arrow and crossed label pair once', () => {
    expect(layoutErrors({ ...CLEAN, labels: [label('step "a" action', actionBox), label('step "a" detail', detailBox)], arrows: [crossing] })).toEqual([
      'arrow b -> c crosses label step "a" action',
      'arrow b -> c crosses label step "a" detail',
    ]);
  });

  it.each([
    ['on the 1px inset boundary', { x: 101, y: 106 }, []],
    ['just inside the 1px inset', { x: 101.5, y: 106 }, ['arrow b -> c crosses label step "a" action']],
  ])('checks an arrow point %s of a label line', (_name, point, expected) => {
    expect(layoutErrors({ ...CLEAN, labels: [label('step "a" action', actionBox)], arrows: [{ name: 'b -> c', group: 1, points: [point, { x: point.x, y: 160 }] }] })).toEqual(expected);
  });

  it('ignores an arrow crossing the label pill that belongs to its own container', () => {
    const pill = label('edge "b" -> "c" label', rect(120, 110, 40, 10), undefined, 1);
    expect(layoutErrors({ ...CLEAN, labels: [pill], arrows: [{ ...crossing, points: [{ x: 140, y: 115 }, { x: 140, y: 160 }] }] })).toEqual([]);
  });

  it('reports an arrow crossing another edge label pill', () => {
    const pill = label('edge "a" -> "b" label', rect(120, 110, 40, 10), undefined, 0);
    expect(layoutErrors({ ...CLEAN, labels: [pill], arrows: [{ ...crossing, points: [{ x: 140, y: 115 }, { x: 140, y: 160 }] }] })).toEqual(['arrow b -> c crosses label edge "a" -> "b" label']);
  });

  it.each([
    ['shorter than the 12px minimum', 10, ['arrow a -> b is a stub, 2.6mm long; leave at least 3.2mm between connected nodes']],
    ['exactly the 12px minimum', 12, []],
  ])('checks an arrow %s', (_name, length, expected) => {
    const points = [{ x: 100, y: 50 }, { x: 100 + length / 2, y: 50 }, { x: 100 + length, y: 50 }];
    expect(layoutErrors({ ...CLEAN, arrows: [{ name: 'a -> b', group: 0, points }] })).toEqual(expected);
  });

  it.each([
    ['ends in the page corner', { x: -40, y: -60 }, ['arrow a -> b ends outside the diagram at (-40, -60); check that both endpoint ids exist']],
    ['ends past the right edge by more than 1px', { x: 402, y: 150 }, ['arrow a -> b ends outside the diagram at (402, 150); check that both endpoint ids exist']],
    ['ends on the edge within 1px', { x: 401, y: 150 }, []],
  ])('checks an arrow that %s', (_name, end, expected) => {
    expect(layoutErrors({ ...CLEAN, arrows: [{ name: 'a -> b', group: 0, points: [{ x: 200, y: 150 }, end] }] })).toEqual(expected);
  });

  it.each([
    ['7.5px', 7.5, ['text "Run history" is 7.5px; diagram text must be at least 8px']],
    ['exactly 8px', 8, []],
  ])('checks text set at %s', (_name, fontPx, expected) => {
    expect(layoutErrors({ ...CLEAN, texts: [{ name: 'Run history', fontPx }] })).toEqual(expected);
  });

  it.each([
    ['repeats its container fill, border colour and style', [box('Control plane', ZONE_FILL), box('Run API', ZONE_FILL, 0)], ['box "Run API" repeats the fill and border of its container "Control plane"; list it as a borderless row or give it its own fill']],
    ['is a white card on the tinted container', [box('Control plane', ZONE_FILL), box('Run API', 'rgb(255, 255, 255)', 0)], []],
    ['shares the fill but has a different border colour', [box('Control plane', ZONE_FILL), box('Run API', ZONE_FILL, 0, 'rgb(16, 185, 129)')], []],
    ['shares fill and colour but is dashed inside a solid container', [box('Sandbox pool', ZONE_FILL), box('run 1', ZONE_FILL, 0, ZONE_BORDER, 'dashed')], []],
    ['has no bordered container', [box('Run API', ZONE_FILL)], []],
  ])('checks a bordered box that %s', (_name, boxes, expected) => {
    expect(layoutErrors({ ...CLEAN, boxes })).toEqual(expected);
  });
});
