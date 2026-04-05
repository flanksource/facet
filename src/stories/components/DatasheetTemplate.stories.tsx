import type { Meta, StoryObj } from '@storybook/react';
import DatasheetTemplate from '../../components/DatasheetTemplate';
import Page from '../../components/Page';

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
    css: '',
    children: (
      <Page title="Overview" margins={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <div>
          <h1>Welcome to Mission Control</h1>
          <p>This is page content</p>
        </div>
      </Page>
    ),
  },
};

export const MultiPage: Story = {
  args: {
    title: 'Multi-Page Datasheet',
    css: '',
    children: (
      <>
        <Page title="Introduction" margins={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <div><h2>Page 1</h2><p>Introduction content</p></div>
        </Page>
        <Page title="Features" margins={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <div><h2>Page 2</h2><p>Features content</p></div>
        </Page>
        <Page margins={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <div><h2>Page 3</h2><p>Specifications content</p></div>
        </Page>
      </>
    ),
  },
};
