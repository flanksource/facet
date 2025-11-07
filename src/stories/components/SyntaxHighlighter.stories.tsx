import type { Meta, StoryObj } from '@storybook/react';
import SyntaxHighlighter from '../../components/SyntaxHighlighter';

const meta = {
  title: 'Components/SyntaxHighlighter',
  component: SyntaxHighlighter,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    language: {
      control: 'select',
      options: ['yaml', 'typescript', 'javascript', 'bash', 'json', 'markdown'],
      description: 'Programming language for syntax highlighting',
    },
    showLineNumbers: {
      control: 'boolean',
      description: 'Display line numbers',
    },
  },
} satisfies Meta<typeof SyntaxHighlighter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const YamlDefault: Story = {
  args: {
    code: `apiVersion: v1
kind: ConfigMap
metadata:
  name: my-config
data:
  database: postgresql
  replicas: "3"`,
    language: 'yaml',
    title: 'Kubernetes ConfigMap',
  },
};

export const TypeScript: Story = {
  args: {
    code: `interface User {
  id: number;
  name: string;
  email: string;
}

function getUser(id: number): User {
  return { id, name: 'John', email: 'john@example.com' };
}`,
    language: 'typescript',
    title: 'TypeScript Example',
    showLineNumbers: true,
  },
};

export const BashScript: Story = {
  args: {
    code: `#!/bin/bash
task build:datasheet:billing
npm run storybook`,
    language: 'bash',
    title: 'Build Commands',
  },
};

export const JsonConfig: Story = {
  args: {
    code: `{
  "name": "mission-control",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0"
  }
}`,
    language: 'json',
    showLineNumbers: true,
  },
};
