/**
 * Component Exports
 *
 * Centralized barrel export for all @facet components.
 * Consumers import components using: import { ComponentName } from '@facet'
 */

export { default as AIModelCard } from './AIModelCard';
export type { AIModelCardProps } from './AIModelCard';
export { Age } from './Age';
export { default as AlertsTable } from './AlertsTable';
export { Avatar } from './Avatar';
export { AvatarGroup } from './AvatarGroup';
export { default as Badge } from './Badge';
export { default as BulletList } from './BulletList';
export { CountBadge } from './CountBadge';
export { default as CalloutBox } from './CalloutBox';
export { default as CallToAction } from './CallToAction';
export { default as CapabilitySection } from './CapabilitySection';
export { default as CompactTable } from './CompactTable';
export type { TableSize } from './CompactTable';
export { default as ComparisonTable } from './ComparisonTable';
export { default as DatasheetTemplate } from './DatasheetTemplate';
export { default as Document, useDocumentDefaults } from './Document';
export type { DocumentProps, DocumentDefaults } from './Document';
export { default as DynamicTable, formatCellValue } from './DynamicTable';
export type { ColumnDef, ColumnType, CellAttributes, GaugeConfig, GaugeThreshold, DynamicTableProps } from './DynamicTable';
export { default as FeatureLayout } from './FeatureLayout';
export { default as Finding } from './Finding';
export type { FindingProps, FindingBadge, Entity, Sample } from './Finding';
export { default as Footer } from './Footer';
export { default as Format, formatDate, formatDateTime, formatRelative, formatBytes, formatMillicores, formatDurationMs, formatDisplayValue, formatPropertyValue, getGaugeColor } from './Format';
export type { FormatType, FormatProps } from './Format';
export { Gauge } from './Gauge';
export { default as Glossary } from './Glossary';
export { default as Header } from './Header';
export { default as Heatmap, buildHeatmapValues } from './Heatmap';
export type { HeatmapValue, HeatmapProps } from './Heatmap';
export type { PageType } from './Header';
export { default as IntegrationGrid } from './IntegrationGrid';
export { default as ListTable } from './ListTable';
export type {
  ListTableProps,
  ListTableGroup,
  ListTableDateFormat,
  ListTableTimeBucketFormat,
  ListTablePublicGroup,
  ListTableIconContext,
  TagMapping,
} from './ListTable';
export { default as LogoGrid } from './LogoGrid';
export { default as KpiComparison } from './KpiComparison';
export { default as KPITargetActual } from './KPITargetActual';
export { default as MatrixTable, Dot } from './MatrixTable';
export { default as MetricGrid } from './MetricGrid';
export { default as MetricHeader } from './MetricHeader';
export { default as MetricsCallout } from './MetricsCallout';
export { default as Page } from './Page';
export type { PageProps, PageSize, PageMargins } from './Page';
export { default as PageBreak } from './PageBreak';
export { default as PageNo, PAGE_PLACEHOLDER, TOTAL_PLACEHOLDER } from './PageNo';
export type { PageNoProps } from './PageNo';
export { default as ProgressBar } from './ProgressBar';
export { default as ProjectSummaryCard } from './ProjectSummaryCard';
export { default as QueryResponseChat } from './QueryResponseChat';
export { default as QueryResponseExample } from './QueryResponseExample';
export { default as QueryResponseTerminal } from './QueryResponseTerminal';
export { default as RatingCategoryInput } from './RatingCategoryInput';
export { default as ScoreGauge } from './ScoreGauge';
export { default as Section } from './Section';
export { default as SecurityChecksTable } from './SecurityChecksTable';
export { default as SeverityStatCard } from './SeverityStatCard';
export { default as SocialProof } from './SocialProof';
export { default as SpecificationTable } from './SpecificationTable';
export { StarRating } from './StarRating';
export { default as StatCard } from './StatCard';
export { Status } from './Status';
export { Steps } from './Steps';
export { default as SyntaxHighlighter } from './SyntaxHighlighter';
export { default as TaskSummarySection } from './TaskSummarySection';
export { default as TerminalOutput } from './TerminalOutput';
export { default as TwoColumnSection } from './TwoColumnSection';
export { default as ValueProposition } from './ValueProposition';
export { default as VulnerabilityBreakdown } from './VulnerabilityBreakdown';

export { getColorFromString } from '../utils/colors';
export { Theme, SEVERITY_COLORS, SEVERITY_BG, HEALTH_COLORS, STATUS_COLORS, PURPOSE_COLORS } from '../utils/theme';
export type { Severity, Health, Status as StatusType, Purpose, ColorPair, TypographyStyle } from '../utils/theme';
