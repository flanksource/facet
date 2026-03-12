import React from 'react';
import { Footer } from '@flanksource/facet';
import type { PageType } from '@flanksource/facet';

interface FlanksourceFooterProps {
  variant?: 'default' | 'compact' | 'minimal';
  type?: PageType;
  height?: number;
}

export default function FlanksourceFooter({
  variant = 'default',
  type = 'default',
  height = 16,
}: FlanksourceFooterProps) {
  return (
    <Footer
      variant={variant}
      type={type}
      height={height}
      company="Flanksource"
      web="https://flanksource.com"
      docs="https://docs.flanksource.com"
      email="hello@flanksource.com"
      github="https://github.com/flanksource"
      linkedin="https://www.linkedin.com/company/flanksource"
    />
  );
}
