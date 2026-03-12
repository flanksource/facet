import React from 'react';
import { Header } from '@flanksource/facet';
import type { PageType } from '@flanksource/facet';
import { MissionControlLogo } from '@flanksource/icons/mi';

interface FlanksourceHeaderProps {
  variant?: 'default' | 'solid' | 'minimal';
  title?: string;
  subtitle?: string;
  type?: PageType;
  height?: number;
}

export default function FlanksourceHeader({
  variant = 'default',
  title = 'Technical Datasheet',
  subtitle = 'Mission Control Platform',
  type = 'default',
  height = 24,
}: FlanksourceHeaderProps) {
  return (
    <Header
      variant={variant}
      type={type}
      height={height}
      title={title}
      subtitle={subtitle}
      logo={
        <MissionControlLogo
          height="15mm"
          className="filter grayscale brightness-[250] contrast-100 mix-blend-screen h-full w-full"
        />
      }
    />
  );
}
