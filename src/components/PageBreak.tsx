import React from 'react';

/**
 * PageBreak Component
 *
 * Inserts a page break for PDF generation and print layouts.
 * Uses CSS page-break-after property to ensure content after this component
 * starts on a new page.
 *
 * @example
 * ```tsx
 * <Page>
 *   <Content1 />
 * </Page>
 * <PageBreak />
 * <Page>
 *   <Content2 />
 * </Page>
 * ```
 */
export default function PageBreak() {
  return <div className="page-break" />;
}
