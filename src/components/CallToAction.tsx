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
    <section className="border border-gray-200 rounded bg-gradient-to-r from-gray-100 to-gray-50 p-6 my-8 text-center">
      <div>
        <h3 className="text-slate-900 font-semibold text-base mb-4">Ready to Get Started?</h3>
        <div className="flex gap-4 justify-center flex-wrap">
          {primaryCTA && (
            <a href={primaryCTA.url} className="bg-blue-600 text-white font-semibold rounded py-3 px-8 no-underline text-sm inline-block transition-colors hover:bg-blue-700">
              {primaryCTA.label}
            </a>
          )}
          {secondaryCTAs.map((cta, index) => (
            <a key={index} href={cta.url} className="bg-white text-blue-600 border border-blue-600 font-semibold rounded py-3 px-8 no-underline text-sm inline-block transition-all hover:bg-blue-50">
              {cta.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
