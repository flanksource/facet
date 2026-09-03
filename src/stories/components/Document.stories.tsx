import type { Meta, StoryObj } from '@storybook/react';
import Document from '../../components/Document';
import Page from '../../components/Page';

const meta = {
  title: 'Components/Document',
  component: Document,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'The document shell: emits the html/head/body structure, the base typography rule, and the page defaults every Page reads.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Document>;

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
