import type { ReactNode } from 'react';
import BoxNode, { type BoxNodeProps } from './BoxNode';
import ContainerNode, { type ContainerNodeProps } from './ContainerNode';
import { brandScheme, type BrandDefinition } from './brand';

export interface BrandMarkProps {
  brand: BrandDefinition;
  mark?: string;
  dark?: boolean;
  size?: number;
}

interface BrandProps {
  brand: BrandDefinition;
  scheme?: string;
  mark?: string | false;
  title?: ReactNode;
}

export type BrandBoxProps = BrandProps & Omit<BoxNodeProps, 'palette' | 'fonts' | 'icon' | 'title' | 'headerColor' | 'bodyColor' | 'borderColor'>;
export type BrandContainerProps = BrandProps & Omit<ContainerNodeProps, 'palette' | 'fonts' | 'icon' | 'title'>;

export function BrandMark({ brand, mark = 'symbol', dark = false, size = 24 }: BrandMarkProps): ReactNode {
  const artwork = brand.marks[mark];
  if (!Object.prototype.hasOwnProperty.call(brand.marks, mark)) throw new Error(`Brand ${brand.id}: missing mark ${mark}`);
  if (!Number.isFinite(size) || size <= 0) throw new Error('BrandMark size must be positive');
  const cut = artwork.small && size < artwork.small.below ? artwork.small : artwork;
  return <img src={dark ? cut.dark : cut.light} alt={`${brand.name} ${mark}`} width={size} height={size}
    style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }} />;
}

export function BrandBox({ brand, scheme, mark = 'symbol', title, variant = 'outlined', ...props }: BrandBoxProps) {
  return <BoxNode {...props} variant={variant} title={title ?? brand.name} palette={brandScheme(brand, scheme)} fonts={brand.fonts}
    icon={mark === false ? undefined : <BrandMark brand={brand} mark={mark} dark={variant === 'header' || variant === 'chip-dark'} />} />;
}

export function BrandContainer({ brand, scheme, mark = 'symbol', title, variant = 'zone', ...props }: BrandContainerProps) {
  return <ContainerNode {...props} variant={variant} title={title ?? brand.name} palette={brandScheme(brand, scheme)} fonts={brand.fonts}
    icon={mark === false ? undefined : <BrandMark brand={brand} mark={mark} dark={variant === 'header'} />} />;
}
