import React from 'react';
import {
  IoLogoGithub as IconGithub,
  IoLogoLinkedin as IconLinkedin,
  IoGlobeOutline as IconGlobe,
  IoDocumentTextOutline as IconDocs,
  IoMailOutline as IconMail
} from 'react-icons/io5';

interface FooterProps {
  variant?: 'default' | 'compact' | 'minimal';
}

/**
 * Footer Component
 *
 * Renders the datasheet footer with configurable styling variants.
 *
 * Variants:
 * - 'default': Two-column layout with generous padding (current design)
 * - 'compact': Single-line layout on desktop, reduced padding and font size
 * - 'minimal': Copyright only, centered, minimal visual weight
 *
 * Usage:
 * <Footer variant="default" />
 * <Footer variant="compact" />
 * <Footer variant="minimal" />
 */
export default function Footer({ variant = 'default' }: FooterProps) {
  const footerClass = `datasheet-footer datasheet-footer--${variant}`;

  if (variant === 'minimal') {
    return (
      <footer className={footerClass}>
        <p>© 2025 Flanksource. All rights reserved.</p>
      </footer>
    );
  }

  if (variant === 'compact') {
    return (
      <footer className={footerClass}>
        <div className="footer-content">
          <span className="footer-brand">Flanksource</span>
          <span className="footer-copyright">© 2025 Flanksource. All rights reserved.</span>
          <a href="https://flanksource.com" className="footer-link">
            flanksource.com
          </a>
          <a href="mailto:hello@flanksource.com" className="footer-link">
            hello@flanksource.com
          </a>
        </div>
      </footer>
    );
  }

  return (
    <footer className={footerClass}>
      <div className="footer-left">
        <p>Flanksource</p>
        <p>© 2025 Flanksource. All rights reserved.</p>
      </div>
      <div className="footer-right">
        <p>
          <a href="https://flanksource.com">flanksource.com</a>
        </p>
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
    </footer>
  );
}
