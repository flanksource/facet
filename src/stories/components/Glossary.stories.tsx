import type { Meta, StoryObj } from '@storybook/react';
import Glossary from '../../components/Glossary';

const sampleTerms = [
  { term: 'IDP', definition: 'Internal Developer Platform - A self-service platform for developers' },
  { term: 'GitOps', definition: 'Operational framework using Git as single source of truth' },
  { term: 'JIT', definition: 'Just-In-Time access - Temporary elevated permissions' },
  { term: 'RBAC', definition: 'Role-Based Access Control - Permission model based on roles' },
];

const meta = {
  title: 'Components/Glossary',
  component: Glossary,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Glossary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TermGlossary: Story = {
  args: {
    type: 'terms',
    terms: sampleTerms,
  },
};

export const RatingScale: Story = {
  args: {
    type: 'rating',
    ratingScale: [
      { stars: 5, meaning: 'Excellent - Exceeds expectations' },
      { stars: 4, meaning: 'Good - Meets expectations' },
      { stars: 3, meaning: 'Satisfactory - Acceptable' },
      { stars: 2, meaning: 'Needs Improvement' },
      { stars: 1, meaning: 'Poor - Requires attention' },
    ],
  },
};

export const Legend: Story = {
  args: {
    type: 'legend',
    legend: [
      { example: '✓', description: 'Feature is fully supported' },
      { example: '~', description: 'Feature is partially supported' },
      { example: '✗', description: 'Feature is not supported' },
      { example: 'Beta', description: 'Feature is in beta' },
    ],
  },
};
