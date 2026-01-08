import React from 'react';
import * as Icons from '@flanksource/icons/mi';

interface FeatureSupport {
  enabled: boolean;
  url?: string;
}

interface Logo {
  name: string;
  title?: string;
  icon?: string | React.ComponentType<{ className?: string; title?: string }>;
  icons?: Array<string | React.ComponentType<{ className?: string; title?: string }>>;
  logo?: string;
  logoSvg?: string;
  url?: string;
  urlPath?: string;
  health?: FeatureSupport | boolean;
  configuration?: FeatureSupport | boolean;
  change?: FeatureSupport | boolean;
  playbooks?: FeatureSupport | boolean;
}

interface LogoGridProps {
  logos: Logo[];
  viewAllUrl?: string;
  title?: string;
  variant?: 'default' | 'compact' | 'table';
  baseDocsUrl?: string;
}

const ICON_MAP: Record<string, keyof typeof Icons> = {
  'Prometheus': 'Prometheus',
  'Datadog': 'Datadog',
  'ServiceNow': 'Servicenow',
  'CloudWatch': 'Cloudwatch',
  'AWS CloudTrail': 'AwsCloudtrail',
  'Azure Monitor': 'AzureLogAnalytics',
  'GCP Cloud Logging': 'GcpCloudLogging',
  'Flux': 'Flux',
  'ArgoCD': 'Argo',
  'PagerDuty': 'Pagerduty',
  'Slack': 'Slack',
  'Trivy': 'Trivy',
  'Kubernetes': 'K8S',
  'Helm': 'Helm',
  'Terraform': 'Terraform',
};

