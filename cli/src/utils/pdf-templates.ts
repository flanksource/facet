/**
 * PDF Template Utilities
 *
 * Helper functions for PDF generation, including variant titles and filenames.
 * Adapted from scripts/pdf-templates.js
 */

/**
 * Get human-readable title for each datasheet variant
 */
export function getVariantTitle(variant: string): string {
  const titles: Record<string, string> = {
    architecture: 'Mission Control - Architecture',
    idp: 'Mission Control - Internal Developer Platform',
    mcp: 'Mission Control - MCP Server',
    gitops: 'Mission Control - GitOps',
    jit: 'Mission Control - Just-in-Time Access',
    security: 'Flanksource - Security Report',
    'kitchen-sink': 'Mission Control - Complete Feature Set',
    'poc-eval': 'Mission Control - POC Evaluation',
    billing: 'Flanksource - Billing Report',
  };

  return titles[variant] || `Mission Control - ${variant.charAt(0).toUpperCase() + variant.slice(1)}`;
}

/**
 * Format date as human-readable string
 */
export function formatDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Generate PDF filename from variant
 * Format: "Flanksource {Title}.pdf"
 */
export function getPdfFilename(variant: string): string {
  let title = getVariantTitle(variant);

  // Security and Billing already have "Flanksource" prefix
  if (!title.startsWith('Flanksource')) {
    title = `Flanksource ${title}`;
  }

  return `${title}.pdf`;
}
