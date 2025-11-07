import type { Meta, StoryObj } from '@storybook/react';
import CallToAction from '../../components/CallToAction';

const meta = {
  title: 'Components/CallToAction',
  component: CallToAction,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    audience: {
      control: 'select',
      options: ['enterprise', 'technical', 'security'],
      description: 'Target audience for default CTAs',
    },
  },
} satisfies Meta<typeof CallToAction>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EnterpriseAudience: Story = {
  args: {
    audience: 'enterprise',
  },
};

export const TechnicalAudience: Story = {
  args: {
    audience: 'technical',
  },
};

export const SecurityAudience: Story = {
  args: {
    audience: 'security',
  },
};

export const CustomCTA: Story = {
  args: {
    primary: {
      label: 'Start Free Trial',
      url: 'https://flanksource.com/trial',
    },
    secondary: [
      {
        label: 'View Documentation',
        url: 'https://docs.flanksource.com',
      },
      {
        label: 'Contact Sales',
        url: 'mailto:sales@flanksource.com',
      },
    ],
  },
};

export const SingleCTA: Story = {
  args: {
    primary: {
      label: 'Get Started Now',
      url: '#',
    },
  },
};
