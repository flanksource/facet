import React from 'react';
import * as Icons from '@flanksource/icons/mi';

interface FeatureSupport {
  enabled: boolean;
  url?: string; // Relative path or full URL for this feature
}

interface Integration {
  name: string;
  title?: string;
  icon?: string | React.ComponentType<{ className?: string; title?: string }>;
  icons?: Array<string | React.ComponentType<{ className?: string; title?: string }>>; // Multiple icons for combined integrations
  logo?: string;
  logoSvg?: string;
  url?: string; // Product-level URL
  urlPath?: string; // Product-level relative path to append to baseDocsUrl
  health?: FeatureSupport | boolean;
  configuration?: FeatureSupport | boolean;
  change?: FeatureSupport | boolean;
  playbooks?: FeatureSupport | boolean;
}

interface IntegrationGridProps {
  integrations: Integration[];
  viewAllUrl?: string;
  title?: string;
  variant?: 'default' | 'compact' | 'table';
  baseDocsUrl?: string; // Base URL for documentation links (e.g., "https://flanksource.com/docs/guide")
}

// Map integration names to icon component names
const INTEGRATION_ICON_MAP: Record<string, keyof typeof Icons> = {
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



/**
 * IntegrationGrid Component (DS-19, DS-21)
 *
 * Displays vendor logos in a grid format (4-6 per row), compact inline format,
 * or table format with feature matrix.
 *
 * DS-19: List specific tools, not categories
 * DS-21: Use vendor logos, max 12-16 logos, include "View all" link
 *
 * Usage (default):
 * <IntegrationGrid
 *   title="Integrations"
 *   integrations={[
 *     { name: "Prometheus" },
 *     { name: "Datadog" },
 *     { name: "ServiceNow" }
 *   ]}
 *   viewAllUrl="/integrations"
 * />
 *
 * Usage (compact):
 * <IntegrationGrid
 *   variant="compact"
 *   integrations={[
 *     { name: "AWS", icon: IconAws },
 *     { name: "Kubernetes", icon: IconK8s }
 *   ]}
 * />
 *
 * Usage (table - simple boolean):
 * <IntegrationGrid
 *   variant="table"
 *   title="Integration Capabilities"
 *   integrations={[
 *     { name: "Prometheus", health: true, configuration: false, change: false, playbooks: true },
 *     { name: "Datadog", health: true, configuration: true, change: true, playbooks: true }
 *   ]}
 * />
 *
 * Usage (table - with feature-specific URLs):
 * <IntegrationGrid
 *   variant="table"
 *   title="Integration Capabilities"
 *   baseDocsUrl="https://flanksource.com/docs/guide"
 *   integrations={[
 *     {
 *       name: "Prometheus",
 *       urlPath: "/config-db/scrapers/prometheus",
 *       health: { enabled: true, url: "/canary-checker/scrapers/prometheus" },
 *       configuration: { enabled: false },
 *       change: { enabled: false },
 *       playbooks: { enabled: true, url: "/playbooks/prometheus" }
 *     },
 *     {
 *       name: "Kubernetes",
 *       urlPath: "/config-db/scrapers/kubernetes",
 *       health: { enabled: true, url: "/canary-checker/scrapers/kubernetes" },
 *       configuration: { enabled: true, url: "/config-db/scrapers/kubernetes" },
 *       change: { enabled: true, url: "/config-db/concepts/change" },
 *       playbooks: { enabled: true, url: "/playbooks/kubernetes" }
 *     }
 *   ]}
 * />
 *
 * URL Priority:
 * - Product URL: integration.url > baseDocsUrl + integration.urlPath > no link
 * - Feature URL: feature.url (full URL) > baseDocsUrl + feature.url (relative) > no link
 * - Features can have their own documentation links separate from the product link
 */
export default function IntegrationGrid({
  integrations,
  viewAllUrl,
  title = "Integrations",
  variant = 'default',
  baseDocsUrl = 'https://flanksource.com/docs/guide'
}: IntegrationGridProps) {
  if (integrations.length > 16 && variant === 'default') {
    console.warn(
      'IntegrationGrid: Should display max 12-16 logos (DS-21). Consider filtering to most important integrations.'
    );
  }

  /**
   * Get the full URL for an integration
   * Priority: url > baseDocsUrl + urlPath > null
   */
  const getIntegrationUrl = (integration: Integration): string | undefined => {
    if (integration.url) {
      return integration.url;
    }
    if (integration.urlPath && baseDocsUrl) {
      return `${baseDocsUrl}${integration.urlPath}`;
    }
    return undefined;
  };

  /**
   * Check if a feature is enabled
   * Supports both boolean and FeatureSupport object
   */
  const isFeatureEnabled = (feature?: FeatureSupport | boolean): boolean => {
    if (typeof feature === 'boolean') {
      return feature;
    }
    if (feature && typeof feature === 'object') {
      return feature.enabled;
    }
    return false;
  };

  /**
   * Get the URL for a specific feature
   * Priority: feature.url (full URL) > baseDocsUrl + feature.url (relative path) > null
   */
  const getFeatureUrl = (feature?: FeatureSupport | boolean): string | undefined => {
    if (!feature || typeof feature === 'boolean') {
      return undefined;
    }

    const featureObj = feature as FeatureSupport;
    if (!featureObj.url) {
      return undefined;
    }

    // If URL starts with http/https, it's a full URL
    if (featureObj.url.startsWith('http://') || featureObj.url.startsWith('https://')) {
      return featureObj.url;
    }

    // Otherwise, it's a relative path
    if (baseDocsUrl) {
      const path = featureObj.url.startsWith('/') ? featureObj.url : `/${featureObj.url}`;
      return `${baseDocsUrl}${path}`;
    }

    return undefined;
  };

  const getIconComponent = (integration: Integration) => {
    // If icon is a React component, use it directly
    if (integration.icon && typeof integration.icon !== 'string') {
      const IconComponent = integration.icon;
      return <IconComponent className={`integration-logo-icon ${variant === 'compact' ? 'compact' : ''}`} title={integration.name} />;
    }

    // If icon is a string, try to load from @flanksource/icons/mi
    if (integration.icon && typeof integration.icon === 'string') {
      if (integration.icon in Icons) {
        const IconComponent = Icons[integration.icon as keyof typeof Icons] as React.ComponentType<{
          className?: string;
          title?: string;
        }>;
        return <IconComponent className={`integration-logo-icon ${variant === 'compact' ? 'compact' : ''}`} title={integration.name} />;
      }
    }

    // Try mapped name
    const mappedIconName = INTEGRATION_ICON_MAP[integration.name];
    if (mappedIconName && mappedIconName in Icons) {
      const IconComponent = Icons[mappedIconName] as React.ComponentType<{
        className?: string;
        title?: string;
      }>;
      return <IconComponent className={`integration-logo-icon ${variant === 'compact' ? 'compact' : ''}`} title={integration.name} />;
    }

    return null;
  };

  // Table variant for feature matrix
  if (variant === 'table') {
    return (
      <section className="integration-table-container">
        {title && <h3>{title}</h3>}
        <table className="integration-table">
          <thead>
            <tr>
              <th className="integration-table-product">Product</th>
              <th className="integration-table-feature">Health</th>
              <th className="integration-table-feature">Configuration</th>
              <th className="integration-table-feature">Change</th>
              <th className="integration-table-feature">Playbooks</th>
            </tr>
          </thead>
          <tbody>
            {integrations.map((integration, index) => {
              const iconComponent = getIconComponent(integration);
              const integrationUrl = getIntegrationUrl(integration);

              // Render multiple icons if icons array is provided
              const iconElements = integration.icons ? (
                integration.icons.map((iconItem, iconIdx) => {
                  if (typeof iconItem === 'function' || (typeof iconItem === 'object' && iconItem !== null)) {
                    const IconComp = iconItem as React.ComponentType<{ className?: string; title?: string }>;
                    return (
                      <div key={iconIdx} className="integration-table-icon">
                        <IconComp className="integration-logo-icon" title={integration.name} />
                      </div>
                    );
                  }
                  if (typeof iconItem === 'string' && iconItem in Icons) {
                    const IconComp = Icons[iconItem as keyof typeof Icons] as React.ComponentType<{
                      className?: string;
                      title?: string;
                    }>;
                    return (
                      <div key={iconIdx} className="integration-table-icon">
                        <IconComp className="integration-logo-icon" title={integration.name} />
                      </div>
                    );
                  }
                  return null;
                })
              ) : null;

              const productContent = (
                <>
                  <span className="integration-table-name">{integration.name}</span>
                  {iconElements ? (
                    <div className="integration-table-icons-group">
                      {iconElements}
                    </div>
                  ) : iconComponent ? (
                    <div className="integration-table-icon">
                      {iconComponent}
                    </div>
                  ) : integration.logoSvg ? (
                    <div
                      className="integration-table-icon"
                      dangerouslySetInnerHTML={{ __html: integration.logoSvg }}
                      title={integration.name}
                    />
                  ) : integration.logo ? (
                    <img
                      src={integration.logo}
                      alt={integration.name}
                      className="integration-table-icon"
                    />
                  ) : null}

                </>
              );

              return (
                <tr key={index}>
                  <td className="integration-table-product-cell">
                    {integrationUrl ? (
                      <a href={integrationUrl} target="_blank" rel="noopener noreferrer" className="integration-table-product-content integration-table-link">
                        {productContent}
                      </a>
                    ) : (
                      <div className="integration-table-product-content">
                        {productContent}
                      </div>
                    )}
                  </td>
                  <td className="integration-table-feature-cell">
                    {isFeatureEnabled(integration.health) && (
                      getFeatureUrl(integration.health) ? (
                        <a href={getFeatureUrl(integration.health)} target="_blank" rel="noopener noreferrer" className="integration-check-link">
                          <span className="integration-check">✓</span>
                        </a>
                      ) : (
                        <span className="integration-check">✓</span>
                      )
                    )}
                  </td>
                  <td className="integration-table-feature-cell">
                    {isFeatureEnabled(integration.configuration) && (
                      getFeatureUrl(integration.configuration) ? (
                        <a href={getFeatureUrl(integration.configuration)} target="_blank" rel="noopener noreferrer" className="integration-check-link">
                          <span className="integration-check">✓</span>
                        </a>
                      ) : (
                        <span className="integration-check">✓</span>
                      )
                    )}
                  </td>
                  <td className="integration-table-feature-cell">
                    {isFeatureEnabled(integration.change) && (
                      getFeatureUrl(integration.change) ? (
                        <a href={getFeatureUrl(integration.change)} target="_blank" rel="noopener noreferrer" className="integration-check-link">
                          <span className="integration-check">✓</span>
                        </a>
                      ) : (
                        <span className="integration-check">✓</span>
                      )
                    )}
                  </td>
                  <td className="integration-table-feature-cell">
                    {isFeatureEnabled(integration.playbooks) && (
                      getFeatureUrl(integration.playbooks) ? (
                        <a href={getFeatureUrl(integration.playbooks)} target="_blank" rel="noopener noreferrer" className="integration-check-link">
                          <span className="integration-check">✓</span>
                        </a>
                      ) : (
                        <span className="integration-check">✓</span>
                      )
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {viewAllUrl && (
          <div className="integration-view-all">
            <a href={viewAllUrl}>View all integrations →</a>
          </div>
        )}
      </section>
    );
  }

  const containerClass = variant === 'compact' ? 'integration-grid-compact' : 'integration-grid';
  const logosClass = variant === 'compact' ? 'integration-logos-compact' : 'integration-logos';
  const itemClass = variant === 'compact' ? 'integration-item-compact' : 'integration-item';

  return (
    <section className={containerClass}>
      {title && variant === 'default' && <h3 className="integration-title">{title}</h3>}
      <div className={logosClass}>
        {integrations.map((integration, index) => {
          const iconComponent = getIconComponent(integration);
          const integrationUrl = getIntegrationUrl(integration);

          const content = (
            <>
              {integration.title && variant === 'default' && (
                <div className="integration-item-title">{integration.title}</div>
              )}
              {iconComponent ? (
                <div className="integration-logo">
                  {iconComponent}
                </div>
              ) : integration.logoSvg ? (
                <div
                  className="integration-logo"
                  dangerouslySetInnerHTML={{ __html: integration.logoSvg }}
                  title={integration.name}
                />
              ) : integration.logo ? (
                <img
                  src={integration.logo}
                  alt={integration.name}
                  className="integration-logo"
                />
              ) : (
                <div className="integration-logo-text">{integration.name}</div>
              )}

            </>
          );

          return (
            <div key={index} className={itemClass}>
              {integrationUrl ? (
                <a href={integrationUrl} target="_blank" rel="noopener noreferrer" className="integration-link">
                  {content}
                </a>
              ) : (
                content
              )}
            </div>
          );
        })}
      </div>
      {viewAllUrl && variant === 'default' && (
        <div className="integration-view-all">
          <a href={viewAllUrl}>View all integrations →</a>
        </div>
      )}
    </section>
  );
}
