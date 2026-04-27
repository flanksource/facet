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
  logoClass?: string;
  className?: string;
}

export default function FlanksourceHeader({
  variant = 'default',
  title = 'Technical Datasheet',
  subtitle = 'Mission Control Platform',
  type = 'default',
  height = 24,
  logoClass = 'h-[15mm] w-auto',
  className,
}: FlanksourceHeaderProps) {
  return (
    <Header
      variant={variant}
      className={className}
      type={type}
      height={height}
      title={title}
      subtitle={subtitle}
      logo={
        <MissionControlLogo
          className={`filter grayscale brightness-[250] contrast-100 mix-blend-screen ${logoClass}`}
        />
      }
    />
  );
}
