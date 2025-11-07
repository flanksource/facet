import type { Meta, StoryObj } from '@storybook/react';
import PageBreak from '../../components/PageBreak';

const meta = {
  title: 'Components/PageBreak',
  component: PageBreak,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PageBreak>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div>
      <div className="p-4 bg-blue-50 mb-4">
        <h2>Page 1 Content</h2>
        <p>This content appears on the first page</p>
      </div>
      <PageBreak />
      <div className="p-4 bg-green-50 mt-4">
        <h2>Page 2 Content</h2>
        <p>This content appears on a new page when printed or exported to PDF</p>
      </div>
    </div>
  ),
};
