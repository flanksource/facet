import React from 'react';
import StatCard from './StatCard';

interface Stat {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

interface BulletPoint {
  term: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color?: string;
}

interface FeatureLayoutProps {
  title: string;
  description: string;
  bullets: BulletPoint[];
  span: number;
  stats: Stat[];
  children: React.ReactNode;
  direction?: 'left-right' | 'right-left';
  className?: string;
}

/**
 * FeatureLayout Component
 *
 * Displays a feature comparison with title, description, bullets with icons/checkmarks,
 * stats with outlined icons, and a content area (e.g., AI response example).
 *
 * Layout: Two-column grid with flexible direction (left-right or right-left)
 * Left content: Title, description, bullets with custom icons/colors, stats with icons
 * Right content: Children (typically QueryResponseExample or similar)
 *
 * Bullet Points:
 * - Default: Green checkmark (✓)
 * - Custom icon: Pass icon component and optional color
 * - Icon size: 12pt, aligned left
 *
 * Usage:
 * <FeatureLayout
 *   title="Why Mission Control MCP Outperforms..."
 *   description="Mission Control provides..."
 *   bullets={[
 *     { term: "No cluster access", description: "..." },
 *     { term: "Custom icon", description: "...", icon: IconTime, color: "#3b82f6" }
 *   ]}
 *   stats={[
 *     { value: "50x", label: "Token Reduction", icon: IconDecrease },
 *     { value: "10x", label: "Faster", icon: IconSpeed }
 *   ]}
 *   direction="left-right"
 * >
 *   <QueryResponseExample ... />
 * </FeatureLayout>
 */
export default function FeatureLayout({
  title,
  description,
  bullets,
  stats,
  children,
  direction = 'left-right',
  span = 6,

  className
}: FeatureLayoutProps) {
  const isRightLeft = direction === 'right-left';


  const leftContent = (
    <div className="flex flex-col gap-[4mm]">
      {title &&
        <h3 className="text-[14pt] leading-[18pt] font-semibold text-[#131f3b] m-0 mb-[2mm]">{title}</h3>
      }
      {description &&
        <p className="text-[10pt] leading-[14pt] text-[#374151] m-0 mb-[3mm]">{description}</p>
      }

      <ul className="my-[2mm] mx-[0] px-[0] list-none space-y-[2mm]">
        {bullets.map((bullet, index) => {
          const iconColor = bullet.color || '#10b981';
          const IconComponent = bullet.icon;

          return (
            <li key={index} className="relative pl-[5mm] text-[10pt] leading-[12pt] text-[#374151]">
              {IconComponent ? (
                <span className="absolute left-0 top-[-1pt]" style={{ color: iconColor }}>
                  <IconComponent style={{ width: '12pt', height: '12pt', display: 'inline-block' }} />
                </span>
              ) : (
                <span className="absolute left-0 top-[-1pt] text-[#10b981] font-bold text-[11pt]">✓</span>
              )}
              <strong className="text-[#131f3b]">{bullet.term}</strong>
              {bullet.description && <>
                <br />
                <span className='font-light'>{bullet.description}</span>
              </>}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-row flex-wrap gap-[3mm] mt-[3mm]">
        {stats.map((stat, index) => (
          <div key={index} className="flex-[0_0_calc(50%-1.5mm)]">
            <StatCard
              value={stat.value}
              label={stat.label}
              icon={stat.icon}
              iconColor="#9ca3af"
              variant="left-aligned"
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <section className={`grid grid-cols-12 gap-[6mm] my-[4mm] items-start ${className || ''}`}>
      {isRightLeft ? (
        <>
          <div className="col-span-6 min-w-0 order-1">{children}</div>
          <div className="col-span-6 order-2">{leftContent}</div>
        </>
      ) : (
        <>
          <div className={`col-span-${12 - span}`}>{leftContent}</div>
          <div className={`col-span-${span}`} min-w-0>{children}</div>
        </>
      )}
    </section>
  );
}
