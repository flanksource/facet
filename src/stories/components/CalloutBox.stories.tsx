import type { Meta, StoryObj } from '@storybook/react';
import CalloutBox from '../../components/CalloutBox';

const meta = {
  title: 'Components/CalloutBox',
  component: CalloutBox,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['note', 'tip', 'important', 'warning', 'caution', 'default'],
      description: 'Visual variant of the callout — the same set as GitHub markdown alerts',
    },
    icon: {
      control: 'select',
      options: [undefined, 'note', 'tip', 'important', 'warning', 'caution'],
      description: "Glyph to draw, independent of the tone. Defaults to the variant's own icon",
    },
  },
} satisfies Meta<typeof CalloutBox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'default',
    title: 'Aside',
    children: 'An untinted aside, matching a plain markdown blockquote.',
  },
};

export const Note: Story = {
  args: {
    variant: 'note',
    children: 'Mission Control supports automatic discovery of Kubernetes resources and cloud infrastructure.',
  },
};

export const Tip: Story = {
  args: {
    variant: 'tip',
    children: 'Prefer focused checks when validating a single report template.',
  },
};

export const Important: Story = {
  args: {
    variant: 'important',
    children: 'Store the report source and its referenced assets together.',
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    children: 'High resource usage detected. Consider scaling your infrastructure.',
  },
};

export const Caution: Story = {
  args: {
    variant: 'caution',
    children: 'Never include credentials or other secrets in generated reports.',
  },
};

/** Identifier, tone label and attribution on one row — the annotated-review shape. */
export const WithHeaderRow: Story = {
  args: {
    variant: 'caution',
    badge: 'N14',
    label: 'Correction',
    source: 'Jonno',
    children: 'The two enforcement checks cannot be implemented as written — the token proves neither which factor ran nor which address was challenged.',
  },
};

/** A full border replaces the left rule when a callout blocks rather than informs. */
export const Emphasis: Story = {
  args: {
    variant: 'caution',
    badge: 'N33',
    label: 'Correction — core blocker',
    source: 'Analysis',
    emphasis: true,
    children: 'Freshness has since been defined as a bounded validity window, which is the opposite of what the constraint says.',
  },
};

export const WithTitle: Story = {
  args: {
    variant: 'note',
    title: 'Discovery scope',
    children: 'A block title sits above the body, under the tone row.',
  },
};

/**
 * `label` and `icon` are independent of `variant`, so one tone can carry several
 * meanings — here amber says "unfinished" while the glyph says "decide this".
 */
export const CustomIcon: Story = {
  args: {
    variant: 'warning',
    label: 'TODO',
    icon: 'important',
    badge: 'BCR-08',
    source: 'Policy Owner',
    children: 'Complete and record a representative tenant database restore. Until this is done the 1-hour RPO is unevidenced.',
  },
};
