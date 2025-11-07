import type { Meta, StoryObj } from '@storybook/react';
import SocialProof from '../../components/SocialProof';

const meta = {
  title: 'Components/SocialProof',
  component: SocialProof,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SocialProof>;

export default meta;
type Story = StoryObj<typeof meta>;

// Note: Logo images would need to be added to the project
export const Logos: Story = {
  args: {
    logos: [
      { name: 'Acme Corp', logo: 'https://via.placeholder.com/120x40?text=Acme' },
      { name: 'Globex Inc', logo: 'https://via.placeholder.com/120x40?text=Globex' },
      { name: 'Initech', logo: 'https://via.placeholder.com/120x40?text=Initech' },
      { name: 'Umbrella Corp', logo: 'https://via.placeholder.com/120x40?text=Umbrella' },
      { name: 'Stark Industries', logo: 'https://via.placeholder.com/120x40?text=Stark' },
      { name: 'Wayne Enterprises', logo: 'https://via.placeholder.com/120x40?text=Wayne' },
    ],
  },
};

export const TestimonialWithMetric: Story = {
  args: {
    testimonial: {
      quote: 'We reduced our MTTR from 4 hours to 30 minutes using Mission Control.',
      attribution: 'John Doe, CTO at Acme Corp',
      metric: '87.5% reduction in MTTR',
    },
  },
};

export const TestimonialSimple: Story = {
  args: {
    testimonial: {
      quote: 'Mission Control transformed how we manage our Kubernetes infrastructure.',
      attribution: 'Jane Smith, VP Engineering at Globex Inc',
    },
  },
};

export const MinimalLogos: Story = {
  args: {
    logos: [
      { name: 'Company A', logo: 'https://via.placeholder.com/120x40?text=CompanyA' },
      { name: 'Company B', logo: 'https://via.placeholder.com/120x40?text=CompanyB' },
      { name: 'Company C', logo: 'https://via.placeholder.com/120x40?text=CompanyC' },
    ],
  },
};