export default function LogoGrid({
  logos,
  viewAllUrl,
  title = "Integrations",
  variant = 'default',
  baseDocsUrl = 'https://flanksource.com/docs/guide'
}: LogoGridProps) {
  const getLogoUrl = (logo: Logo): string | undefined => {
    if (logo.url) return logo.url;
    if (logo.urlPath && baseDocsUrl) return `${baseDocsUrl}${logo.urlPath}`;
    return undefined;
  };

  const isFeatureEnabled = (feature?: FeatureSupport | boolean): boolean => {
    if (typeof feature === 'boolean') return feature;
    if (feature && typeof feature === 'object') return feature.enabled;
    return false;
  };

  const getFeatureUrl = (feature?: FeatureSupport | boolean): string | undefined => {
    if (!feature || typeof feature === 'boolean') return undefined;
    const featureObj = feature as FeatureSupport;
    if (!featureObj.url) return undefined;
    if (featureObj.url.startsWith('http://') || featureObj.url.startsWith('https://')) return featureObj.url;
    if (baseDocsUrl) {
      const path = featureObj.url.startsWith('/') ? featureObj.url : `/${featureObj.url}`;
      return `${baseDocsUrl}${path}`;
    }
    return undefined;
  };

  const iconClass = variant === 'compact' ? 'w-[6mm] h-[6mm] text-gray-700' : 'w-[10mm] h-[10mm] text-gray-700';

  const getIconComponent = (logo: Logo) => {
    if (logo.icon && typeof logo.icon !== 'string') {
      const IconComponent = logo.icon;
      return <IconComponent className={iconClass} title={logo.name} />;
    }

    if (logo.icon && typeof logo.icon === 'string' && logo.icon in Icons) {
      const IconComponent = Icons[logo.icon as keyof typeof Icons] as React.ComponentType<{ className?: string; title?: string }>;
      return <IconComponent className={iconClass} title={logo.name} />;
    }

    const mappedIconName = ICON_MAP[logo.name];
    if (mappedIconName && mappedIconName in Icons) {
      const IconComponent = Icons[mappedIconName] as React.ComponentType<{ className?: string; title?: string }>;
      return <IconComponent className={iconClass} title={logo.name} />;
    }

    return null;
  };

  if (variant === 'table') {
    return (
      <section className="my-4">
        {title && <h3>{title}</h3>}
        <table className="w-full border-collapse text-[9pt] leading-[12pt]">
          <thead className="bg-gray-700">
            <tr>
              <th className="text-left font-semibold text-white p-[2.5mm] text-[10pt] w-[40%]">Product</th>
              <th className="text-center font-semibold text-white p-[2.5mm] text-[10pt] w-[15%]">Health</th>
              <th className="text-center font-semibold text-white p-[2.5mm] text-[10pt] w-[15%]">Configuration</th>
              <th className="text-center font-semibold text-white p-[2.5mm] text-[10pt] w-[15%]">Change</th>
              <th className="text-center font-semibold text-white p-[2.5mm] text-[10pt] w-[15%]">Playbooks</th>
            </tr>
          </thead>
          <tbody>
            {logos.map((logo, index) => {
              const iconComponent = getIconComponent(logo);
              const logoUrl = getLogoUrl(logo);

              const iconElements = logo.icons ? (
                logo.icons.map((iconItem, iconIdx) => {
                  if (typeof iconItem === 'function' || (typeof iconItem === 'object' && iconItem !== null)) {
                    const IconComp = iconItem as React.ComponentType<{ className?: string; title?: string }>;
                    return (
                      <div key={iconIdx} className="w-[5mm] h-[5mm] flex items-center justify-center flex-shrink-0">
                        <IconComp className="w-[5mm] h-[5mm] text-gray-700" title={logo.name} />
                      </div>
                    );
                  }
                  if (typeof iconItem === 'string' && iconItem in Icons) {
                    const IconComp = Icons[iconItem as keyof typeof Icons] as React.ComponentType<{ className?: string; title?: string }>;
                    return (
                      <div key={iconIdx} className="w-[5mm] h-[5mm] flex items-center justify-center flex-shrink-0">
                        <IconComp className="w-[5mm] h-[5mm] text-gray-700" title={logo.name} />
                      </div>
                    );
                  }
                  return null;
                })
              ) : null;

              const productContent = (
                <>
                  <span className="text-gray-800 font-medium">{logo.name}</span>
                  {iconElements ? (
                    <div className="flex gap-[1.5mm] items-center">{iconElements}</div>
                  ) : iconComponent ? (
                    <div className="w-[5mm] h-[5mm] flex items-center justify-center flex-shrink-0">{iconComponent}</div>
                  ) : logo.logoSvg ? (
                    <div className="w-[5mm] h-[5mm] flex items-center justify-center flex-shrink-0" dangerouslySetInnerHTML={{ __html: logo.logoSvg }} title={logo.name} />
                  ) : logo.logo ? (
                    <img src={logo.logo} alt={logo.name} className="w-[5mm] h-[5mm] object-contain" />
                  ) : null}
                </>
              );

              const checkMark = <span className="text-green-600 font-bold text-[10pt]">✓</span>;

              return (
                <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-[2mm] align-middle">
                    {logoUrl ? (
                      <a href={logoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-[2mm] text-gray-800 no-underline hover:text-blue-600">
                        {productContent}
                      </a>
                    ) : (
                      <div className="flex items-center gap-[2mm]">{productContent}</div>
                    )}
                  </td>
                  <td className="text-center align-middle p-[2mm]">
                    {isFeatureEnabled(logo.health) && (
                      getFeatureUrl(logo.health) ? (
                        <a href={getFeatureUrl(logo.health)} target="_blank" rel="noopener noreferrer" className="text-green-600 no-underline hover:text-green-700">{checkMark}</a>
                      ) : checkMark
                    )}
                  </td>
                  <td className="text-center align-middle p-[2mm]">
                    {isFeatureEnabled(logo.configuration) && (
                      getFeatureUrl(logo.configuration) ? (
                        <a href={getFeatureUrl(logo.configuration)} target="_blank" rel="noopener noreferrer" className="text-green-600 no-underline hover:text-green-700">{checkMark}</a>
                      ) : checkMark
                    )}
                  </td>
                  <td className="text-center align-middle p-[2mm]">
                    {isFeatureEnabled(logo.change) && (
                      getFeatureUrl(logo.change) ? (
                        <a href={getFeatureUrl(logo.change)} target="_blank" rel="noopener noreferrer" className="text-green-600 no-underline hover:text-green-700">{checkMark}</a>
                      ) : checkMark
                    )}
                  </td>
                  <td className="text-center align-middle p-[2mm]">
                    {isFeatureEnabled(logo.playbooks) && (
                      getFeatureUrl(logo.playbooks) ? (
                        <a href={getFeatureUrl(logo.playbooks)} target="_blank" rel="noopener noreferrer" className="text-green-600 no-underline hover:text-green-700">{checkMark}</a>
                      ) : checkMark
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {viewAllUrl && (
          <div className="text-center mt-[3mm]">
            <a href={viewAllUrl} className="text-blue-600 font-semibold no-underline hover:underline text-[10pt]">View all integrations →</a>
          </div>
        )}
      </section>
    );
  }

  if (variant === 'compact') {
    return (
      <section className="my-[2mm]">
        <div className="flex flex-wrap gap-[2mm] items-center">
          {logos.map((logo, index) => {
            const iconComponent = getIconComponent(logo);
            const logoUrl = getLogoUrl(logo);

            const content = iconComponent ? (
              <div className="max-h-[6mm]">{iconComponent}</div>
            ) : logo.logoSvg ? (
              <div className="max-h-[6mm]" dangerouslySetInnerHTML={{ __html: logo.logoSvg }} title={logo.name} />
            ) : logo.logo ? (
              <img src={logo.logo} alt={logo.name} className="max-h-[6mm] object-contain" />
            ) : (
              <div className="text-gray-500 font-semibold text-[9pt] text-center">{logo.name}</div>
            );

            return (
              <div key={index} className="flex items-center justify-center p-[1mm] min-h-[8mm] min-w-[8mm]">
                {logoUrl ? (
                  <a href={logoUrl} target="_blank" rel="noopener noreferrer" className="focus:outline-gray-400 focus:outline-2 focus:outline-offset-2 rounded-sm">
                    {content}
                  </a>
                ) : content}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="my-[6mm]">
      {title && <h3 className="text-slate-900 font-semibold text-[14pt] mb-[4mm]">{title}</h3>}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(30mm,1fr))] gap-[4mm] mb-[4mm]">
        {logos.map((logo, index) => {
          const iconComponent = getIconComponent(logo);
          const logoUrl = getLogoUrl(logo);

          const content = (
            <>
              {logo.title && <div className="text-gray-600 text-[8pt] text-center mt-[1mm]">{logo.title}</div>}
              {iconComponent ? (
                <div className="max-w-full max-h-[10mm] object-contain flex items-center justify-center">{iconComponent}</div>
              ) : logo.logoSvg ? (
                <div className="max-w-full max-h-[10mm] object-contain flex items-center justify-center" dangerouslySetInnerHTML={{ __html: logo.logoSvg }} title={logo.name} />
              ) : logo.logo ? (
                <img src={logo.logo} alt={logo.name} className="max-w-full max-h-[10mm] object-contain" />
              ) : (
                <div className="text-gray-500 font-semibold text-[9pt] text-center">{logo.name}</div>
              )}
            </>
          );

          return (
            <div key={index} className="bg-gray-50 border border-gray-200 rounded flex flex-col items-center justify-center p-[2mm] min-h-[15mm] gap-[1mm] transition-all hover:shadow-lg hover:-translate-y-0.5">
              {logoUrl ? (
                <a href={logoUrl} target="_blank" rel="noopener noreferrer" className="focus:outline-gray-400 focus:outline-2 focus:outline-offset-2 rounded-sm">
                  {content}
                </a>
              ) : content}
            </div>
          );
        })}
      </div>
      {viewAllUrl && (
        <div className="text-center mt-[3mm]">
          <a href={viewAllUrl} className="text-blue-600 font-semibold no-underline hover:underline text-[10pt]">View all integrations →</a>
        </div>
      )}
    </section>
  );
}
