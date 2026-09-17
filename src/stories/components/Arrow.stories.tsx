import type { Meta, StoryObj } from '@storybook/react';
import { UiDatabase, UiGlobe, UiKey } from '@flanksource/clicky-ui/icons';
import {
  Arrow,
  BoxNode,
  COLORS,
  Diagram,
  NodeSection,
} from '../../components/diagram';
import type { ArrowProps, ArrowVariant, IdFn } from '../../components/diagram';

function ArrowLabel({ children }: { children: string }) {
  return (
    <span
      className="rounded px-2 py-1 text-[9px] font-semibold"
      style={{ backgroundColor: COLORS.background, border: `1px solid ${COLORS.primary}`, color: COLORS.accent }}
    >
      {children}
    </span>
  );
}

function renderNodes(id: IdFn, targetOffset = 0) {
  return (
    <div className="flex items-center justify-center gap-20 px-6 py-10">
      <BoxNode id={id('source')} title="Source" headerColor={COLORS.primary} bodyColor={COLORS.background} minWidth="150px" shadow="shadow-none">
        <NodeSection title="Input" items={['Events']} />
      </BoxNode>
      <div style={{ transform: targetOffset ? `translateY(${targetOffset}px)` : undefined }}>
        <BoxNode id={id('target')} title="Target" headerColor={COLORS.outputBorder} bodyColor={COLORS.background} borderColor={COLORS.outputBorder} minWidth="150px" shadow="shadow-none">
          <NodeSection title="Output" items={['Records']} />
        </BoxNode>
      </div>
    </div>
  );
}

const meta = {
  title: 'Diagram/Arrow',
  component: Arrow,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  args: {
    from: 'source',
    to: 'target',
    variant: 'primary',
    path: 'straight',
    startAnchor: 'right',
    endAnchor: 'left',
    headShape: 'arrow1',
    tailShape: 'arrow1',
    labelPosition: 'center',
    showHead: true,
    showTail: false,
  },
  argTypes: {
    from: { table: { disable: true } },
    to: { table: { disable: true } },
    variant: { control: 'select', options: ['primary', 'secondary', 'er', 'bidirectional'] },
    path: { control: 'select', options: ['straight', 'smooth', 'grid'] },
    startAnchor: { control: 'select', options: ['auto', 'left', 'right', 'top', 'bottom'] },
    endAnchor: { control: 'select', options: ['auto', 'left', 'right', 'top', 'bottom'] },
    headShape: { control: 'select', options: ['arrow1', 'heart', 'circle'] },
    tailShape: { control: 'select', options: ['arrow1', 'heart', 'circle'] },
    labelPosition: { control: 'select', options: ['center', 'top', 'bottom'] },
    color: { control: 'color' },
    lineColor: { control: 'color' },
    headColor: { control: 'color' },
    tailColor: { control: 'color' },
    labels: { control: false },
    dashness: { control: false },
  },
} satisfies Meta<typeof Arrow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: {
    labels: { middle: <ArrowLabel>Events</ArrowLabel> },
  },
  render: (args) => (
    <Diagram>{(id) => <>{renderNodes(id)}<Arrow {...args} from={id('source')} to={id('target')} /></>}</Diagram>
  ),
};

const variants: ArrowVariant[] = ['primary', 'secondary', 'er', 'bidirectional'];
const markerShapes = [
  { label: 'Arrow', shape: 'arrow1' },
  { label: 'Heart', shape: 'heart' },
  { label: 'Circle', shape: 'circle' },
  {
    label: 'Custom diamond',
    shape: {
      svgElem: <polygon points="0.5,0 1,0.5 0.5,1 0,0.5" />,
      offsetForward: 0,
    },
  },
] satisfies Array<{ label: string; shape: NonNullable<ArrowProps['headShape']> }>;

export const Variants: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-8">
      {variants.map((variant) => (
        <section key={variant} className="rounded-lg border p-4" style={{ borderColor: COLORS.muted }}>
          <h3 className="mb-2 text-sm font-bold capitalize" style={{ color: COLORS.accent }}>{variant}</h3>
          <Diagram>{(id) => <>{renderNodes(id)}<Arrow from={id('source')} to={id('target')} path="straight" variant={variant} /></>}</Diagram>
        </section>
      ))}
    </div>
  ),
};

