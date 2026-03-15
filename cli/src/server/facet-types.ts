export const facetTypes = `declare module '@flanksource/facet' {
  import React from 'react';

  export interface TaskSummary {
      theme: string;
      status: string;
      description: string;
      commits?: {
          count: number;
          additions?: number;
          deletions?: number;
      };
      notes?: string | React.ReactNode;
      achievements?: string[];
  }

  /**
   * Common Types
   * Shared type definitions used across components
   */
  /**
   * User Interface
   * Represents a user with optional avatar and contact info
   */
  export interface User {
      id?: string;
      name: string;
      email?: string;
      avatar?: string;
  }
  /**
   * Status Color Type
   * Standard color palette for status indicators
   */
  export type StatusColor = 'red' | 'green' | 'orange' | 'gray' | 'yellow';
  /**
   * Size Type
   * Standard size variants for components
   */
  export type Size = 'xs' | 'sm' | 'md' | 'lg';

  /**
   * POC Evaluation Data Structure
   * Defines the schema for technical POC evaluation data
   */
  /** Star rating type (1-5 scale) */
  export type StarRating = 1 | 2 | 3 | 4 | 5;
  /** KPI metric types */
  export type KpiType = 'time' | 'percentage' | 'count' | 'custom';
  /**
   * KPI Metric Interface
   * Represents a measurable key performance indicator
   */
  export interface KpiMetric {
      /** Numeric value of the metric */
      value: number | string;
      /** Type of metric (time, percentage, count, custom) */
      type: KpiType;
      /** Unit of measurement (e.g., 'seconds', 'steps', '%') */
      unit?: string;
      /** Display value for the metric (optional, for formatting) */
      displayValue?: string;
  }
  /**
   * KPI with Target and Actual for comparison
   * Used in completed stage to show goal vs result
   */
  export interface KpiComparison {
      /** Metric description */
      metric: string;
      /** Target/goal value (what was planned) */
      target: KpiMetric;
      /** Actual achieved value */
      actual: KpiMetric;
      /** Percentage difference (positive = exceeded, negative = fell short) */
      percentageOfTarget?: number;
  }
  /**
   * Test Variant Interface
   * Represents a single test execution with before/after measurements
   */
  export interface TestVariant {
      /** Description of test scenario */
      step: string;
      /** Name or role of person who performed test */
      tester: string;
      /** KPI measurement before POC */
      beforeKpi: KpiMetric;
      /** KPI measurement after POC */
      afterKpi: KpiMetric;
      /** Calculated percentage improvement */
      improvement: number;
      /** Benefit rating (1-5 stars) */
      rating: StarRating;
      /** Qualitative assessment and comments */
      comments: string;
  }
  /**
   * POC Objective Interface
   * Represents one of the four evaluation objectives
   */
  export interface PocObjective {
      /** Unique identifier (e.g., 'tash', 'self-service') */
      id: string;
      /** Objective title */
      title: string;
      /** Detailed explanation of objective */
      description: string;
      /** Icon component name */
      icon: string;
      /** Category for grouping objectives */
      category?: string;
      /** Key KPI summary for this objective */
      keyKpi: {
          /** Metric description */
          metric: string;
          /** Before measurement */
          before: KpiMetric;
          /** After measurement */
          after: KpiMetric;
          /** Calculated percentage improvement */
          improvement?: number;
      };
      /** Array of 3-5 test scenarios */
      tests: TestVariant[];
  }
  export interface Customer {
      name: string;
      logoUrl?: string;
  }
  /** POC lifecycle stage */
  export type PocStage = 'planned' | 'in-progress' | 'completed';
  /** Rating category names for completed POCs */
  export type RatingCategory = 'Technical Feasibility' | 'User Experience' | 'Performance & Scalability' | 'Integration Complexity' | 'Security';
  /** Category rating with 1-5 scale */
  export interface CategoryRating {
      category: RatingCategory;
      rating: StarRating;
      notes?: string;
  }
  /** Planned stage information */
  export interface PlannedInfo {
      goals: string[];
      successCriteria: string[];
      scope: string;
      timeline: {
          duration: string;
          milestones: string[];
      };
      resourcesNeeded: {
          team: string[];
          infrastructure: string[];
          dataAccess: string[];
      };
  }
  /** In-progress tracking information */
  export interface InProgressInfo {
      progressUpdates: {
          date: string;
          status: string;
          blockers?: string[];
      }[];
      observations: string[];
      timelineAdjustments?: string;
  }
  /** Completed evaluation information */
  export interface CompletedInfo {
      categoryRatings: CategoryRating[];
      qualitativeAssessment: {
          strengths: string[];
          weaknesses: string[];
          summary: string;
      };
      nextSteps: {
          decision: 'go' | 'no-go' | 'conditional';
          actionItems: string[];
          recommendations: string[];
      };
  }
  /**
   * Root POC Evaluation Data Interface
   * Contains all four objectives and metadata
   */
  export interface PocEvaluationData {
      /** Evaluation title */
      title: string;
      /** Optional subtitle */
      subtitle?: string;
      /** Current date time */
      date: string;
      customer: Customer;
      /** POC start date */
      startDate: string;
      /** POC end date */
      endDate?: string;
      /** Test environment description */
      environment: string;
      /** Exactly 4 objectives */
      objectives: PocObjective[];
      /** Current POC stage */
      status: PocStage;
      /** Planned stage information (present when status is 'planned') */
      plannedInfo?: PlannedInfo;
      /** In-progress tracking (present when status is 'in-progress') */
      inProgressInfo?: InProgressInfo;
      /** Completed evaluation (present when status is 'completed') */
      completedInfo?: CompletedInfo;
  }
  /**
   * Component Props Interface
   */
  export interface PocEvaluationProps {
      /** Evaluation data (defaults to sampleEvaluationData if not provided) */
      data?: PocEvaluationData;
      /** Show methodology section (default: true) */
      showMethodology?: boolean;
      /** Show glossary section (default: true) */
      showGlossary?: boolean;
      /** Inline CSS string */
      css: string;
  }

  export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
  export type AlertType = 'dependabot' | 'code-scanning' | 'secret-scanning';
  export interface Alert {
      type: AlertType;
      severity: AlertSeverity;
      title: string;
      url?: string;
      location?: string;
      references?: Array<{
          label: string;
          url: string;
      }>;
  }
  export interface SeverityTrend {
      critical: number;
      high: number;
      medium: number;
      low: number;
  }
  export interface SecurityTrend {
      recentlyClosed: number;
      recentlyClosedDependabot: number;
      recentlyClosedCodeScanning: number;
      totalClosed: number;
      bySeverity: SeverityTrend;
  }

  export function getColorFromString(input: string): string;

  /**
   * Format duration from milliseconds to human-readable string
   * @param value Duration in milliseconds
   * @returns Formatted string like "2d5h30m15s" or "450ms"
   */
  export function formatDuration(value: number): string;
  /**
   * Check if a value is empty (null, undefined, empty string, or empty array)
   */
  export function isEmpty(value: any): boolean;

  export interface AgeProps {
      className?: string;
      from?: Date | string;
      to?: Date | string | null;
      suffix?: boolean;
  }
  export function Age({ className, from, to, suffix }: AgeProps): JSX.Element | null;

  import { Alert } from '../types/security';
  interface AlertsTableProps {
      alerts: Alert[];
      className?: string;
  }
  /**
   * Displays security alerts in a compact single-line format with ellipsis
   */
  export function AlertsTable({ alerts, className }: AlertsTableProps): JSX.Element | null;

  import { User } from '../types/common';
  export interface AvatarProps {
      size?: 'xs' | 'sm' | 'md' | 'lg';
      circular?: boolean;
      inline?: boolean;
      alt?: string;
      user?: Partial<User>;
      className?: string;
      showName?: boolean;
  }
  export function Avatar({ user, size, alt, inline, circular, className, showName }: AvatarProps): JSX.Element;

  import { User } from '../types/common';
  export interface AvatarGroupProps {
      users: Partial<User>[];
      size?: 'xs' | 'sm' | 'md' | 'lg';
      maxCount?: number;
      className?: string;
  }
  export function AvatarGroup({ users, size, maxCount, className }: AvatarGroupProps): JSX.Element;

  /**
   * Badge size variant
   */
  export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';
  /**
   * Badge shape variant
   */
  export type BadgeShape = 'pill' | 'rounded' | 'square';
  /**
   * Badge visual variant
   */
  export type BadgeVariant = 'status' | 'metric' | 'custom' | 'outlined';
  /**
   * Semantic status types for status badges
   */
  export type BadgeStatus = 'success' | 'error' | 'warning' | 'info';
  /**
   * Props for the Badge component
   */
  export interface BadgeProps {
      /**
       * Visual variant of the badge
       * @default 'metric'
       */
      variant?: BadgeVariant;
      /**
       * Semantic status for status variant badges
       * Only applicable when variant='status'
       */
      status?: BadgeStatus;
      /**
       * Custom background color (hex or Tailwind class)
       * Only applicable when variant='custom'
       */
      color?: string;
      /**
       * Custom text color (hex or Tailwind class)
       * Only applicable when variant='custom'
       */
      textColor?: string;
      /**
       * Custom border color (hex or Tailwind class)
       * Only applicable when variant='custom' or 'outlined'
       */
      borderColor?: string;
      /**
       * Icon component to display (left-aligned)
       * Should be a React component that accepts className prop
       */
      icon?: React.ComponentType<{
          className?: string;
      }>;
      /**
       * Label text (left section)
       */
      label?: string;
      /**
       * Value text (right section)
       */
      value?: string;
      /**
       * Size of the badge
       * @default 'md'
       */
      size?: BadgeSize;
      /**
       * Shape/border-radius of the badge
       * @default 'pill'
       */
      shape?: BadgeShape;
      /**
       * URL for clickable badge (renders as <a> tag)
       */
      href?: string;
      /**
       * Link target attribute
       * @default '_self'
       */
      target?: '_blank' | '_self' | '_parent' | '_top';
      /**
       * Link rel attribute (e.g., 'noopener noreferrer' for external links)
       */
      rel?: string;
      /**
       * Additional CSS classes
       */
      className?: string;
  }
  /**
   * Badge component for displaying status indicators, metrics, and labeled values
   *
   * @example
   * // Status badge
   * <Badge variant="status" status="success" label="Build" value="passing" />
   *
   * @example
   * // Metric badge with icon
   * <Badge variant="metric" icon={StarIcon} label="Stars" value="1.2k" />
   *
   * @example
   * // Custom color badge
   * <Badge variant="custom" color="#7c3aed" textColor="#fff" label="v1.2.3" />
   *
   * @example
   * // Outlined badge as link
   * <Badge variant="outlined" status="info" label="Docs" href="/docs" target="_blank" />
   */
  export function Badge({ variant, status, color, textColor, borderColor, icon: Icon, label, value, size, shape, href, target, rel, className, }: BadgeProps): JSX.Element;

  interface BulletItem {
      term: string | React.ReactNode;
      subtitle?: string;
      description?: string;
      color?: string;
      icon?: string | React.ComponentType<{
          className?: string;
          style?: React.CSSProperties;
      }>;
  }
  interface BulletGroup {
      title: string;
      items: BulletItem[];
  }
  interface BulletListProps {
      items?: BulletItem[];
      groups?: BulletGroup[];
      variant?: 'default' | 'border-left' | 'gradient' | 'icon-left' | 'compact' | 'card';
      columns?: number;
      size?: 'xs' | 'sm' | 'md';
      termClass?: string;
      descriptionClass?: string;
      className?: string;
  }
  /**
   * BulletList Component (DS-17)
   *
   * Enforces bold lead-in phrase formatting for bullet points with multiple style variants.
   *
   * Supports three variants:
   * - default: Simple list with bold term and description
   * - border-left: Styled with left border accent (used in architecture page)
   * - gradient: Gradient background with icons (used in component showcases)
   *
   * DS-17: List items SHOULD start with bold lead-in phrases followed by details
   *
   * @example Default usage
   * \`\`\`tsx
   * <BulletList
   *   items={[
   *     {
   *       term: "Automatic discovery",
   *       description: "Agentless scraping across AWS, Azure, GCP, Kubernetes"
   *     },
   *     {
   *       term: "Real-time updates",
   *       description: "5-minute freshness with event-driven change detection"
   *     }
   *   ]}
   * />
   * \`\`\`
   *
   * @example Default with columns
   * \`\`\`tsx
   * <BulletList
   *   columns={2}
   *   items={[
   *     {
   *       term: "Automatic discovery",
   *       description: "Agentless scraping across AWS, Azure, GCP, Kubernetes"
   *     },
   *     {
   *       term: "Real-time updates",
   *       description: "5-minute freshness with event-driven change detection"
   *     },
   *     {
   *       term: "Full topology",
   *       description: "Dependencies, relationships, and change history"
   *     },
   *     {
   *       term: "GitOps workflows",
   *       description: "Declarative configuration management"
   *     }
   *   ]}
   * />
   * \`\`\`
   *
   * @example Border-left variant (Architecture page style)
   * \`\`\`tsx
   * <BulletList
   *   variant="border-left"
   *   columns={2}
   *   items={[
   *     {
   *       term: "Playbooks",
   *       description: "Event-driven automation engine for Day 2 operations.",
   *       color: "blue"
   *     },
   *     {
   *       term: "Unified Catalog",
   *       description: "Graph database storing infrastructure state.",
   *       color: "yellow"
   *     },
   *     {
   *       term: "Health Checks",
   *       description: "Synthetic monitoring with 35+ check types.",
   *       color: "green"
   *     }
   *   ]}
   * />
   * \`\`\`
   *
   * @example Gradient variant with groups (Component showcase style)
   * \`\`\`tsx
   * <BulletList
   *   variant="gradient"
   *   groups={[
   *     {
   *       title: "Data & Processing Layer",
   *       items: [
   *         {
   *           term: "Unified Catalog",
   *           description: "Graph database correlating infrastructure state.",
   *           color: "yellow",
   *           icon: "◉"
   *         },
   *         {
   *           term: "PostgreSQL",
   *           description: "Time-series and graph-enabled datastore.",
   *           color: "blue",
   *           icon: "◉"
   *         }
   *       ]
   *     },
   *     {
   *       title: "Automation & Operations",
   *       items: [
   *         {
   *           term: "Playbooks",
   *           description: "Event-driven automation engine.",
   *           color: "purple",
   *           icon: "◉"
   *         }
   *       ]
   *     }
   *   ]}
   * />
   * \`\`\`
   */
  export function BulletList({ items, groups, variant, columns, size, termClass, descriptionClass, className }: BulletListProps): JSX.Element | null;

  interface CTAButton {
      label: string;
      url: string;
  }
  interface CallToActionProps {
      primary: CTAButton;
      secondary?: CTAButton[];
      audience?: 'enterprise' | 'technical' | 'security';
  }
  /**
   * CallToAction Component (DS-25, DS-26)
   *
   * Displays a clear next step with primary CTA and optional secondary actions.
   * Provides audience-specific default CTAs.
   *
   * DS-25: Must include clear next steps
   * DS-26: Match CTA to audience
   *
   * Default CTAs by audience:
   * - enterprise: "Request Enterprise Trial" + "Talk to Sales"
   * - technical: "Start Free Trial" + "View Documentation"
   * - security: "Download Security Whitepaper" + "Schedule Demo"
   *
   * Usage:
   * <CallToAction
   *   primary={{ label: "Start Free Trial", url: "https://flanksource.com/trial" }}
   *   secondary={[
   *     { label: "View Documentation", url: "https://docs.flanksource.com" }
   *   ]}
   *   audience="technical"
   * />
   */
  export function CallToAction({ primary, secondary, audience }: CallToActionProps): JSX.Element;

  /**
   * CalloutBox Props
   */
  export interface CalloutBoxProps {
      /** Content to display inside the callout */
      children: React.ReactNode;
      /** Visual variant of the callout */
      variant?: 'info' | 'warning' | 'success' | 'default';
      /** Optional title for the callout */
      title?: string;
      /** Optional CSS class name */
      className?: string;
  }
  /**
   * CalloutBox Component
   *
   * Displays an emphasized callout box with different visual styles.
   * Useful for highlighting important information, warnings, or tips.
   *
   * @example
   * \`\`\`tsx
   * <CalloutBox variant="info" title="Important Note">
   *   This is important information that users should know.
   * </CalloutBox>
   * \`\`\`
   */
  export function CalloutBox({ children, variant, title, className, }: CalloutBoxProps): JSX.Element;

  interface Feature {
      title: string;
      description: string;
      icon?: React.ReactNode;
  }
  interface CapabilitySectionProps {
      outcome: string;
      features: Feature[];
      icon?: React.ReactNode;
  }
  /**
   * CapabilitySection Component (DS-5, DS-17)
   *
   * @deprecated Use Section component with variant="hero" and BulletList children instead:
   * <Section variant="hero" title="Reduce MTTR by 85%">
   *   <BulletList items={[
   *     { term: "Link alerts to changes", description: "..." },
   *     { term: "Trace deployment history", description: "..." }
   *   ]} />
   * </Section>
   *
   * Displays a capability section leading with customer outcome, followed by features.
   * Enforces outcome-first structure and bold lead-in formatting.
   *
   * DS-5: Lead with outcomes, not features
   * DS-17: Use bold lead-in text followed by description
   *
   * Usage:
   * <CapabilitySection
   *   outcome="Reduce MTTR by 85% Through Automated Change Correlation"
   *   features={[
   *     {
   *       title: "Link alerts to changes",
   *       description: "Automatic correlation with CloudTrail, Git, and Kubernetes events"
   *     },
   *     {
   *       title: "Trace deployment history",
   *       description: "Show what deployed each resource and how to change it"
   *     }
   *   ]}
   * />
   */
  export function CapabilitySection({ outcome, features, icon }: CapabilitySectionProps): JSX.Element;

  export type TableSize = 'xs' | 'sm' | 'base' | 'md';
  interface CompactTableRow {
      label: string;
      value: string | string[];
  }
  interface CompactTableProps {
      data?: CompactTableRow[] | (string | React.ReactNode)[][];
      variant?: 'compact' | 'inline' | 'reference';
      title?: string;
      className?: string;
      columns?: string[];
      size?: TableSize;
  }
  export function CompactTable({ data, variant, title, className, columns, size, }: CompactTableProps): JSX.Element;

  interface ComparisonTableProps {
      pros: string[];
      cons: string[];
      prosTitle?: string;
      consTitle?: string;
  }
  /**
   * ComparisonTable Component
   *
   * Displays a two-column comparison table with pros/cons or advantages/disadvantages.
   * Based on the design from docs/index.mdx with checkmarks and crosses.
   */
  export function ComparisonTable({ pros, cons, prosTitle, consTitle }: ComparisonTableProps): JSX.Element;

  export interface CountBadgeProps {
      value?: number;
      size?: 'xs' | 'sm' | 'md';
      title?: string;
      className?: string;
      colorClass?: string;
      roundedClass?: string;
  }
  export const CountBadge: React.NamedExoticComponent<CountBadgeProps>;

  export interface PageConfig {
      content: React.ReactNode;
      title?: string;
      product?: string;
      margins?: boolean;
  }
  export interface DatasheetTemplateProps {
      pages?: PageConfig[];
      title?: string;
      css?: string;
      subtitle?: string;
      PageComponent?: React.ComponentType<any>;
      children?: React.ReactNode;
  }
  export function DatasheetTemplate({ pages, title, subtitle, css, PageComponent, children, }: DatasheetTemplateProps): JSX.Element;

  interface Stat {
      value: string;
      label: string;
      icon?: React.ComponentType<{
          className?: string;
          style?: React.CSSProperties;
      }>;
  }
  interface BulletPoint {
      term: string;
      description?: string;
      icon?: React.ComponentType<{
          className?: string;
          style?: React.CSSProperties;
      }>;
      color?: string;
  }
  interface FeatureLayoutProps {
      title: string;
      description: string;
      bullets: BulletPoint[];
      span?: number;
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
  export function FeatureLayout({ title, description, bullets, stats, children, direction, span, className }: FeatureLayoutProps): JSX.Element;

  interface FooterProps {
      variant?: 'default' | 'compact' | 'minimal';
      type?: PageType;
      height?: number;
      company?: string;
      copyright?: string;
      web?: string;
      docs?: string;
      email?: string;
      phone?: string;
      github?: string;
      linkedin?: string;
      children?: React.ReactNode;
  }
  export function Footer({ variant, type, height, company, copyright, web, docs, email, phone, github, linkedin, children, }: FooterProps): JSX.Element;

  export interface GaugeProps {
      value: number;
      units?: string;
      minValue: number;
      maxValue: number;
      width?: string;
      arcColor?: string;
      arcBgColor?: string;
      label?: React.ReactNode;
      showMinMax?: boolean;
  }
  export const Gauge: FC<GaugeProps>;

  /**
   * GlossaryTerm Interface
   */
  export interface GlossaryTerm {
      /** Term name/abbreviation */
      term: string;
      /** Definition of the term */
      definition: string;
  }
  /**
   * RatingScaleItem Interface
   */
  export interface RatingScaleItem {
      /** Star rating value */
      stars: number;
      /** Meaning/description of the rating */
      meaning: string;
  }
  /**
   * LegendItem Interface
   */
  export interface LegendItem {
      /** Example value to display */
      example: string;
      /** Description of what the example represents */
      description: string;
  }
  /**
   * GlossarySection Interface
   */
  export interface GlossarySection {
      /** Section title */
      title: string;
      /** Section content - can be terms, ratings, or legend items */
      content: React.ReactNode;
  }
  /**
   * Glossary Props
   */
  export interface GlossaryProps {
      /** Main title for the glossary section */
      title?: string;
      /** Array of glossary terms */
      terms?: GlossaryTerm[];
      /** Array of rating scale items with visual component */
      ratingScale?: RatingScaleItem[];
      /** Component to render star ratings */
      StarRatingComponent?: React.ComponentType<{
          rating: number;
      }>;
      /** Array of legend items (format examples) */
      legend?: LegendItem[];
      /** Legend section title */
      legendTitle?: string;
      /** Custom sections to add */
      customSections?: GlossarySection[];
      /** Number of columns for layout (1 or 2) */
      columns?: 1 | 2;
      /** Optional CSS class name */
      className?: string;
  }
  /**
   * Glossary Component
   *
   * Displays a glossary section with terms, rating scales, and format legends.
   * Flexible component that can display technical terms, rating explanations,
   * and format examples in a multi-column layout.
   *
   * @example
   * \`\`\`tsx
   * <Glossary
   *   title="Glossary & Legend"
   *   terms={[
   *     { term: 'KPI', definition: 'Key Performance Indicator' },
   *     { term: 'TASH', definition: 'Time to Ascertain Service Health' }
   *   ]}
   *   ratingScale={[
   *     { stars: 5, meaning: 'Excellent performance' },
   *     { stars: 3, meaning: 'Average performance' }
   *   ]}
   *   StarRatingComponent={StarRating}
   *   legend={[
   *     { example: '5m 30s', description: 'Time duration' },
   *     { example: '-87%', description: 'Percentage improvement' }
   *   ]}
   * />
   * \`\`\`
   */
  export function Glossary({ title, terms, ratingScale, StarRatingComponent, legend, legendTitle, customSections, columns, className, }: GlossaryProps): JSX.Element;

  export type PageType = 'first' | 'default' | 'last';
  interface HeaderProps {
      variant?: 'default' | 'solid' | 'minimal';
      logo?: React.ReactNode;
      title?: string;
      subtitle?: string;
      type?: PageType;
      height?: number;
      children?: React.ReactNode;
  }
  export function Header({ variant, logo, title, subtitle, type, height, children, }: HeaderProps): JSX.Element;

  /**
   * @deprecated Use LogoGrid instead. IntegrationGrid is an alias for backward compatibility.
   */

  import { KpiComparison } from '../types/poc';
  interface KPITargetActualProps {
      kpi: KpiComparison;
      className?: string;
  }
  export function KPITargetActual({ kpi, className }: KPITargetActualProps): JSX.Element;

  /**
   * KPI Value Interface
   */
  export interface KpiValue {
      /** Numeric value */
      value: number | string;
      /** Display formatted value */
      displayValue: string;
      /** Unit of measurement */
      unit?: string;
  }
  /**
   * KpiComparison Props
   */
  export interface KpiComparisonProps {
      /** Before metric value */
      before: KpiValue;
      /** After metric value */
      after: KpiValue;
      /** Percentage improvement (positive = better) */
      improvement?: number;
      /** Label for the metric */
      label?: string;
      /** Format type for visualization */
      format?: 'time' | 'percentage' | 'count' | 'custom';
      /** Show summary in top right */
      showSummary?: boolean;
      /** Show improvement arrow/indicator */
      showImprovement?: boolean;
  }
  /**
   * KpiComparison Component
   *
   * Displays before/after KPI comparison with visual bar chart.
   * Useful for showing performance improvements or metric changes.
   *
   * @example
   * \`\`\`tsx
   * <KpiComparison
   *   label="Response Time"
   *   before={{ value: 330, displayValue: "5m 30s" }}
   *   after={{ value: 45, displayValue: "45s" }}
   *   improvement={86.4}
   *   format="time"
   *   showSummary
   * />
   * \`\`\`
   */
  export function KpiComparison({ before, after, improvement, label, showSummary, showImprovement, }: KpiComparisonProps): JSX.Element;

  interface FeatureSupport {
      enabled: boolean;
      url?: string;
  }
  interface Logo {
      name: string;
      title?: string;
      icon?: string | React.ComponentType<{
          className?: string;
          title?: string;
      }>;
      icons?: Array<string | React.ComponentType<{
          className?: string;
          title?: string;
      }>>;
      logo?: string;
      logoSvg?: string;
      url?: string;
      urlPath?: string;
      health?: FeatureSupport | boolean;
      configuration?: FeatureSupport | boolean;
      change?: FeatureSupport | boolean;
      playbooks?: FeatureSupport | boolean;
  }
  interface LogoGridProps {
      logos: Logo[];
      viewAllUrl?: string;
      title?: string;
      variant?: 'default' | 'compact' | 'table';
      baseDocsUrl?: string;
      size?: TableSize;
  }
  export function LogoGrid({ logos, viewAllUrl, title, variant, baseDocsUrl, size, }: LogoGridProps): JSX.Element;

  /**
   * Metric Interface
   * Represents a single metric value with label
   */
  export interface Metric {
      /** Numeric or string value to display */
      value: string | number;
      /** Label/description of the metric */
      label: string;
      /** Optional icon component */
      icon?: React.ComponentType<{
          className?: string;
      }>;
      /** Optional color variant for value text */
      valueColor?: 'blue' | 'green' | 'red' | 'gray' | 'yellow';
  }
  /**
   * MetricGrid Props
   */
  export interface MetricGridProps {
      /** Array of metrics to display */
      metrics: Metric[];
      /** Number of columns in grid (2-4) */
      columns?: 2 | 3 | 4;
      /** Optional CSS class name */
      className?: string;
  }
  /**
   * MetricGrid Component
   *
   * Displays a grid of metrics with consistent styling.
   * Commonly used for dashboard-style metric displays.
   *
   * @example
   * \`\`\`tsx
   * <MetricGrid
   *   columns={3}
   *   metrics={[
   *     { value: '42', label: 'Total Issues' },
   *     { value: '98%', label: 'Coverage' },
   *     { value: '5ms', label: 'Response Time' }
   *   ]}
   * />
   * \`\`\`
   */
  export function MetricGrid({ metrics, columns, className }: MetricGridProps): JSX.Element;

  /**
   * KPI Value Interface
   */
  export interface KpiValue {
      /** Numeric or string value */
      value: number;
      /** Optional unit of measurement */
      unit?: string;
  }
  /**
   * MetricHeaderProps - Base Props
   */
  interface MetricHeaderBaseProps {
      /** Metric title/label */
      title: string;
      /** Optional subtitle/description */
      subtitle?: string;
      /** Optional CSS class name */
      className?: string;
  }
  interface MetricHeaderGaugeProps extends MetricHeaderBaseProps {
      variant: 'gauge';
      score: number;
      maxScore?: number;
  }
  /**
   * MetricHeaderProps - Comparison Variant
   */
  interface MetricHeaderComparisonProps extends MetricHeaderBaseProps {
      /** Variant type */
      variant: 'comparison';
      /** Before measurement */
      before: KpiValue;
      /** After measurement */
      after: KpiValue;
      /** Percentage improvement */
      improvement?: number;
      /** Show visual bars */
      showBars?: boolean;
      /** Optional comparison component */
      ComparisonComponent?: React.ComponentType<{
          before: KpiValue;
          after: KpiValue;
          improvement?: number;
      }>;
  }
  export type MetricHeaderProps = MetricHeaderGaugeProps | MetricHeaderComparisonProps;
  /**
   * MetricHeader Component
   *
   * Displays a metric header with either a gauge (score) or comparison (before/after) variant.
   * Used for highlighting key metrics at the top of sections.
   *
   * @example Gauge Variant
   * \`\`\`tsx
   * <MetricHeader
   *   variant="gauge"
   *   title="Security Score"
   *   subtitle="OpenSSF Scorecard"
   *   score={8.5}
   *   size="lg"
   *   GaugeComponent={ScoreGauge}
   * />
   * \`\`\`
   *
   * @example Comparison Variant
   * \`\`\`tsx
   * <MetricHeader
   *   variant="comparison"
   *   title="Time to Ascertain Service Health"
   *   subtitle="Average time to gather complete service health picture"
   *   before={{ value: 330, displayValue: "5m 30s" }}
   *   after={{ value: 45, displayValue: "45s" }}
   *   improvement={86.4}
   *   showBars
   * />
   * \`\`\`
   */
  export function MetricHeader(props: MetricHeaderProps): JSX.Element | null;

  interface Metric {
      value: string;
      label: string;
      icon?: string | React.ComponentType<{
          className?: string;
          style?: React.CSSProperties;
      }>;
  }
  interface MetricsCalloutProps {
      metrics: Metric[];
      variant?: 'primary' | 'secondary';
  }
  /**
   * MetricsCallout Component (DS-14)
   *
   * Displays 3-5 key metrics in a visually prominent boxed layout.
   * Metrics should use percentages, time units, or counts with proper formatting.
   *
   * Formatting rules (DS-14):
   * - Percentages: Bold, 14-16pt, brand color
   * - Time metrics: Include units (hours, minutes, days)
   * - Large numbers: Use thousands separator (45,234)
   *
   * Icon support:
   * - Unplugin icons: Pass React component directly (e.g., IconTime from '~icons/ion/time-outline')
   * - Iconify icons: Pass string like "ion:alert-circle-outline"
   * - Flanksource icons: Pass string like "postgres" or "kubernetes"
   * - Emoji/text: Pass any string like "⏱️" or "✓"
   *
   * Usage:
   * <MetricsCallout
   *   metrics={[
   *     { value: "85%", label: "Reduction in MTTR" },
   *     { value: "70%", label: "Less Alert Noise" },
   *     { value: "<1 Hour", label: "Time to Value", icon: IconTime }
   *   ]}
   * />
   */
  export function MetricsCallout({ metrics, variant }: MetricsCalloutProps): JSX.Element;

  export type PageSize = 'a4' | 'a3' | 'letter' | 'legal' | 'fhd' | 'qhd' | 'wqhd' | '4k' | '5k' | '16k';
  interface PageMargins {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
  }
  interface PageProps {
      children: React.ReactNode;
      title?: string;
      product?: string;
      className?: string;
      pageSize?: PageSize;
      margins?: PageMargins;
      watermark?: string;
      type?: PageType;
  }
  export function Page({ children, title, product, className, pageSize, margins, watermark, type, }: PageProps): JSX.Element;

  /**
   * PageBreak Component
   *
   * Inserts a page break for PDF generation and print layouts.
   * Uses CSS page-break-after property to ensure content after this component
   * starts on a new page.
   *
   * @example
   * \`\`\`tsx
   * <Page>
   *   <Content1 />
   * </Page>
   * <PageBreak />
   * <Page>
   *   <Content2 />
   * </Page>
   * \`\`\`
   */
  export function PageBreak(): JSX.Element;

  /**
   * ProgressBar Props
   */
  export interface ProgressBarProps {
      /** Title/label displayed on the left */
      title: string;
      /** Percentage value (0-100) */
      percentage: number;
      /** Optional subtitle/description below title */
      subtitle?: string;
      /** Optional display value instead of percentage */
      displayValue?: string;
      /** Color variant for the progress bar */
      variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'gray';
      /** Size of the progress bar */
      size?: 'sm' | 'md' | 'lg';
      /** Show percentage value inside the bar */
      showPercentageInBar?: boolean;
      /** Show percentage value on the right side */
      showPercentageLabel?: boolean;
      /** Optional CSS class name */
      className?: string;
      choldren?: React.ReactNode;
  }
  /**
   * ProgressBar Component
   *
   * Displays a horizontal progress bar with title on the left and optional percentage display.
   * Useful for showing completion status, scores, or any percentage-based metric.
   *
   * @example Basic Usage
   * \`\`\`tsx
   * <ProgressBar
   *   title="Task Completion"
   *   percentage={75}
   * />
   * \`\`\`
   *
   * @example With Subtitle
   * \`\`\`tsx
   * <ProgressBar
   *   title="Security Score"
   *   subtitle="OpenSSF Scorecard"
   *   percentage={85}
   *   variant="success"
   *   size="lg"
   * />
   * \`\`\`
   *
   * @example Multiple Progress Bars
   * \`\`\`tsx
   * <div className="space-y-3">
   *   <ProgressBar title="CPU Usage" percentage={65} variant="info" />
   *   <ProgressBar title="Memory Usage" percentage={82} variant="warning" />
   *   <ProgressBar title="Disk Usage" percentage={45} variant="success" />
   * </div>
   * \`\`\`
   */
  export function ProgressBar({ title, percentage, displayValue, subtitle, variant, size, showPercentageInBar, showPercentageLabel, className, children }: ProgressBarProps): JSX.Element;

  interface ProjectSummaryCardProps {
      icon?: React.ComponentType<{
          className?: string;
      }>;
      name: string;
      description: string;
      security: any;
      githubUrl: string;
      className?: string;
  }
  /**
   * Compact summary card for additional projects showing key security metrics
   */
  export function ProjectSummaryCard({ icon: Icon, name, description, security, githubUrl, className }: ProjectSummaryCardProps): JSX.Element;

  export interface MCPToolCall {
      tool: string;
      description: string;
      result?: string;
  }
  export interface QueryResponseChatProps {
      userQuery: string;
      mcpTools?: MCPToolCall[];
      aiResponse: string;
      compact?: boolean;
  }
  export function QueryResponseChat({ userQuery, mcpTools, aiResponse, compact }: QueryResponseChatProps): JSX.Element;

  export interface MCPToolCall {
      tool: string;
      description: string;
      result?: string;
  }
  interface QueryResponseExampleProps {
      userQuery: string;
      mcpTools?: MCPToolCall[];
      aiResponse: string;
      variant?: 'chat' | 'terminal' | 'both';
      compact?: boolean;
      title?: string;
  }
  /**
   * QueryResponseExample Component
   *
   * Wrapper component for displaying AI query/response interactions.
   * Supports multiple visualization styles: chat bubbles, terminal, or both.
   * Can show or hide MCP tool calls via compact mode.
   *
   * Usage:
   * <QueryResponseExample
   *   title="Example: Incident Troubleshooting"
   *   userQuery="Why is the payment-service pod crashing?"
   *   mcpTools={[
   *     { tool: "search_catalog", description: "Found 3 replicas, 2 in CrashLoopBackOff" },
   *     { tool: "query_health_checks", description: "HTTP check failing with 500 errors" },
   *     { tool: "search_catalog_changes", description: "ConfigMap updated 18 minutes ago" }
   *   ]}
   *   aiResponse="The payment-service pods are crashing because the ConfigMap update changed the database connection pool size from 10 to 100, exceeding the database's max_connections limit."
   *   variant="both"
   *   compact={false}
   * />
   */
  export function QueryResponseExample({ userQuery, mcpTools, aiResponse, variant, compact, title }: QueryResponseExampleProps): JSX.Element;

  interface MCPToolCall {
      tool: string;
      description: string;
      result?: string;
  }
  interface QueryResponseTerminalProps {
      userQuery: string;
      mcpTools?: MCPToolCall[];
      aiResponse: string;
      compact?: boolean;
  }
  /**
   * QueryResponseTerminal Component
   *
   * Displays AI query/response interaction in Claude Code terminal style.
   * Uses monospace font with dark background (matching Claude Code's theme).
   * User queries prefixed with command prompt.
   * MCP tool calls shown with execution indicators.
   * Styled to match Claude Code's integrated terminal aesthetic.
   *
   * Usage:
   * <QueryResponseTerminal
   *   userQuery="Why is the payment-service pod crashing?"
   *   mcpTools={[
   *     { tool: "search_catalog", description: "Found 3 replicas, 2 in CrashLoopBackOff" },
   *     { tool: "get_check_status", description: "HTTP check failing with 500 errors" }
   *   ]}
   *   aiResponse="The payment-service pods are crashing because..."
   *   compact={false}
   * />
   */
  export function QueryResponseTerminal({ userQuery, mcpTools, aiResponse, compact }: QueryResponseTerminalProps): JSX.Element;

  import { CategoryRating } from '../types/poc';
  interface RatingCategoryInputProps {
      rating: CategoryRating;
      className?: string;
  }
  export function RatingCategoryInput({ rating, className }: RatingCategoryInputProps): JSX.Element;

  interface ScoreGaugeProps {
      score: number;
      label?: string;
      size?: 'sm' | 'md' | 'lg';
      className?: string;
      showMinMax?: boolean;
  }
  /**
   * Circular gauge displaying OpenSSF Scorecard score (0-10)
   * Color-coded: 0-4 (red), 4-7 (yellow), 7-10 (green)
   */
  export function ScoreGauge({ score, label, size, className, showMinMax }: ScoreGaugeProps): JSX.Element;

  interface SectionProps {
      title?: string;
      subtitle?: string;
      icon?: React.ComponentType<{
          className?: string;
          style?: React.CSSProperties;
      }>;
      description?: string;
      metric?: React.ReactNode;
      variant?: 'hero' | 'card-grid' | 'two-column' | 'two-column-reverse' | 'metric-grid' | 'summary-grid' | 'dashboard';
      size?: 'sm' | 'md' | 'lg';
      color?: string;
      className?: string;
      span?: number;
      columns?: 2 | 3 | 4;
      layout?: '9-3' | '10-2' | '8-4' | '6-6';
      children?: React.ReactNode;
  }
  /**
   * Section Component
   *
   * Unified component for various section layouts in datasheets.
   * Replaces ValueProposition and CapabilitySection with flexible variant system.
   *
   * Variants:
   * - 'hero': Single-column full-width layout for headers and value propositions
   * - 'two-column': Left content + right metric sidebar (configurable span or layout)
   * - 'two-column-reverse': Right content + left metric sidebar
   * - 'card-grid': Header with grid of cards below (2 columns)
   * - 'metric-grid': Header with grid of metric cards below (2-4 columns)
   * - 'summary-grid': Header with grid of entity/project cards below (2-3 columns)
   * - 'dashboard': Title/subtitle left, metric right, description/children below
   *
   * Size variants control typography and spacing:
   * - sm: 12pt title, 2mm gaps
   * - md: 14pt title, 4mm gaps (default)
   * - lg: 18pt title, 6mm gaps
   *
   * Layout shortcuts for two-column variants:
   * - '9-3': 9 columns content, 3 columns metric
   * - '10-2': 10 columns content, 2 columns metric
   * - '8-4': 8 columns content, 4 columns metric
   * - '6-6': 6 columns content, 6 columns metric
   *
   * Usage:
   * <Section
   *   variant="metric-grid"
   *   columns={3}
   *   title="Platform Metrics"
   *   description="Current system performance"
   * >
   *   <StatCard value="99.9%" label="Uptime" />
   *   <StatCard value="42" label="Services" />
   *   <StatCard value="5ms" label="Latency" />
   * </Section>
   */
  export function Section({ title, subtitle, icon: IconComponent, description, metric, variant, size, color, className, span, columns, layout, children }: SectionProps): JSX.Element;

  interface SecurityCheck {
      name: string;
      score: number;
      reason: string;
      details?: string[];
      documentation?: {
          url: string;
      };
  }
  interface SecurityChecksTableProps {
      checks: SecurityCheck[];
      className?: string;
      size?: TableSize;
  }
  export function SecurityChecksTable({ checks, className, size, }: SecurityChecksTableProps): JSX.Element;

  interface SeverityStatCardProps {
      color: 'red' | 'orange' | 'yellow' | 'blue' | 'green' | 'gray';
      value: number;
      label: string;
      trend?: {
          added: number;
          closed: number;
          delta: number;
      };
      downIsGood?: boolean;
      className?: string;
  }
  /**
   * Severity stat card component with optional trend indicator
   */
  export function SeverityStatCard({ color, value, label, trend, downIsGood, className }: SeverityStatCardProps): JSX.Element;

  interface CustomerLogo {
      name: string;
      logo: string;
  }
  interface Testimonial {
      quote: string;
      attribution: string;
      metric?: string;
  }
  interface SocialProofProps {
      logos?: CustomerLogo[];
      testimonial?: Testimonial;
  }
  /**
   * SocialProof Component (DS-24)
   *
   * Displays customer logos or a brief testimonial.
   * Choose ONE format: logo bar OR testimonial, not both.
   *
   * DS-24: Include one of:
   * - Customer logo bar (6-8 logos maximum)
   * - Brief customer quote (1-2 sentences)
   * - Case study reference with metric
   *
   * MUST NOT include:
   * - Long testimonials
   * - More than one quote
   * - Generic quotes without specific outcomes
   *
   * Usage (Logos):
   * <SocialProof
   *   logos={[
   *     { name: "Acme Corp", logo: "/logos/acme.svg" },
   *     { name: "Globex", logo: "/logos/globex.svg" }
   *   ]}
   * />
   *
   * Usage (Testimonial):
   * <SocialProof
   *   testimonial={{
   *     quote: "We reduced our MTTR from 4 hours to 30 minutes using Mission Control.",
   *     attribution: "John Doe, CTO at Acme Corp",
   *     metric: "87.5% reduction in MTTR"
   *   }}
   * />
   */
  export function SocialProof({ logos, testimonial }: SocialProofProps): JSX.Element;

  interface Specification {
      category: string;
      value: string | string[];
  }
  interface SpecificationTableProps {
      title?: string;
      specifications: Specification[];
      className?: string;
      size?: TableSize;
  }
  export function SpecificationTable({ title, specifications, className, size }: SpecificationTableProps): JSX.Element;

  type StarRating = 1 | 2 | 3 | 4 | 5;
  interface StarRatingProps {
      mode?: 'display' | 'interactive';
      value: StarRating;
      onChange?: (rating: StarRating) => void;
      size?: 'sm' | 'md' | 'lg';
      showLabel?: boolean;
      className?: string;
  }
  export function StarRating({ mode, value, onChange, size, showLabel, className, }: StarRatingProps): JSX.Element;

  interface StatCardProps {
      value: UnitValue | string | number;
      compareFrom?: UnitValue | string | number;
      label: string;
      icon?: React.ComponentType<{
          className?: string;
          style?: React.CSSProperties;
      }>;
      variant?: 'card' | 'badge' | 'hero' | 'bordered' | 'icon-heavy' | 'left-aligned' | 'metric';
      compareVariant?: 'trendline' | 'up-down' | 'before-after' | 'before-after-progress';
      size?: 'sm' | 'md' | 'lg';
      valueClassName?: string;
      iconClassName?: string;
      iconColor?: string;
      valueColor?: string;
      sublabel?: React.ReactNode;
      sublabelClassName?: string;
      conditionalStyles?: ConditionalStyle[];
      color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray';
  }
  export type ConditionalStyle = ConditionalStyleFunction | 'red-green' | 'green-red';
  export interface ConditionalStyleFunction {
      condition: (value: UnitValue) => boolean;
      classes: string;
  }
  export type TimeUnit = 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';
  export type DataUnit = 'bytes' | 'kilobytes' | 'megabytes' | 'gigabytes' | 'terabytes';
  export type NumberUnit = 'none' | 'percent' | 'currency';
  export type Unit = TimeUnit | DataUnit | NumberUnit;
  export type UnitValue = TimeUnitValue | DataUnitValue | NumberUnitValue;
  export class TimeUnitValue {
      value: number;
      unit: TimeUnit;
      constructor(value: number, unit: TimeUnit);
      toUnit(targetUnit: TimeUnit): TimeUnitValue;
      seconds(): number;
      toString(): string;
  }
  export class DataUnitValue {
      value: number;
      unit: DataUnit;
      constructor(value: number, unit: DataUnit);
      toUnit(targetUnit: DataUnit): DataUnitValue;
      bytes(): number;
      toString(): string;
  }
  export class NumberUnitValue {
      value: number;
      unit: NumberUnit;
      constructor(value: number, unit: NumberUnit);
      toString(): string;
  }
  /**
   * StatCard Component
   *
   * Displays a metric with optional icon, value, label, and sublabel.
   * Supports multiple styling variants for different use cases.
   *
   * Variants:
   * - 'card': Clean unbordered card style (40mm × 40mm, outlined icon)
   * - 'badge': Compact inline badge (light blue background)
   * - 'hero': Large emphasis metric (36-48pt values)
   * - 'bordered': Bordered card variant (for when borders are needed)
   * - 'icon-heavy': Large icon with overlaid value badge
   * - 'left-aligned': Icon on left, value and label stacked on right
   * - 'metric': Summary metric card with colored background and border
   *
   * Compare Variants (when compareFrom is provided):
   * - 'trendline': Show trend icon and delta
   * - 'up-down': Show up/down arrows with conditional coloring
   * - 'before-after': Show "X → Y" format
   * - 'before-after-progress': Show before → after with progress bar
   *
   * Usage:
   * <StatCard
   *   value={150}
   *   compareFrom={100}
   *   compareVariant="up-down"
   *   label="Total Credits"
   *   icon={MyIconComponent}
   *   variant="card"
   *   conditionalStyles={['red-green']}
   * />
   */
  export function StatCard({ value, label, icon: IconComponent, variant, size, iconColor, valueColor, sublabel, compareFrom, compareVariant, color, conditionalStyles, valueClassName, iconClassName, sublabelClassName }: StatCardProps): JSX.Element;

  export interface StatusProps {
      good?: boolean;
      mixed?: boolean;
      status?: string;
      className?: string;
      statusText?: string;
      hideText?: boolean;
  }
  export function Status({ status, statusText, good, mixed, className, hideText }: StatusProps): JSX.Element | null;

  export interface Step {
      label: string;
      description?: string;
  }
  interface StepsProps {
      steps: Step[];
      currentStep: number;
      className?: string;
  }
  export function Steps({ steps, currentStep, className }: StepsProps): JSX.Element;

  interface SyntaxHighlighterProps {
      code: string;
      language?: string;
      title?: string;
      showLineNumbers?: boolean;
      className?: string;
  }
  /**
   * SyntaxHighlighter component using Shiki
   *
   * Pre-renders syntax-highlighted code blocks during SSR build.
   * Uses Shiki to generate static HTML with embedded styles.
   *
   * @param code - The code to highlight
   * @param language - Programming language (default: 'yaml')
   * @param title - Optional title displayed above code block
   * @param showLineNumbers - Show line numbers (default: false)
   * @param className - Additional CSS classes
   */
  export function SyntaxHighlighter({ code, language, title, showLineNumbers, className }: SyntaxHighlighterProps): JSX.Element;

  import { TaskSummary } from '../types/billing';
  interface TaskSummarySectionProps {
      tasks: TaskSummary[];
  }
  export function TaskSummarySection({ tasks }: TaskSummarySectionProps): JSX.Element | null;

  interface TerminalOutputProps {
      command: string;
      children?: React.ReactNode;
  }
  export function TerminalOutput({ command, children }: TerminalOutputProps): JSX.Element;

  interface TwoColumnSectionProps {
      leftContent: React.ReactNode;
      rightContent: React.ReactNode;
      className?: string;
  }
  /**
   * TwoColumnSection Component (DS-2)
   *
   * Multi-column layout for content below the fold.
   * Automatically stacks on small screens for responsive design.
   *
   * DS-2: Single-column layout above fold, multi-column below fold
   *
   * Usage:
   * <TwoColumnSection
   *   leftContent={<CapabilitySection ... />}
   *   rightContent={<CapabilitySection ... />}
   * />
   */
  export function TwoColumnSection({ leftContent, rightContent, className }: TwoColumnSectionProps): JSX.Element;

  interface ValuePropositionProps {
      tagline: string;
      description: string;
      children?: React.ReactNode;
  }
  /**
   * ValueProposition Component (DS-1, DS-2)
   *
   * @deprecated Use Section component with variant="hero" instead:
   * <Section variant="hero" size="lg" title="..." description="...">
   *   <MetricsCallout metrics={[...]} />
   * </Section>
   *
   * Single-column hero section displaying product tagline and core value proposition.
   * Must appear above the fold, before any multi-column content.
   *
   * Usage:
   * <ValueProposition
   *   tagline="Single Source of Truth for Cloud & Kubernetes Infrastructure"
   *   description="Teams reduce MTTR by 85% and increase deployment frequency 3x..."
   * >
   *   <MetricsCallout metrics={[...]} />
   * </ValueProposition>
   */
  export function ValueProposition({ tagline, description, children }: ValuePropositionProps): JSX.Element;

  interface VulnerabilityData {
      dependabot: any[];
      codeScanning: any[];
      secretScanning: any[];
      totalCount: number;
      severity: {
          critical: number;
          high: number;
          medium: number;
          low: number;
      };
      trend?: {
          recentlyAdded: number;
          recentlyClosed: number;
          recentlyClosedDependabot: number;
          recentlyClosedCodeScanning: number;
          totalClosed: number;
          addedBySeverity: {
              critical: number;
              high: number;
              medium: number;
              low: number;
          };
          closedBySeverity: {
              critical: number;
              high: number;
              medium: number;
              low: number;
          };
          deltaBySeverity: {
              critical: number;
              high: number;
              medium: number;
              low: number;
          };
      };
      error?: string;
  }
  interface VulnerabilityBreakdownProps {
      data: VulnerabilityData;
      projectName: string;
      githubUrl: string;
      className?: string;
  }
  /**
   * Displays GitHub security alerts breakdown with severity categorization
   */
  export function VulnerabilityBreakdown({ data, projectName, githubUrl, className }: VulnerabilityBreakdownProps): JSX.Element;

}
`;
