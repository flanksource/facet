// @live
import React from 'react';
import { Page, Section, Diagram, BoxNode, Arrow, NodePill, COLORS } from '@flanksource/facet';
import {
  Aws, AwsS3, Azure, GoogleCloud, K8S, Sql, Http, Folder, Git,
  Prometheus, Elastic, Pagerduty, User, TopologyWhite, Settings, Health, Config, Search,
} from '@flanksource/icons/mi';

type Platform = { icon: React.ComponentType<{ className?: string }>; label: string };

function PlatformGrid({ items }: { items: Platform[] }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map(({ icon: Icon, label }) => (
        <div key={label} className="flex flex-col items-center gap-1">
          <Icon className="w-6 h-6" />
          <span className="text-[7pt]" style={{ color: COLORS.muted }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

function TopologyBox({ id, title, icon: Icon, detail = false, bold = false, children }: {
  id: string; title: string; icon: Platform['icon']; detail?: boolean; bold?: boolean; children?: React.ReactNode;
}) {
  return (
    <BoxNode id={id} title={<span className={`flex items-center justify-center gap-2 leading-[1.2] ${detail ? 'text-[9pt]' : 'text-[10.5pt]'} ${bold ? 'font-bold' : 'font-normal'}`}>
      <Icon className="w-4 h-4 shrink-0 brightness-0 invert" /><span>{title}</span>
    </span>} headerColor={COLORS.primary}
      bodyColor={COLORS.background} minWidth="132pt" shadow="shadow-none">
      {children}
    </BoxNode>
  );
}

export default function TopologyOverview() {
  return (
    <Page pageSize="a4-landscape" margins={{ top: 8, right: 8, bottom: 8, left: 8 }} className="[font-family:Helvetica,Arial,sans-serif]">
      <Section title="Topology Overview">
        <Diagram className="w-max p-6">
          {(id) => (
            <>
              <div className="grid grid-cols-[135pt_300pt_180pt] items-start justify-center gap-x-12 gap-y-12">
                <TopologyBox id={id('teams')} title="Teams" icon={User} bold>
                  <NodePill><code className="text-[9.75pt]" style={{ fontFamily: '"Lucida Console", Monaco, monospace' }}>components: …</code></NodePill>
                </TopologyBox>

                <div className="row-span-2 rounded-xl border border-dashed p-4" style={{ borderColor: COLORS.muted }}>
                  <TopologyBox id={id('components')} title="Components" icon={TopologyWhite} />
                  <div className="grid grid-cols-2 gap-x-4 gap-y-6 pt-12">
                    <TopologyBox id={id('children')} title="Sub Components" icon={TopologyWhite} detail>
                      <NodePill><code className="text-[9.75pt]" style={{ fontFamily: '"Lucida Console", Monaco, monospace' }}>selectors: …</code></NodePill>
                    </TopologyBox>
                    <TopologyBox id={id('properties')} title="Properties" icon={Settings} detail>
                      <NodePill><code className="text-[9.75pt]" style={{ fontFamily: '"Lucida Console", Monaco, monospace' }}>properties: …</code></NodePill>
                    </TopologyBox>
                    <TopologyBox id={id('checks')} title="Health Checks" icon={Health} detail>
                      <NodePill><code className="text-[9.75pt]" style={{ fontFamily: '"Lucida Console", Monaco, monospace' }}>checks: …</code></NodePill>
                    </TopologyBox>
                    <TopologyBox id={id('configs')} title="Configuration" icon={Config} detail>
                      <NodePill><code className="text-[9.75pt]" style={{ fontFamily: '"Lucida Console", Monaco, monospace' }}>configs: …</code></NodePill>
                    </TopologyBox>
                  </div>
                </div>

                <TopologyBox id={id('lookups')} title="Lookups" icon={Search}>
                  <PlatformGrid items={[
                    { icon: K8S, label: 'Kubernetes' }, { icon: Sql, label: 'SQL' },
                    { icon: Http, label: 'HTTP' }, { icon: Folder, label: 'Files' },
                    { icon: Git, label: 'Git' },
                  ]} />
                </TopologyBox>

                <div className="self-end">
                  <TopologyBox id={id('health')} title="Health Checks" icon={Health}>
                    <PlatformGrid items={[
                      { icon: Http, label: 'HTTP' }, { icon: K8S, label: 'Kubernetes' },
                      { icon: Sql, label: 'SQL' }, { icon: Prometheus, label: 'Prometheus' },
                      { icon: Elastic, label: 'Elastic' }, { icon: Pagerduty, label: 'PagerDuty' },
                      { icon: Folder, label: 'Files' }, { icon: AwsS3, label: 'S3' },
                      { icon: Aws, label: 'AWS' }, { icon: Git, label: 'Git' },
                    ]} />
                  </TopologyBox>
                </div>

                <div className="self-end">
                  <TopologyBox id={id('configuration')} title="Configuration" icon={Config}>
                    <div className="flex flex-col gap-4">
                      <PlatformGrid items={[
                        { icon: K8S, label: 'Kubernetes' }, { icon: Aws, label: 'AWS' },
                        { icon: Azure, label: 'Azure' }, { icon: GoogleCloud, label: 'Google Cloud' },
                        { icon: Sql, label: 'SQL' }, { icon: Folder, label: 'Files' },
                        { icon: AwsS3, label: 'S3' }, { icon: Http, label: 'HTTP' },
                        { icon: Git, label: 'Git' },
                      ]} />
                      <div className="flex justify-center gap-2 text-[9pt]"><NodePill><span className="text-[9pt]">Insights</span></NodePill><NodePill><span className="text-[9pt]">Changes</span></NodePill></div>
                    </div>
                  </TopologyBox>
                </div>
              </div>
              <Arrow from={id('teams')} to={id('components')} path="straight" startAnchor="right" endAnchor="left" dashness={false} />
              <Arrow from={id('children')} to={id('components')} path="straight" startAnchor="top" endAnchor={{ position: 'bottom', offset: { x: -94 } }} dashness={false} />
              <Arrow from={id('components')} to={id('lookups')} path="straight" startAnchor="right" endAnchor={{ position: 'left', offset: { y: -60 } }} dashness={false} />
              <Arrow from={id('properties')} to={id('lookups')} path="straight" startAnchor="right" endAnchor={{ position: 'left', offset: { y: 30 } }} dashness={false} />
              <Arrow from={id('checks')} to={id('health')} path="straight" startAnchor="left" endAnchor="right" dashness={false} />
              <Arrow from={id('configs')} to={id('configuration')} path="straight" startAnchor="right" endAnchor="left" dashness={false} />
            </>
          )}
        </Diagram>
      </Section>
    </Page>
  );
}
