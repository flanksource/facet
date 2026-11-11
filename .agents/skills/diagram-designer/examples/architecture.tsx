// @live
import React from 'react';
import { Page, Section, Diagram, BoxNode, Arrow, COLORS } from '@flanksource/facet';
import {
  Copilot, Openai, Anthropic, Mcp, K8S, Flux, Argo, Aws, Azure, GoogleCloud,
  AzureDevops, Gitlab, Prometheus, Sql, Elastic, Terraform, Slack, Teams, Postgres,
  Ai, Playbook, Health, Brain, ConfigDbWhite, PostgresWhite, Settings, Http, Alarm,
} from '@flanksource/icons/mi';

function IntegrationGrid({ items }: {
  items: Array<{ icon: React.ComponentType<{ className?: string }>; label: string }>;
}) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map(({ icon: Icon, label }) => (
        <div key={label} className="flex flex-col items-center gap-1">
          <Icon className="w-7 h-7" />
          <span className="text-[7pt]" style={{ color: COLORS.muted }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

function ArchitectureBox({ id, title, icon: Icon, titleClassName = 'text-[11.25pt] font-bold', children }: {
  id: string; title: string; icon: React.ComponentType<{ className?: string }>; titleClassName?: string; children?: React.ReactNode;
}) {
  return (
    <BoxNode id={id} title={<span className={`flex items-center justify-center gap-2 leading-[1.2] ${titleClassName}`}>
      <Icon className="w-4 h-4 shrink-0 brightness-0 invert" /><span>{title}</span>
    </span>} headerColor={COLORS.primary}
      bodyColor={COLORS.background} shadow="shadow-none">
      {children}
    </BoxNode>
  );
}

export default function Architecture() {
  return (
    <Page pageSize="a4-landscape" margins={{ top: 8, right: 8, bottom: 8, left: 8 }} className="[font-family:Helvetica,Arial,sans-serif]">
      <Section title="Mission Control Architecture">
        <Diagram className="w-max p-6">
          {(id) => (
            <>
              <div className="flex items-center justify-center gap-12">
                <ArchitectureBox id={id('agents')} title="AI Clients" icon={Ai}>
                  <div className="flex flex-col gap-6">
                    {[
                      { Icon: Copilot, label: 'Copilot' }, { Icon: Openai, label: 'OpenAI' },
                      { Icon: Anthropic, label: 'Claude' },
                    ].map(({ Icon, label }) => (
                      <div key={label} className="flex flex-col items-center gap-1">
                        <Icon className="w-8 h-8" /><span className="text-[8pt]" style={{ color: COLORS.muted }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </ArchitectureBox>

                <ArchitectureBox id={id('mcp')} title="MCP Server" icon={Mcp} titleClassName="text-[10.5pt] font-normal">
                  <div className="flex justify-center py-8"><Mcp className="w-8 h-8" /></div>
                </ArchitectureBox>

                <div className="w-[225pt] shrink-0 rounded-xl border border-dashed p-4" style={{ borderColor: COLORS.muted }}>
                  <div className="flex flex-col gap-4">
                    <ArchitectureBox id={id('playbooks')} title="Playbooks" icon={Playbook} />
                    <ArchitectureBox id={id('health')} title="Health Checks" icon={Health} />
                    <ArchitectureBox id={id('rag')} title="Real-Time RAG" icon={Brain} titleClassName="text-[10.5pt] font-bold" />
                    <ArchitectureBox id={id('catalog')} title="Unified Catalog" icon={ConfigDbWhite} />
                    <div className="grid grid-cols-2 gap-4">
                      <BoxNode title={<span className="flex items-center justify-center gap-2 text-[10.5pt] font-normal leading-[1.2]"><PostgresWhite className="w-4 h-4 shrink-0" />Postgres</span>} headerColor={COLORS.muted} bodyColor={COLORS.background} shadow="shadow-none">
                        <div className="flex justify-center"><Postgres className="w-6 h-6" /></div>
                      </BoxNode>
                      <BoxNode title={<span className="flex items-center justify-center gap-2 text-[10.5pt] font-normal leading-[1.2]"><K8S className="w-4 h-4 shrink-0" />K8s CRDs</span>} headerColor={COLORS.muted} bodyColor={COLORS.background} shadow="shadow-none">
                        <div className="flex justify-center"><K8S className="w-6 h-6" /></div>
                      </BoxNode>
                    </div>
                  </div>
                </div>

                <div className="flex w-[195pt] shrink-0 flex-col gap-6">
                  <ArchitectureBox id={id('actions')} title="Automation Targets" icon={Settings}>
                    <IntegrationGrid items={[
                      { icon: K8S, label: 'Kubernetes' }, { icon: Flux, label: 'Flux' }, { icon: Argo, label: 'Argo CD' },
                    ]} />
                  </ArchitectureBox>
                  <ArchitectureBox id={id('cloud')} title="Cloud & Delivery" icon={Http}>
                    <IntegrationGrid items={[
                      { icon: Aws, label: 'AWS' }, { icon: Azure, label: 'Azure' }, { icon: GoogleCloud, label: 'Google Cloud' },
                      { icon: AzureDevops, label: 'Azure DevOps' }, { icon: Gitlab, label: 'GitLab' },
                    ]} />
                  </ArchitectureBox>
                  <ArchitectureBox id={id('signals')} title="Telemetry & Collaboration" icon={Alarm}>
                    <IntegrationGrid items={[
                      { icon: Prometheus, label: 'Prometheus' }, { icon: Sql, label: 'SQL' }, { icon: Elastic, label: 'Elastic' },
                      { icon: Terraform, label: 'Terraform' }, { icon: Slack, label: 'Slack' }, { icon: Teams, label: 'Teams' },
                    ]} />
                  </ArchitectureBox>
                </div>
              </div>
              <Arrow from={id('agents')} to={id('mcp')} path="straight" startAnchor="right" endAnchor="left" />
              <Arrow from={id('mcp')} to={id('rag')} path="straight" startAnchor="right" endAnchor="left" />
              <Arrow from={id('playbooks')} to={id('actions')} path="straight" startAnchor="right" endAnchor="left" />
              <Arrow from={id('cloud')} to={id('health')} path="straight" startAnchor="left" endAnchor="right" />
              <Arrow from={id('signals')} to={id('catalog')} path="straight" startAnchor="left" endAnchor="right" />
            </>
          )}
        </Diagram>
      </Section>
    </Page>
  );
}
