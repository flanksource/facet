import React from 'react';

interface CustomerLogo {
  name: string;
  logo: string;
}

interface Testimonial {
  quote: string;
  attribution: string;
  metric?: string;
}

interface SocialProofProps {
  logos?: CustomerLogo[];
  testimonial?: Testimonial;
}

/**
 * SocialProof Component (DS-24)
 *
 * Displays customer logos or a brief testimonial.
 * Choose ONE format: logo bar OR testimonial, not both.
 *
 * DS-24: Include one of:
 * - Customer logo bar (6-8 logos maximum)
 * - Brief customer quote (1-2 sentences)
 * - Case study reference with metric
 *
 * MUST NOT include:
 * - Long testimonials
 * - More than one quote
 * - Generic quotes without specific outcomes
 *
 * Usage (Logos):
 * <SocialProof
 *   logos={[
 *     { name: "Acme Corp", logo: "/logos/acme.svg" },
 *     { name: "Globex", logo: "/logos/globex.svg" }
 *   ]}
 * />
 *
 * Usage (Testimonial):
 * <SocialProof
 *   testimonial={{
 *     quote: "We reduced our MTTR from 4 hours to 30 minutes using Mission Control.",
 *     attribution: "John Doe, CTO at Acme Corp",
 *     metric: "87.5% reduction in MTTR"
 *   }}
 * />
 */
export default function SocialProof({ logos, testimonial }: SocialProofProps) {
  if (logos && testimonial) {
    console.warn('SocialProof: Choose either logos OR testimonial, not both (DS-24)');
  }

  if (logos && logos.length > 8) {
    console.warn('SocialProof: Should display max 6-8 customer logos (DS-24)');
  }

  return (
    <section className="social-proof">
      {logos && logos.length > 0 && (
        <div className="customer-logos">
          <p className="social-proof-label">Trusted by leading organizations</p>
          <div className="logo-grid">
            {logos.map((customer, index) => (
              <img
                key={index}
                src={customer.logo}
                alt={customer.name}
                className="customer-logo"
              />
            ))}
          </div>
        </div>
      )}

      {testimonial && (
        <div className="testimonial">
          <blockquote className="testimonial-quote">"{testimonial.quote}"</blockquote>
          <p className="testimonial-attribution">— {testimonial.attribution}</p>
          {testimonial.metric && (
            <p className="testimonial-metric">{testimonial.metric}</p>
          )}
        </div>
      )}
    </section>
  );
}
