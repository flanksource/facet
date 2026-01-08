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
    <section className="bg-gray-50 rounded my-6 p-5">
      {logos && logos.length > 0 && (
        <div>
          <p className="text-gray-500 font-semibold uppercase text-xs text-center mb-3 tracking-wide">Trusted by leading organizations</p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(6rem,1fr))] gap-4 items-center">
            {logos.map((customer, index) => (
              <img
                key={index}
                src={customer.logo}
                alt={customer.name}
                className="max-w-full max-h-8 object-contain opacity-70 grayscale"
              />
            ))}
          </div>
        </div>
      )}

      {testimonial && (
        <div className="p-4">
          <blockquote className="text-gray-700 italic text-sm leading-4 mb-3">"{testimonial.quote}"</blockquote>
          <p className="text-gray-500 font-semibold text-xs mb-2">— {testimonial.attribution}</p>
          {testimonial.metric && (
            <p className="text-blue-600 font-bold text-sm">{testimonial.metric}</p>
          )}
        </div>
      )}
    </section>
  );
}
