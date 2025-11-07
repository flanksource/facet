import type { Meta, StoryObj } from '@storybook/react';
import PdfFooter from '../../components/PdfFooter';

const meta = {
  title: 'Components/PdfFooter',
  component: PdfFooter,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'PDF-specific footer for Puppeteer generation with inline styles. Uses .pageNumber and .totalPages special classes for page numbering.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PdfFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    generatedDate: new Date().toISOString().split('T')[0],
  },
};

export const CustomDate: Story = {
  args: {
    generatedDate: '2025-11-03',
  },
};
