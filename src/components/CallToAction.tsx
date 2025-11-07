import React from 'react';

interface CTAButton {
  label: string;
  url: string;
}

interface CallToActionProps {
  primary: CTAButton;
  secondary?: CTAButton[];
  audience?: 'enterprise' | 'technical' | 'security';
}

/**
 * CallToAction Component (DS-25, DS-26)
 *
 * Displays a clear next step with primary CTA and optional secondary actions.
 * Provides audience-specific default CTAs.
 *
 * DS-25: Must include clear next steps
 * DS-26: Match CTA to audience
 *
 * Default CTAs by audience:
 * - enterprise: "Request Enterprise Trial" + "Talk to Sales"
 * - technical: "Start Free Trial" + "View Documentation"
 * - security: "Download Security Whitepaper" + "Schedule Demo"
 *
 * Usage:
 * <CallToAction
 *   primary={{ label: "Start Free Trial", url: "https://flanksource.com/trial" }}
 *   secondary={[
 *     { label: "View Documentation", url: "https://docs.flanksource.com" }
 *   ]}
 *   audience="technical"
 * />
 */
export default function CallToAction({
  primary,
  secondary,
  audience
}: CallToActionProps) {
  // Default CTAs based on audience (DS-26)
  const getDefaults = () => {
    switch (audience) {
      case 'enterprise':
        return {
          primary: { label: 'Request Enterprise Trial', url: '#' },
          secondary: [{ label: 'Talk to Sales', url: 'mailto:sales@flanksource.com' }]
        };
      case 'technical':
        return {
          primary: { label: 'Start Free Trial', url: '#' },
          secondary: [{ label: 'View Documentation', url: 'https://docs.flanksource.com' }]
        };
      case 'security':
        return {
          primary: { label: 'Download Security Whitepaper', url: '#' },
          secondary: [{ label: 'Schedule Demo', url: '#' }]
        };
      default:
        return null;
    }
  };

  const defaults = getDefaults();
  const primaryCTA = primary || defaults?.primary;
  const secondaryCTAs = secondary || defaults?.secondary || [];

  return (
    <section className="call-to-action">
      <div className="cta-content">
        <h3 className="cta-heading">Ready to Get Started?</h3>
        <div className="cta-buttons">
          {primaryCTA && (
            <a href={primaryCTA.url} className="cta-primary">
              {primaryCTA.label}
            </a>
          )}
          {secondaryCTAs.map((cta, index) => (
            <a key={index} href={cta.url} className="cta-secondary">
              {cta.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
