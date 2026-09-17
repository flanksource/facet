// @live
// Hub & Spoke style: personas and systems arranged around a central platform box.
// This is the one style that uses the semantic Tailwind stage palette (blue=discover,
// amber=analyze, violet=act, emerald=Git/IaC, indigo=MCP, slate=infrastructure)
// instead of the 5-color COLORS palette. Demonstrates: step badges, the Tailwind
// className/bodyClassName BoxNode fallback, a grid-path feedback arrow, and the
// red constraint ("forbidden") arrow.
// Ported from website-migration/common/src/components/HowItWorksDiagram.tsx.
// Render: facet html hub-and-spoke.tsx -o dist
import React from 'react';
import { Page, Section, Diagram, BoxNode, Arrow, COLORS } from '@flanksource/facet';
import {
  Aws, Azure, K8S, GoogleCloud, Postgres, MissionControlWhite, Mcp, Anthropic, Openai, Gemini,
  Github, Changes, Health, Diff, Alarm, Flux, Argo, Terraform,
} from '@flanksource/icons/mi';
import { FaCheckCircle, FaBan } from 'react-icons/fa';
import { HiUserGroup, HiCommandLine, HiCog6Tooth } from 'react-icons/hi2';
import { IoPencil } from 'react-icons/io5';

type IconComponent = React.ComponentType<{ className?: string }>;

