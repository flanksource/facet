import React from 'react';
import { IoLogoGithub as IconGithub } from 'react-icons/io5';

/**
 * Grid layout for platform components with shields and GitHub links
 *
 * @param {Object} props
 * @param {Array} props.items - Array of platform items
 */
export default function PlatformGrid({ items }) {
  return (
    <div className="grid gap-4 mb-8">
      {items.map((item, index) => (
        <div
          key={index}
          className="grid grid-cols-[auto_1fr_auto] gap-4 items-center border-b border-gray-200 pb-4 last:border-b-0"
        >
          {/* Platform Info Column (3 cols equivalent) */}
          <div className="flex items-start gap-3 col-span-2">
            {/* Icon */}
            {item.icon && (
              <div className="flex-shrink-0 mt-0.5">
                <item.icon className="w-6 h-6 text-gray-700" />
              </div>
            )}

            {/* Name and Description */}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 mb-1">
                {item.name}
              </div>
              <div className="text-sm text-gray-600 leading-snug">
                {item.subtitle}
              </div>
            </div>
          </div>

          {/* Shields Column (2 cols equivalent) */}
          <div className="flex items-center gap-2 justify-end">
            {item.shields}
            {item.githubUrl && (
              <a
                href={item.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center text-gray-600 hover:text-blue-600 transition-colors"
                aria-label={`View ${item.name} on GitHub`}
              >
                <IconGithub className="w-5 h-5" />
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
