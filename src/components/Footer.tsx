import React from 'react';
import {
  IoLogoGithub as IconGithub,
  IoLogoLinkedin as IconLinkedin,
  IoGlobeOutline as IconGlobe,
  IoDocumentTextOutline as IconDocs,
  IoMailOutline as IconMail,
  IoCallOutline as IconPhone,
} from 'react-icons/io5';

import type { PageType } from './Header';

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

export default function Footer({
  variant = 'default',
  type = 'default',
  height = 10,
  company,
  copyright,
  web,
  docs,
  email,
  phone,
  github,
  linkedin,
  children,
}: FooterProps) {
  const dataAttrs: Record<string, string | number> = { 'data-footer-type': type };
  if (height != null) dataAttrs['data-footer-height'] = height;

  if (children) {
    return <div {...dataAttrs}>{children}</div>;
  }

  const footerClass = `datasheet-footer datasheet-footer--${variant}`;
  const footerStyle: React.CSSProperties = height != null ? { height: `${height}mm`, overflow: 'hidden' } : {};
  const year = new Date().getFullYear();
  const copyrightText = copyright ?? (company ? `\u00A9 ${year} ${company}. All rights reserved.` : '');

  const icons = [
    email && { href: `mailto:${email}`, icon: <IconMail />, title: 'Email' },
    phone && { href: `tel:${phone}`, icon: <IconPhone />, title: 'Phone' },
    web && { href: web, icon: <IconGlobe />, title: 'Website' },
    docs && { href: docs, icon: <IconDocs />, title: 'Documentation' },
    github && { href: github, icon: <IconGithub />, title: 'GitHub' },
    linkedin && { href: linkedin, icon: <IconLinkedin />, title: 'LinkedIn' },
  ].filter(Boolean) as { href: string; icon: React.ReactNode; title: string }[];

  if (variant === 'minimal') {
    return (
      <footer className={footerClass} style={footerStyle} {...dataAttrs}>
        <p>{copyrightText}</p>
      </footer>
    );
  }

  if (variant === 'compact') {
    return (
      <footer className={footerClass} style={footerStyle} {...dataAttrs}>
        <div className="footer-content">
          {company && <span className="footer-brand">{company}</span>}
          {copyrightText && <span className="footer-copyright">{copyrightText}</span>}
          {web && <a href={web} className="footer-link">{web.replace(/^https?:\/\//, '')}</a>}
          {email && <a href={`mailto:${email}`} className="footer-link">{email}</a>}
          {phone && <a href={`tel:${phone}`} className="footer-link">{phone}</a>}
        </div>
      </footer>
    );
  }

  return (
    <footer className={footerClass} style={footerStyle} {...dataAttrs}>
      <div className="footer-left">
        {company && <p>{company}</p>}
        {copyrightText && <p>{copyrightText}</p>}
      </div>
      <div className="footer-right">
        {web && <p><a href={web}>{web.replace(/^https?:\/\//, '')}</a></p>}
        {icons.length > 0 && (
          <div className="footer-icons">
            {icons.map(({ href, icon, title }) => (
              <a key={title} href={href} className="footer-icon-link" title={title}>{icon}</a>
            ))}
          </div>
        )}
      </div>
    </footer>
  );
}