export const MarkerShapes: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-8">
      {markerShapes.map(({ label, shape }) => (
        <section key={label} className="rounded-lg border p-4" style={{ borderColor: COLORS.muted }}>
          <h3 className="mb-2 text-sm font-bold" style={{ color: COLORS.accent }}>{label}</h3>
          <Diagram>{(id) => <>
            {renderNodes(id)}
            <Arrow from={id('source')} to={id('target')} dashness={false} headShape={shape} path="straight" showTail tailShape={shape} />
          </>}</Diagram>
        </section>
      ))}
    </div>
  ),
};

const labelPositions = ['start', 'middle', 'end'] as const;

export const LabelPositions: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      {labelPositions.map((position) => (
        <section key={position} className="rounded-lg border p-4" style={{ borderColor: COLORS.muted }}>
          <h3 className="mb-2 text-sm font-bold capitalize" style={{ color: COLORS.accent }}>{position}</h3>
          <Diagram>{(id) => <>
            {renderNodes(id)}
            <Arrow from={id('source')} to={id('target')} labels={{ [position]: <ArrowLabel>{position}</ArrowLabel> }} path="straight" />
          </>}</Diagram>
        </section>
      ))}
    </div>
  ),
};

export const LabelSides: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      {(['top', 'center', 'bottom'] as const).map((labelPosition) => (
        <section key={labelPosition} className="rounded-lg border p-4" style={{ borderColor: COLORS.muted }}>
          <h3 className="mb-2 text-sm font-bold capitalize" style={{ color: COLORS.accent }}>{labelPosition}</h3>
          <Diagram>{(id) => <>
            {renderNodes(id)}
            <Arrow from={id('source')} to={id('target')} labelPosition={labelPosition} labels={{ middle: <ArrowLabel>{labelPosition}</ArrowLabel> }} path="straight" />
          </>}</Diagram>
        </section>
      ))}
    </div>
  ),
};

export const PathsAndLabels: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <Diagram>{(id) => <>{renderNodes(id)}<Arrow from={id('source')} to={id('target')} endAnchor="left" labels={{ middle: <ArrowLabel>Straight</ArrowLabel> }} path="straight" startAnchor="right" /></>}</Diagram>
      <Diagram>{(id) => <>{renderNodes(id)}<Arrow from={id('source')} to={id('target')} endAnchor="left" labels={{ middle: <ArrowLabel>Smooth</ArrowLabel> }} path="smooth" startAnchor="right" variant="secondary" /></>}</Diagram>
      <Diagram>{(id) => <>{renderNodes(id, 48)}<Arrow from={id('source')} to={id('target')} endAnchor="left" gridBreak="65%" labels={{ middle: <ArrowLabel>Grid</ArrowLabel> }} path="grid" startAnchor="right" /></>}</Diagram>
    </div>
  ),
};

export const PortEndpoint: Story = {
  render: () => (
    <Diagram className="relative">
      {(id) => (
        <>
          <div className="flex items-center justify-center gap-24 px-8 py-12">
            <BoxNode
              id={id('client')}
              title={(
                <span className="flex items-center justify-center gap-2">
                  <UiGlobe className="h-4 w-4" />
                  Client
                </span>
              )}
              headerColor={COLORS.primary}
              bodyColor={COLORS.background}
              minWidth="160px"
            >
              <NodeSection title="Requests" items={['Orders']} />
            </BoxNode>
            <BoxNode
              id={id('service')}
              title={(
                <span className="flex items-center justify-center gap-2">
                  <UiDatabase className="h-4 w-4" />
                  Service
                </span>
              )}
              headerColor={COLORS.outputBorder}
              bodyColor={COLORS.background}
              borderColor={COLORS.outputBorder}
              minWidth="180px"
              ports={[{
                id: id('service-api'),
                position: 'left-middle',
                icon: UiKey,
                label: 'HTTPS',
              }]}
            >
              <NodeSection title="Endpoints" items={['Create order']} />
            </BoxNode>
          </div>
          <Arrow
            from={id('client')}
            to={id('service-api')}
            path="straight"
            startAnchor="right"
            endAnchor="left"
            labels={{ middle: <ArrowLabel>POST</ArrowLabel> }}
          />
        </>
      )}
    </Diagram>
  ),
};
