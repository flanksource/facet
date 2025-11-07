import React from 'react';

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
  StarRatingComponent?: React.ComponentType<{ rating: number }>;
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
 * ```tsx
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
 * ```
 */
export default function Glossary({
  title = 'Glossary & Legend',
  terms,
  ratingScale,
  StarRatingComponent,
  legend,
  legendTitle = 'Format Legend',
  customSections,
  columns = 2,
  className = '',
}: GlossaryProps) {
  const gridClass = columns === 2 ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'space-y-6';

  return (
    <div className={`break-before-page mt-8 pt-6 border-t-2 border-gray-300 ${className}`}>
      <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>

      <div className={gridClass}>
        {/* Technical Terms Section */}
        {terms && terms.length > 0 && (
          <div>
            <h3 className="text-md font-semibold text-gray-800 mb-2">Technical Terms</h3>
            <dl className="space-y-2">
              {terms.map((item, idx) => (
                <div key={idx}>
                  <dt className="font-semibold text-sm text-gray-900">{item.term}</dt>
                  <dd className="text-xs text-gray-700 ml-4">{item.definition}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* Rating Scale Section */}
        {ratingScale && ratingScale.length > 0 && (
          <div>
            <h3 className="text-md font-semibold text-gray-800 mb-2">Rating Scale</h3>
            <dl className="space-y-2">
              {ratingScale.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <dt className="shrink-0">
                    {StarRatingComponent ? (
                      <StarRatingComponent rating={item.stars} />
                    ) : (
                      <span className="text-sm font-semibold">{item.stars} ★</span>
                    )}
                  </dt>
                  <dd className="text-xs text-gray-700">{item.meaning}</dd>
                </div>
              ))}
            </dl>

            {/* Legend subsection */}
            {legend && legend.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="text-md font-semibold text-gray-800 mb-2">{legendTitle}</h3>
                <ul className="text-xs text-gray-700 space-y-1">
                  {legend.map((item, idx) => (
                    <li key={idx}>
                      <span className="font-mono bg-gray-100 px-1">{item.example}</span> - {item.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Custom Sections */}
        {customSections &&
          customSections.map((section, idx) => (
            <div key={idx}>
              <h3 className="text-md font-semibold text-gray-800 mb-2">{section.title}</h3>
              {section.content}
            </div>
          ))}
      </div>
    </div>
  );
}
