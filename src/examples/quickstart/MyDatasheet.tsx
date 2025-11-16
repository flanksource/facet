import React from 'react';
import {
  DatasheetTemplate,
  Header,
  Page,
  StatCard,
  Section,
  BulletList,
  CallToAction
} from '@facet';

export default function MyDatasheet() {
  return (
    <DatasheetTemplate>
      <Header
        title="Mission Control Platform"
        subtitle="Cloud-Native Observability & Incident Management"
      />

      <Page>
        <Section title="Key Metrics">
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Response Time" value="< 2min" />
            <StatCard label="Uptime" value="99.99%" />
            <StatCard label="Incidents Resolved" value="1,247" />
          </div>
        </Section>

        <Section title="Key Features">
          <BulletList items={[
            'Real-time incident detection and alerting',
            'Automated runbook execution',
            'Multi-cloud observability',
            'Integrated ChatOps workflows',
            'Custom dashboard builder',
            'Advanced analytics and reporting'
          ]} />
        </Section>

        <Section title="Why Mission Control?">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold mb-2">Reduce MTTR</h3>
              <p className="text-sm text-gray-700">
                Automated incident response reduces mean time to resolution by 70%
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2">Unified Platform</h3>
              <p className="text-sm text-gray-700">
                Single pane of glass for all your observability needs
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2">Enterprise Ready</h3>
              <p className="text-sm text-gray-700">
                SOC2 compliant with enterprise-grade security
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2">Scalable</h3>
              <p className="text-sm text-gray-700">
                Handles millions of events per second
              </p>
            </div>
          </div>
        </Section>

        <CallToAction
          title="Get Started Today"
          description="Schedule a demo to see Mission Control in action"
          buttonText="Book Demo"
          buttonUrl="https://flanksource.com/demo"
        />
      </Page>
    </DatasheetTemplate>
  );
}
