import type { Meta, StoryObj } from '@storybook/react';
import DatasheetTemplate from '../../components/DatasheetTemplate';
import Page from '../../components/Page';
import Header from '../../components/Header';

const meta = {
  title: 'Components/DatasheetTemplate',
  component: DatasheetTemplate,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Template wrapper for multi-page datasheet documents with consistent structure.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof DatasheetTemplate>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SinglePage: Story = {
  args: {
    title: 'Mission Control Datasheet',
    subtitle: 'Infrastructure Management Platform',
    css: '',
    PageComponent: Page,
    pages: [
      {
        content: (
          <div>
            <h1>Welcome to Mission Control</h1>
            <p>This is page content</p>
          </div>
        ),
        title: 'Overview',
        margins: true,
      },
    ],
  },
};

export const MultiPage: Story = {
  args: {
    title: 'Multi-Page Datasheet',
    css: '',
    PageComponent: Page,
    pages: [
      {
        content: <div><h2>Page 1</h2><p>Introduction content</p></div>,
        header: <Header variant="solid" title="Introduction" />,
        margins: true,
      },
      {
        content: <div><h2>Page 2</h2><p>Features content</p></div>,
        header: <Header variant="minimal" title="Features" />,
        margins: true,
      },
      {
        content: <div><h2>Page 3</h2><p>Specifications content</p></div>,
        margins: false,
      },
    ],
  },
};
