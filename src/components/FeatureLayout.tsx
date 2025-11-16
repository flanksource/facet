import React from 'react';
import StatCard from './StatCard';
import BulletList from './BulletList';
import Section from './Section';

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
  // Prepare bullet items with default green checkmark icon
  const bulletItems = bullets.map(bullet => ({
    term: bullet.term,
    description: bullet.description,
    icon: bullet.icon || '✓',
    color: bullet.color || 'green'
  }));

  // Content for the left column (bullets + stats)
  const leftContent = (
    <>
      <BulletList
        variant="icon-left"
        size="sm"
        items={bulletItems}
      />

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
    </>
  );

  return (
    <Section
      variant={direction === 'right-left' ? 'two-column-reverse' : 'two-column'}
      title={title}
      description={description}
      span={span}
      size="md"
      metric={children}
      className={className}
    >
      {leftContent}
    </Section>
  );
}
