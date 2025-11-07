import type { Meta, StoryObj } from '@storybook/react';
import Header from '../../components/Header';

const meta = {
  title: 'Components/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'solid', 'minimal'],
      description: 'Visual variant of the header',
    },
  },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'default',
  },
};

export const Solid: Story = {
  args: {
    variant: 'solid',
  },
};

export const Minimal: Story = {
  args: {
    variant: 'minimal',
  },
};
