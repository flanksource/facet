import React from 'react';

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
export default function ComparisonTable({
  pros,
  cons,
  prosTitle = "Pros",
  consTitle = "Cons"
}: ComparisonTableProps) {
  return (
    <div className="flex flex-row gap-4 my-4">
      {/* Pros Column */}
      <div className="rounded-lg bg-green-50 p-4 pt-4 pb-6 w-1/2" style={{
        border: "1px solid #10b981"
      }}>
        <div className="w-full justify-center flex mb-3">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h4 className="mb-3 text-center font-semibold text-gray-900">{prosTitle}</h4>
        <ul className="ml-4 flex list-disc flex-col gap-y-2 text-sm">
          {pros.map((pro, index) => (
            <li key={index}>{pro}</li>
          ))}
        </ul>
      </div>

      {/* Cons Column */}
      <div className="rounded-lg border-gray-300 bg-gray-50 p-4 pt-4 pb-6 w-1/2" style={{
        border: "1px solid #d1d5db"
      }}>
        <div className="w-full justify-center flex mb-3">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6b7280"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>
        <h4 className="mb-3 text-center font-semibold text-gray-900">{consTitle}</h4>
        <ul className="ml-4 flex list-disc flex-col gap-y-2 text-sm">
          {cons.map((con, index) => (
            <li key={index}>{con}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
