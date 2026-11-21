import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DIAGRAM_ROLES, Marker, ROLE_TONES, Tile, Zone, type DiagramRole } from './RoleNodes';

function dom(element: ReactElement) {
  const root = document.createElement('div');
  root.innerHTML = renderToStaticMarkup(element);
  return root;
}

/** jsdom normalises inline hex colours to rgb(), so expectations are computed the same way. */
function rgb(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}

const Glyph = ({ className }: { className?: string }) => <svg className={className} data-glyph />;

describe('role vocabulary', () => {
  it('lists every role and a tone for each', () => {
    expect([...DIAGRAM_ROLES]).toEqual(['existing', 'new', 'future', 'neutral']);
    expect(Object.keys(ROLE_TONES)).toEqual([...DIAGRAM_ROLES]);
  });
});

describe('Tile', () => {
  it.each(DIAGRAM_ROLES)('renders the %s tone with role and editable markers', (role) => {
    const tone = ROLE_TONES[role];
    const tile = dom(<Tile role={role} title="API" detail="Gateway" data-editable-source="src:1" />).firstElementChild as HTMLElement;
    const [strip, detail] = Array.from(tile.children) as HTMLElement[];
    expect({
      attrs: [tile.dataset.editableBox, tile.dataset.role, tile.dataset.editableSource],
      border: [tile.style.borderColor, tile.style.borderStyle],
      strip: [strip!.style.backgroundColor, strip!.querySelector('[data-editable-text]')?.getAttribute('data-editable-text'), strip!.textContent],
      detail: [detail!.style.color, detail!.dataset.editableText, detail!.textContent],
    }).toEqual({
      attrs: ['role', role, 'src:1'],
      border: [rgb(tone.border), tone.dashed ? 'dashed' : 'solid'],
      strip: [rgb(tone.header), 'title', 'API'],
      detail: [rgb(tone.text), 'detail', 'Gateway'],
    });
  });

  it('marks neither title nor detail when they are nodes', () => {
    const tile = dom(<Tile title={<b>API</b>} detail={<i>Gateway</i>} />);
    expect(tile.querySelectorAll('[data-editable-text]')).toHaveLength(0);
  });

  it('renders marker and icon ahead of the title', () => {
    const tile = dom(<Tile title="API" marker={3} icon={Glyph} />);
    expect(tile.querySelector('[data-glyph]')).not.toBeNull();
    expect(tile.firstElementChild!.firstElementChild!.firstElementChild!.textContent).toBe('3');
  });

  it('throws on an unknown role', () => {
    expect(() => renderToStaticMarkup(<Tile title="API" role={'bogus' as DiagramRole} />)).toThrow(/unknown diagram role "bogus"/i);
  });
});

describe('Zone', () => {
  it.each(DIAGRAM_ROLES)('renders the %s tone with role and label markers', (role) => {
    const tone = ROLE_TONES[role];
    const zone = dom(<Zone role={role} label="Cluster" data-x="1"><i>child</i></Zone>).firstElementChild as HTMLElement;
    const label = zone.firstElementChild as HTMLElement;
    expect({
      attrs: [zone.dataset.editableContainer, zone.dataset.role, zone.dataset.x],
      box: [zone.style.borderColor, zone.style.borderStyle, zone.style.backgroundColor],
      label: [label.style.color, label.querySelector('[data-editable-text]')?.getAttribute('data-editable-text'), label.textContent],
    }).toEqual({
      attrs: ['role', role, '1'],
      box: [rgb(tone.border), tone.dashed ? 'dashed' : 'solid', rgb(tone.body)],
      label: [rgb(tone.header), 'label', 'Cluster'],
    });
  });

  it('honours fill over the role body and skips the label marker for nodes', () => {
    const zone = dom(<Zone label={<b>Cluster</b>} fill="#123456" />).firstElementChild as HTMLElement;
    expect(zone.style.backgroundColor).toBe(rgb('#123456'));
    expect(zone.querySelectorAll('[data-editable-text]')).toHaveLength(0);
  });

  it('throws on an unknown role', () => {
    expect(() => renderToStaticMarkup(<Zone label="x" role={'bogus' as DiagramRole} />)).toThrow(/unknown diagram role "bogus"/i);
  });
});

describe('Marker', () => {
  it('renders the number inside an inline-flex badge', () => {
    const badge = dom(<Marker n={7} />).firstElementChild as HTMLElement;
    expect([badge.textContent, badge.style.display]).toEqual(['7', 'inline-flex']);
  });
});