function IconGrid({ items, cols = 2, iconSize = 'w-6 h-6' }: {
  items: Array<{ Icon: IconComponent; label: string }>;
  cols?: 2 | 3;
  iconSize?: string;
}) {
  return (
    <div className={`grid ${cols === 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
      {items.map(({ Icon, label }) => (
        <div key={label} className="flex flex-col items-center">
          <Icon className={iconSize} />
          <span className="text-[10px] text-gray-600">{label}</span>
        </div>
      ))}
    </div>
  );
}

// Numbered stage badge docked with `ports` — no relative wrapper, no absolute
// positioning, no z-index. It is a `node` port because it is a circle
// straddling the border rather than the default chip; its own `-mb-3` pulls it
// down over the box. Ports sit in normal flow, so the badge reserves ~10px of
// height that the absolute version did not — harmless here, but the reason an
// overlay that must cost zero layout stays absolutely positioned.
// Pass literal Tailwind classes — Tailwind cannot extract computed class names
// like `bg-${color}-600`.
function StepBox({ step, className, bodyClassName, title, children }: {
  step: number; className: string; bodyClassName: string; title: string; children?: React.ReactNode;
}) {
  return (
    <BoxNode
      title={title}
      className={className}
      bodyClassName={bodyClassName}
      ports={[{
        position: 'top-middle',
        node: (
          <div className={`-mb-3 w-6 h-6 rounded-full ${className} flex items-center justify-center text-white font-bold text-[11px] shadow-md border-2 border-white`}>
            {step}
          </div>
        ),
      }]}
    >
      {children}
    </BoxNode>
  );
}

// The hub's internal stage row: Discover → Analyze → Playbooks.
function StagesBox() {
  return (
    <div className="flex items-start gap-6">
      <StepBox step={1} title="Discover" className="bg-blue-600" bodyClassName="bg-blue-50" />
      <StepBox step={2} title="Analyze" className="bg-amber-600" bodyClassName="bg-amber-50">
        <IconGrid iconSize="w-5 h-5" items={[
          { Icon: Changes, label: 'Changes' },
          { Icon: Health, label: 'Health' },
          { Icon: Diff, label: 'Diffs' },
          { Icon: Alarm, label: 'Alerts' },
        ]} />
      </StepBox>
      <StepBox step={3} title="Playbooks" className="bg-violet-600" bodyClassName="bg-violet-50">
        <div className="flex flex-col gap-1">
          {['Scale Pods', 'Restart Service', 'Create PR'].map((pb) => (
            <div key={pb} className="flex items-center gap-1 text-[10px] text-violet-700 px-2 py-1 bg-violet-100 rounded">
              <FaCheckCircle className="w-2 h-2 text-violet-500" />
              <span>{pb}</span>
            </div>
          ))}
        </div>
      </StepBox>
    </div>
  );
}

function MissionControlBox({ id }: { id: string }) {
  return (
    <div id={id} className="rounded-2xl overflow-hidden border-2 shadow-2xl"
      style={{ borderColor: COLORS.primary, backgroundColor: COLORS.background }}>
      <div className="px-6 py-3 text-center" style={{ backgroundColor: COLORS.primary }}>
        <div className="flex items-center justify-center gap-2">
          <MissionControlWhite className="w-6 h-6 text-white" />
          <span className="text-white text-lg font-bold tracking-wide">Mission Control</span>
        </div>
      </div>
      <div className="p-4">
        <StagesBox />
      </div>
    </div>
  );
}

function UsersBox({ id }: { id: string }) {
  const users = [
    { Icon: HiCog6Tooth, label: 'DevOps' },
    { Icon: HiCommandLine, label: 'Developers' },
    { Icon: HiUserGroup, label: 'SREs' },
  ];
  return (
    <div id={id} className="rounded-xl px-5 py-2 flex items-center gap-5 bg-slate-50 border-2 border-slate-400">
      {users.map(({ Icon, label }) => (
        <div key={label} className="flex flex-col items-center">
          <Icon className="w-5 h-5 text-gray-600" />
          <span className="text-[10px] text-gray-600 mt-0.5 font-medium">{label}</span>
        </div>
      ))}
    </div>
  );
}

function LLMModelsBox({ id }: { id: string }) {
  const models = [
    { Icon: Anthropic, label: 'Claude' },
    { Icon: Openai, label: 'GPT' },
    { Icon: Gemini, label: 'Gemini' },
  ];
  return (
    <div id={id} className="rounded-xl px-5 py-3 flex items-center gap-5 bg-green-50 border-2 border-green-500 shadow-md">
      <span className="text-sm text-gray-600 font-semibold">LLMs:</span>
      {models.map(({ Icon, label }) => (
        <div key={label} className="flex flex-col items-center">
          <Icon className="w-7 h-7" />
          <span className="text-xs text-gray-600 mt-1">{label}</span>
        </div>
      ))}
    </div>
  );
}

// Landing badge for the grid-path Apply arrow (which itself has showHead=false).
function DownArrow({ className }: { className?: string }) {
  return (
    <div className={className}>
      <svg width="16" height="12" viewBox="0 0 16 12">
        <path d="M8 12 L0 0 L16 0 Z" fill="currentColor" />
      </svg>
    </div>
  );
}

export default function HubAndSpokeDiagram() {
  return (
    <Page>
      <Section title="How It Works">
        <Diagram className="relative">
          {(id) => (
            <>
              <div className="flex flex-col items-center gap-16 py-8">
                <UsersBox id={id('users')} />

                {/* Main row: Infrastructure | hub | Git/IaC */}
                <div className="flex items-center gap-16">
                  <div className="relative">
                    <div className="absolute left-1/2 -translate-x-1/2" style={{ top: -10 }}>
                      <DownArrow className="text-emerald-500" />
                    </div>
                    <BoxNode id={id('infrastructure')} title="Infrastructure"
                      className="bg-slate-500" bodyClassName="bg-slate-100">
                      <IconGrid items={[
                        { Icon: Aws, label: 'AWS' },
                        { Icon: Azure, label: 'Azure' },
                        { Icon: K8S, label: 'K8s' },
                        { Icon: GoogleCloud, label: 'GCP' },
                        { Icon: Postgres, label: 'Databases' },
                      ]} />
                    </BoxNode>
                  </div>

                  <MissionControlBox id={id('mission-control')} />

                  <BoxNode id={id('git-iac')}
                    title={<span className="flex items-center text-lg"><Github className="mr-2 h-6 w-auto text-white fill-white" /> Git / IaC</span>}
                    className="bg-emerald-500" bodyClassName="bg-emerald-50">
                    <IconGrid items={[
                      { Icon: Flux, label: 'Flux' },
                      { Icon: Argo, label: 'Argo' },
                      { Icon: Github, label: 'Git' },
                      { Icon: Terraform, label: 'Terraform' },
                    ]} />
                  </BoxNode>
                </div>

                {/* Bottom stack: protocol + models */}
                <div className="flex flex-col items-center gap-16">
                  <BoxNode id={id('mcp-server')}
                    title={<span className="flex items-center text-lg"><Mcp className="mr-2 h-6 w-auto text-white fill-white" /> MCP Protocol</span>}
                    className="bg-indigo-500" />
                  <LLMModelsBox id={id('llms')} />
                </div>
              </div>

              {/* Main flows: animated dashed, circle heads, semantic hues */}
              <Arrow from={id('infrastructure')} to={id('mission-control')}
                color="#2563eb" strokeWidth={4} headSize={3} headShape="circle"
                startAnchor="right" endAnchor="left" />
              <Arrow from={id('mission-control')} to={id('git-iac')}
                color="#16a34a" strokeWidth={4} headSize={3} headShape="circle"
                startAnchor="right" endAnchor="left" />

              {/* GitOps feedback loop: routes over the top with a grid path; the
                  DownArrow badge on Infrastructure marks the landing point */}
              <Arrow from={id('git-iac')} to={id('infrastructure')}
                color="#16a34a" strokeWidth={2} dashness={false} showHead={false}
                startAnchor="top" endAnchor={{ position: 'top', offset: { y: -10 } }}
                path="grid" gridBreak="75%"
                labels={{
                  middle: (
                    <div className="relative bottom-4 flex items-center gap-1 bg-green-100 border border-green-300 rounded px-2 py-1 text-green-700 text-xs font-semibold">
                      <IoPencil className="h-4 w-auto" /> Apply
                    </div>
                  ),
                }}
              />

              {/* Vertical hub connections: solid, smooth */}
              <Arrow from={id('mcp-server')} to={id('mission-control')}
                color="#3b82f6" strokeWidth={3} dashness={false}
                startAnchor="top" endAnchor="bottom" path="smooth" />
              <Arrow from={id('llms')} to={id('mcp-server')}
                color="#4f46e5" strokeWidth={3} dashness={false}
                startAnchor="top" endAnchor="bottom" />

              {/* Constraint arrow: red dashed is the sanctioned "forbidden" style */}
              <Arrow from={id('llms')} to={id('infrastructure')}
                color="#ef4444" strokeWidth={2} dashness
                startAnchor="left" endAnchor="bottom"
                labels={{
                  middle: (
                    <div className="flex items-center gap-1 bg-red-100 border border-red-300 rounded px-2 py-1 text-red-700 text-xs font-semibold mb-10">
                      <FaBan className="w-3 h-3" />
                      <span>No Direct Access</span>
                    </div>
                  ),
                }}
              />
            </>
          )}
        </Diagram>
      </Section>
    </Page>
  );
}
