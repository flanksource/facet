import type { Meta, StoryObj } from '@storybook/react';
import Page from '../../components/Page';

const meta = {
  title: 'Components/Page',
  component: Page,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Page>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithTitle: Story = {
  args: {
    title: 'Configuration Database',
    children: (
      <div>
        <p>This is page content. The Page component provides structure and layout for datasheet pages.</p>
        <p>It includes an optional title bar with product name.</p>
      </div>
    ),
  },
};

export const WithTitleAndProduct: Story = {
  args: {
    title: 'Architecture Overview',
    product: 'Mission Control Platform',
    children: (
      <div>
        <h3>System Architecture</h3>
        <p>Mission Control provides a unified platform for infrastructure management.</p>
      </div>
    ),
  },
};

export const NoTitle: Story = {
  args: {
    children: (
      <div>
        <h2>Custom Content</h2>
        <p>Page component without a title bar.</p>
      </div>
    ),
  },
};

export const WithMargins: Story = {
  args: {
    title: 'Technical Overview',
    product: 'Mission Control',
    pageSize: 'a4',
    margins: { top: 10, right: 10, bottom: 10, left: 10 },
    children: (
      <div>
        <h3>Content Area</h3>
        <p>This page demonstrates margins. Headers and footers are now defined at document level using Header/Footer components.</p>
        <ul>
          <li>Margins: 10mm on all sides</li>
        </ul>
      </div>
    ),
  },
};

export const WithWatermark: Story = {
  args: {
    title: 'Draft Document',
    product: 'Mission Control',
    watermark: 'DRAFT',
    margins: { top: 10, right: 10, bottom: 10, left: 10 },
    children: (
      <div>
        <h3>Watermark Example</h3>
        <p>This page shows a diagonal watermark overlay.</p>
      </div>
    ),
  },
};
