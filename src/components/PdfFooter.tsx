import React from 'react';
import IconGithub from '~icons/ion/logo-github';
import IconLinkedin from '~icons/ion/logo-linkedin';
import IconGlobe from '~icons/ion/globe-outline';
import IconDocs from '~icons/ion/document-text-outline';
import IconMail from '~icons/ion/mail-outline';


interface PdfFooterProps {
  generatedDate: string;
}

/**
 * PDF Footer Component for Puppeteer
 *
 * This component is specifically designed for Puppeteer's footerTemplate option.
 * It uses inline styles and Puppeteer's special classes for page numbering.
 *
 * Puppeteer Special Classes:
 * - .pageNumber - automatically replaced with current page number
 * - .totalPages - automatically replaced with total page count
 *
 * Important: Must use inline styles (no external CSS)
 */
export default function PdfFooter({ generatedDate }: PdfFooterProps) {
  // Inline styles for Puppeteer compatibility
  const containerStyle = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 20px',
    fontSize: '10px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#666',
    borderTop: '1px solid #e0e0e0',
    boxSizing: 'border-box' as const,
  };

  const leftStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  };

  const copyrightStyle = {
    fontSize: '8px',
    color: '#999',
  };

  const pageNumberStyle = {
    color: '#2980f3',
    display: 'flex',
    flexDirection: 'column' as const,
    // gap: '2px',
  };

  return (
    <div style={containerStyle} className='bg-red-300'>
      <div style={leftStyle}>
        <a href="https://flanksource.com">flanksource.com</a>
      </div>
      <div style={pageNumberStyle}>
        {/* Page <span className="pageNumber"></span> of <span className="totalPages"></span> */}
        <div style={{
          color: '#999',

        }}>

        </div>
        <div className="footer-icons">

          <a href="mailto:hello@flanksource.com" className="footer-icon-link" title="Email">
            <IconMail />
          </a>
          <a href="https://flanksource.com" className="footer-icon-link" title="Website">
            <IconGlobe />
          </a>
          <a href="https://docs.flanksource.com" className="footer-icon-link" title="Documentation">
            <IconDocs />
          </a>
          <a href="https://github.com/flanksource" className="footer-icon-link" title="GitHub">
            <IconGithub />
          </a>
          <a href="https://www.linkedin.com/company/flanksource" className="footer-icon-link" title="LinkedIn">
            <IconLinkedin />
          </a>
        </div>
      </div>
    </div>
  );
}
