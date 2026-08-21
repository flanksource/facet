import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import CalloutBox, { type CalloutVariant } from './CalloutBox';
import { ALERT_ICON_PATHS, type AlertTone } from './utils/alertIcons';

/**
 * Accent colour per tone, listed independently of the component's own map so a
 * silent recolour fails rather than re-deriving its expectation from the source
 * it is meant to check. These must stay in step with the
 * `blockquote.markdown-alert-*` rules in src/styles.css — that pairing is what
 * makes `> [!NOTE]` and `<CalloutBox variant="note">` the same box.
 */
const TONE_ACCENTS: Record<AlertTone, string> = {
  note: 'border-l-blue-500',
  tip: 'border-l-emerald-500',
  important: 'border-l-purple-500',
  warning: 'border-l-amber-500',
  caution: 'border-l-red-500',
};

const TONES = Object.keys(TONE_ACCENTS) as AlertTone[];

describe('CalloutBox', () => {
  describe('tones', () => {
    it.each(TONES)('renders %s with its own accent and label', tone => {
      const { container } = render(<CalloutBox variant={tone}>Body copy.</CalloutBox>);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain(TONE_ACCENTS[tone]);
      // Capitalised tone name, e.g. `note` -> `Note`.
      expect(screen.getByText(tone[0].toUpperCase() + tone.slice(1))).toBeInTheDocument();
    });

    it('draws the same glyph the markdown plugin injects', () => {
      const { container } = render(<CalloutBox variant="caution">Body copy.</CalloutBox>);

      const path = container.querySelector('svg.octicon path');
      expect(path?.getAttribute('d')).toBe(ALERT_ICON_PATHS.caution);
    });

    it('falls back to the untinted aside for an unknown variant', () => {
      const { container } = render(
        <CalloutBox variant={'nonsense' as CalloutVariant}>Body copy.</CalloutBox>,
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('border-l-zinc-300');
      expect(container.querySelector('svg.octicon')).toBeNull();
    });
  });

  describe('icon', () => {
    it('draws the glyph named by the icon prop while keeping the variant colour', () => {
      const { container } = render(
        <CalloutBox variant="warning" icon="important">Body copy.</CalloutBox>,
      );

      const path = container.querySelector('svg.octicon path');
      expect(path?.getAttribute('d')).toBe(ALERT_ICON_PATHS.important);
      // Tone and glyph are independent: the amber accent survives.
      expect((container.firstChild as HTMLElement).className).toContain('border-l-amber-500');
    });

    it('gives an untinted callout a glyph once one is named', () => {
      const { container } = render(
        <CalloutBox variant="default" icon="note">Body copy.</CalloutBox>,
      );

      const path = container.querySelector('svg.octicon path');
      expect(path?.getAttribute('d')).toBe(ALERT_ICON_PATHS.note);
    });
  });

  describe('header row', () => {
    it('is omitted entirely for an unlabelled default callout', () => {
      const { container } = render(<CalloutBox variant="default">Body copy.</CalloutBox>);

      // No tone name and no chip means nothing to show, so no empty bar above
      // the text.
      expect(container.querySelector('.flex.items-baseline')).toBeNull();
    });

    it('renders badge, label and source together', () => {
      render(
        <CalloutBox variant="caution" badge="N14" label="Correction" source="Jonno">
          Body copy.
        </CalloutBox>,
      );

      expect(screen.getByText('N14')).toBeInTheDocument();
      expect(screen.getByText('Correction')).toBeInTheDocument();
      expect(screen.getByText('Jonno')).toBeInTheDocument();
    });

    it('lets an explicit label override the tone name', () => {
      render(<CalloutBox variant="warning" label="Gap">Body copy.</CalloutBox>);

      expect(screen.getByText('Gap')).toBeInTheDocument();
      expect(screen.queryByText('Warning')).toBeNull();
    });

    it('appears for a default callout once it carries a badge', () => {
      const { container } = render(
        <CalloutBox variant="default" badge="N1">Body copy.</CalloutBox>,
      );

      expect(container.querySelector('.flex.items-baseline')).not.toBeNull();
      expect(screen.getByText('N1')).toBeInTheDocument();
    });
  });

  describe('emphasis', () => {
    it('replaces the left accent with a full border', () => {
      const { container } = render(
        <CalloutBox variant="caution" emphasis>Body copy.</CalloutBox>,
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('border-2');
      expect(wrapper.className).toContain('border-red-500');
      // The two treatments are alternatives, not layers.
      expect(wrapper.className).not.toContain('border-l-[3pt]');
    });
  });

  it('renders a block title above the body when set', () => {
    render(<CalloutBox variant="note" title="Discovery scope">Body copy.</CalloutBox>);

    const title = screen.getByText('Discovery scope');
    expect(title.tagName).toBe('H3');
  });
});
