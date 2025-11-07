import React from 'react';
import logo from '../../../logos/mission-control-logo.svg';
import logoDark from '../../../logos/mission-control-logo-white.svg';

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

  const headerClass = `datasheet-header datasheet-header--${variant}  `;

  return (
    <div className={headerClass}>
      {/* Logo centered with vertical spacing */}
      <div >

        <img src={logo} alt="Mission Control Logo" className=" w-auto p-0 m-0 filter grayscale brightness-[250] contrast-100 mix-blend-screen "

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
