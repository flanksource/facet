import React from 'react';
import { MissionControlLogo } from '@flanksource/icons/mi'

interface HeaderProps {
  variant?: 'default' | 'solid' | 'minimal';
  title?: string;
  subtitle?: string;
}

/**
 * Header Component
 *
 * Renders the datasheet header with configurable styling variants.
 * Automatically loads and switches between light and dark logos based on variant.
 *
 * Variants:
 * - 'default': Border-bottom style with white background (light logo)
 * - 'solid': Solid brand blue background with white text (dark/white logo)
 * - 'minimal': Logo only, no metadata or background (light logo)
 *
 * Usage:
 * <Header variant="default" />
 * <Header variant="solid" />
 * <Header variant="minimal" />
 */
export default function Header({
  variant = 'default',
  title = 'Technical Datasheet',
  subtitle = 'Mission Control Platform'
}: HeaderProps) {

  const headerClass = `datasheet-header datasheet-header--${variant}
  `;

  return (
    <div className={headerClass}>
      {/* Logo centered with vertical spacing */}
      <div className=' h-[15mm] w-[70mm]'>
        <MissionControlLogo height="15mm"
          className="filter grayscale brightness-[250] contrast-100 mix-blend-screen h-full w-full "
        />
      </div>
      {/* Title and subtitle on the right */}
      <div className='header-meta'>
        <p className='text-md font-bold'>{title}</p>
        <p className='text-sm'>{subtitle}</p>
      </div>
    </div>
  );
}
