import React from 'react';
import { resolveSizeVariant } from './utils/resolveSizeVariant';
import { AlertIcon, type AlertTone } from './utils/alertIcons';

/** The five GitHub alert tones, plus the untinted aside. */
export type CalloutVariant = AlertTone | 'default';

/**
 * CalloutBox Props
 */
export interface CalloutBoxProps {
  /** Content to display inside the callout */
  children: React.ReactNode;
  /**
   * Visual variant of the callout. The five named tones are the same set
   * `> [!NOTE]` markdown produces, and render identically to it.
   */
  variant?: CalloutVariant;
  /** Inline label in the header row. Defaults to the variant's own name. */
  label?: string;
  /**
   * Glyph to draw, named independently of `variant`. Defaults to the variant's
   * own icon. Set it when the colour and the symbol need to say different
   * things — an amber "TODO" that reads as a question, say — or to give an
   * untinted `default` callout an icon it would otherwise not draw.
   */
  icon?: AlertTone;
  /** Leading identifier chip, e.g. an annotation number. */
  badge?: string;
  /** Muted trailing attribution, e.g. a reviewer or source name. */
  source?: string;
  /** Heavier full-border treatment, for callouts that block rather than inform. */
  emphasis?: boolean;
  /** Optional block title above the body */
  title?: string;
  /** Optional CSS class name */
  className?: string;
}

/**
 * Tone styles.
 *
 * Every class is a literal string. Tailwind scans source text for class names,
 * so a built name like `bg-${tone}-50` is never generated and the callout
 * renders untinted while claiming a tone — the same trap documented in
 * examples/kitchen-sink/typography-data.ts.
 *
 * `accent` and `emphasis` are alternatives, not layers: the left rule is the
 * default treatment, and a full border replaces it for blocking callouts.
 */
const VARIANT_STYLES = {
  note: {
    accent: 'border-l-[3pt] border-l-blue-500 bg-blue-50/60 rounded-r',
    emphasis: 'border-2 border-blue-500 bg-blue-50 rounded',
    badge: 'bg-blue-600',
    label: 'text-blue-700',
    source: 'text-blue-500',
    icon: 'text-blue-600',
    title: 'text-blue-900',
    content: 'text-blue-900',
  },
  tip: {
    accent: 'border-l-[3pt] border-l-emerald-500 bg-emerald-50/60 rounded-r',
    emphasis: 'border-2 border-emerald-500 bg-emerald-50 rounded',
    badge: 'bg-emerald-600',
    label: 'text-emerald-700',
    source: 'text-emerald-600',
    icon: 'text-emerald-600',
    title: 'text-emerald-900',
    content: 'text-emerald-900',
  },
  important: {
    accent: 'border-l-[3pt] border-l-purple-500 bg-purple-50/60 rounded-r',
    emphasis: 'border-2 border-purple-500 bg-purple-50 rounded',
    badge: 'bg-purple-600',
    label: 'text-purple-700',
    source: 'text-purple-500',
    icon: 'text-purple-600',
    title: 'text-purple-900',
    content: 'text-purple-900',
  },
  warning: {
    accent: 'border-l-[3pt] border-l-amber-500 bg-amber-50/60 rounded-r',
    emphasis: 'border-2 border-amber-500 bg-amber-50 rounded',
    badge: 'bg-amber-600',
    label: 'text-amber-700',
    source: 'text-amber-600',
    icon: 'text-amber-600',
    title: 'text-amber-900',
    content: 'text-amber-900',
  },
  caution: {
    accent: 'border-l-[3pt] border-l-red-500 bg-red-50/60 rounded-r',
    emphasis: 'border-2 border-red-500 bg-red-50 rounded',
    badge: 'bg-red-600',
    label: 'text-red-700',
    source: 'text-red-500',
    icon: 'text-red-600',
    title: 'text-red-900',
    content: 'text-red-900',
  },
  default: {
    accent: 'border-l-[3pt] border-l-zinc-300 bg-zinc-50/75 rounded-r',
    emphasis: 'border-2 border-zinc-300 bg-zinc-50 rounded',
    badge: 'bg-zinc-700',
    label: 'text-zinc-700',
    source: 'text-zinc-500',
    icon: 'text-zinc-500',
    title: 'text-zinc-900',
    content: 'text-zinc-600',
  },
};

/** Header-row text matching what the markdown plugin writes for each tone. */
const VARIANT_LABELS: Record<CalloutVariant, string> = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
  default: '',
};

/**
 * CalloutBox Component
 *
 * An emphasised aside. The five named tones mirror GitHub's alert types, so a
 * document can use `<CalloutBox variant="caution">` in TSX/MDX and
 * `> [!CAUTION]` in plain markdown and get the same box either way.
 *
 * @example
 * ```tsx
 * <CalloutBox variant="note" title="Important Note">
 *   This is important information that users should know.
 * </CalloutBox>
 *
 * // Annotation style: identifier, tone label and attribution on one row
 * <CalloutBox variant="caution" badge="N14" label="Correction" source="Jonno">
 *   The two enforcement checks cannot be implemented as written.
 * </CalloutBox>
 *
 * // Label and glyph chosen independently of the tone
 * <CalloutBox variant="warning" label="TODO" icon="important">
 *   Run the first tabletop exercise and retain the record.
 * </CalloutBox>
 * ```
 */
export default function CalloutBox({
  children,
  variant = 'default',
  label,
  badge,
  source,
  icon,
  emphasis = false,
  title,
  className = '',
}: CalloutBoxProps) {
  const styles = resolveSizeVariant(variant, VARIANT_STYLES, VARIANT_STYLES.default, 'CalloutBox');
  const tone = Object.prototype.hasOwnProperty.call(VARIANT_LABELS, variant) ? variant : 'default';

  // An unlabelled `default` callout has nothing to put on the header row, so it
  // stays a plain aside rather than growing an empty bar above its text.
  const labelText = label ?? VARIANT_LABELS[tone];
  // `default` draws no glyph of its own, but an explicit `icon` still earns one.
  const glyph = icon ?? (tone === 'default' ? undefined : tone);
  const showHeader = Boolean(badge || labelText || source || glyph);

  return (
    <div className={`${emphasis ? styles.emphasis : styles.accent} p-3 my-4 ${className}`}>
      {showHeader && (
        <div className="mb-1 flex items-baseline gap-2">
          {badge && (
            <span className={`${styles.badge} rounded px-1.5 py-0.5 text-xs font-bold text-white`}>
              {badge}
            </span>
          )}
          {glyph && (
            <span className={styles.icon}>
              <AlertIcon tone={glyph} />
            </span>
          )}
          {labelText && (
            <span className={`${styles.label} text-xs font-semibold uppercase tracking-wide`}>
              {labelText}
            </span>
          )}
          {source && <span className={`${styles.source} text-xs`}>{source}</span>}
        </div>
      )}
      {title && <h3 className={`text-sm font-bold ${styles.title} mb-2`}>{title}</h3>}
      <div className={`text-sm ${styles.content} leading-snug`}>{children}</div>
    </div>
  );
}
