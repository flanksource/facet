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

export const CustomClassName: Story = {
  args: {
    title: 'Specifications',
    className: 'custom-datasheet-section',
    children: (
      <div>
        <p>Content with custom className applied.</p>
      </div>
    ),
  },
};

export const WithHeaderFooter: Story = {
  args: {
    title: 'Technical Overview',
    product: 'Mission Control',
    pageSize: 'a4',
    margins: { top: 10, right: 10, bottom: 10, left: 10 },
    header: (
      <div style={{ background: '#3578e5', color: 'white', padding: '5mm', textAlign: 'center' }}>
        Custom Header
      </div>
    ),
    headerHeight: 15,
    footer: (
      <div style={{ background: '#f3f4f6', padding: '5mm', textAlign: 'center', fontSize: '8pt' }}>
        Page Footer - Confidential
      </div>
    ),
    footerHeight: 15,
    children: (
      <div>
        <h3>Content Area</h3>
        <p>This page demonstrates custom header and footer with margins.</p>
        <p>The content area has overflow: hidden applied and respects the specified margins.</p>
        <ul>
          <li>Header height: 15mm</li>
          <li>Footer height: 15mm</li>
          <li>Margins: 10mm on all sides</li>
        </ul>
      </div>
    ),
  },
};

export const WithDebugMode: Story = {
  args: {
    title: 'Debug Layout',
    product: 'Mission Control',
    pageSize: 'a4',
    margins: { top: 15, right: 12, bottom: 15, left: 12 },
    header: (
      <div style={{ background: '#3578e5', color: 'white', padding: '5mm', textAlign: 'center' }}>
        Header Area
      </div>
    ),
    headerHeight: 20,
    footer: (
      <div style={{ background: '#f3f4f6', padding: '5mm', textAlign: 'center', fontSize: '8pt' }}>
        Footer Area
      </div>
    ),
    footerHeight: 20,
    debug: true,
    children: (
      <div>
        <h3>Debug Mode Enabled</h3>
        <p>Visual margin markers are displayed to help with layout debugging:</p>
        <ul>
          <li><strong style={{ color: 'red' }}>Red areas</strong>: Margin zones (with semi-transparent fill)</li>
          <li><strong style={{ color: 'blue' }}>Blue lines</strong>: Header and footer boundaries</li>
          <li><strong style={{ color: 'green' }}>Green border</strong>: Content area outline</li>
        </ul>
        <p>Hover over the markers to see their measurements.</p>
        <p>The markers have pointer-events: none so they won't interfere with interactions.</p>
      </div>
    ),
  },
};
