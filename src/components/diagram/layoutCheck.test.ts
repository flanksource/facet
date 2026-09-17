import { describe, expect, it } from 'vitest';

import { layoutErrors, type ArrowMeasure, type LabelMeasure, type Rect } from './layoutCheck';

const PX_PER_MM = 96 / 25.4;

function rect(left: number, top: number, width: number, height: number): Rect {
  return { left, top, right: left + width, bottom: top + height };
}

function label(name: string, box: Rect, lines: Rect[] = [box], arrowGroup?: number): LabelMeasure {
  return { name, box, lines, ...(arrowGroup === undefined ? {} : { arrowGroup }) };
}

const actionBox = rect(100, 100, 80, 12);
const detailBox = rect(100, 120, 80, 12);

describe('layoutErrors', () => {
  it('reports nothing for labels that fit their boxes, stay apart and sit clear of arrows', () => {
    expect(layoutErrors({
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
    expect(layoutErrors({ labels: [label('step "a" action', actionBox, [rect(100, 100, 40, 12), line])], arrows: [] })).toEqual(expected);
  });

  it.each([
    ['overlap by more than 0.5px on both axes', rect(179, 111, 40, 12), ['labels step "a" action and step "b" action overlap']],
    ['touch horizontally within the 0.5px tolerance', rect(179.5, 100, 40, 12), []],
    ['touch vertically within the 0.5px tolerance', rect(150, 111.5, 40, 12), []],
    ['overlap horizontally but sit on separate rows', rect(150, 130, 40, 12), []],
  ])('checks two labels whose lines %s', (_name, otherLine, expected) => {
    const other = rect(otherLine.left, otherLine.top, 60, 12);
    expect(layoutErrors({ labels: [label('step "a" action', actionBox), label('step "b" action', other, [otherLine])], arrows: [] })).toEqual(expected);
  });

  const crossing: ArrowMeasure = { name: 'b -> c', group: 1, points: [{ x: 140, y: 80 }, { x: 140, y: 106 }, { x: 140, y: 126 }, { x: 140, y: 160 }] };

  it('reports each arrow and crossed label pair once', () => {
    expect(layoutErrors({ labels: [label('step "a" action', actionBox), label('step "a" detail', detailBox)], arrows: [crossing] })).toEqual([
      'arrow b -> c crosses label step "a" action',
      'arrow b -> c crosses label step "a" detail',
    ]);
  });

  it.each([
    ['on the 1px inset boundary', { x: 101, y: 106 }, []],
    ['just inside the 1px inset', { x: 101.5, y: 106 }, ['arrow b -> c crosses label step "a" action']],
  ])('checks an arrow point %s of a label line', (_name, point, expected) => {
    expect(layoutErrors({ labels: [label('step "a" action', actionBox)], arrows: [{ name: 'b -> c', group: 1, points: [point] }] })).toEqual(expected);
  });

  it('ignores an arrow crossing the label pill that belongs to its own container', () => {
    const pill = label('edge "b" -> "c" label', rect(120, 110, 40, 10), undefined, 1);
    expect(layoutErrors({ labels: [pill], arrows: [{ ...crossing, points: [{ x: 140, y: 115 }] }] })).toEqual([]);
  });

  it('reports an arrow crossing another edge label pill', () => {
    const pill = label('edge "a" -> "b" label', rect(120, 110, 40, 10), undefined, 0);
    expect(layoutErrors({ labels: [pill], arrows: [{ ...crossing, points: [{ x: 140, y: 115 }] }] })).toEqual(['arrow b -> c crosses label edge "a" -> "b" label']);
  });
});
