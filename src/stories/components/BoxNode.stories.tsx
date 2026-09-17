import type { Meta, StoryObj } from '@storybook/react';
import { UiClock, UiGlobe, UiKey, UiShieldCheck } from '@flanksource/clicky-ui/icons';
import { BoxNode, COLORS, NodeSection } from '../../components/diagram';
import type { PortPosition } from '../../components/diagram';

const meta = {
  title: 'Diagram/BoxNode',
  component: BoxNode,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text', description: 'Header content (string or node)' },
    headerColor: { control: 'color', description: 'Header background; white text renders on top' },
    bodyColor: { control: 'color', description: 'Body background — always a light tint' },
    borderColor: { control: 'color', description: 'Border color; defaults to the header color' },
    minWidth: { control: 'text', description: 'Minimum box width, e.g. "200px"' },
    compact: { control: 'boolean', description: 'Tighter padding for dense diagrams' },
    shadow: { control: 'text', description: 'Tailwind shadow class; "shadow-none" for print' },
    ports: { control: false, description: 'Chips docked onto the box border' },
  },
} satisfies Meta<typeof BoxNode>;

export default meta;
type Story = StoryObj<typeof meta>;

const palette = {
  headerColor: COLORS.primary,
  bodyColor: COLORS.background,
  borderColor: COLORS.primary,
};

/**
 * A plain node. With no ports, the bordered box is the root element and the
 * markup is unchanged from before ports existed.
 */
export const Default: Story = {
  args: {
    ...palette,
    title: 'Service',
    minWidth: '180px',
    children: <NodeSection title="Endpoints" items={['Orders', 'Returns']} />,
  },
};

export const LayoutVariants: Story = {
  args: { ...palette, title: 'Service' },
  render: (args) => (
    <div className="flex flex-wrap items-start gap-8 p-4">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: COLORS.muted }}>
          Default
        </span>
        <BoxNode {...args} minWidth="180px">
          <NodeSection title="Endpoints" items={['Orders', 'Returns']} />
        </BoxNode>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: COLORS.muted }}>
          Compact
        </span>
        <BoxNode {...args} compact minWidth="180px">
          <NodeSection title="Endpoints" items={['Orders', 'Returns']} />
        </BoxNode>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: COLORS.muted }}>
          Print safe
        </span>
        <BoxNode {...args} minWidth="180px" shadow="shadow-none">
          <NodeSection title="Endpoints" items={['Orders', 'Returns']} />
        </BoxNode>
      </div>
    </div>
  ),
};

/**
 * The two port shapes from the design: a content-width chip centred on the top
 * edge and a full-width chip carrying a URL in a second colour. A long label
 * clips rather than wraps.
 */
export const Ports: Story = {
  args: {
    ...palette,
    title: 'Service',
    minWidth: '220px',
    children: <NodeSection title="Endpoints" items={['Orders', 'Returns']} />,
    ports: [
      { position: 'top-middle', icon: UiKey, label: 'JSON' },
      {
        position: 'bottom-left',
        size: '100%',
        icon: UiGlobe,
        label: 'https://api-svc.local/v2/orders',
        color: COLORS.outputBorder,
      },
    ],
  },
};

/**
 * All twelve positions. `size` is the extent along the docked edge, so a
 * percentage is a width on the top and bottom edges and a height on the left
 * and right ones.
 */
export const AllPositions: Story = {
  args: { ...palette, title: 'Service' },
  render: (args) => (
    <div className="flex flex-wrap gap-16 p-12">
      {(['top', 'bottom', 'left', 'right'] as const).map((edge) => {
        const aligns = edge === 'top' || edge === 'bottom'
          ? (['left', 'middle', 'right'] as const)
          : (['top', 'middle', 'bottom'] as const);
        return (
          <div key={edge} className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: COLORS.muted }}>
              {edge}
            </span>
            <BoxNode
              {...args}
              minWidth="200px"
              ports={aligns.map((align) => ({
                position: `${edge}-${align}` as PortPosition,
                label: align,
                icon: UiShieldCheck,
              }))}
            >
              <NodeSection title="Ports" items={aligns.map(String)} />
            </BoxNode>
          </div>
        );
      })}
    </div>
  ),
};

/**
 * `size` on each edge: a half-width tab, a full-width tab, and a full-height
 * rail. Percentages resolve against the box itself.
 */
export const Sizing: Story = {
  args: { ...palette, title: 'Service' },
  render: (args) => (
    <div className="flex flex-wrap gap-16 p-12">
      <BoxNode {...args} minWidth="220px" ports={[{ position: 'top-middle', size: '50%', label: '50%' }]}>
        <NodeSection title="Size" items={['50% width']} />
      </BoxNode>
      <BoxNode {...args} minWidth="220px" ports={[{ position: 'top-left', size: '100%', label: '100%' }]}>
        <NodeSection title="Size" items={['full width']} />
      </BoxNode>
      <BoxNode
        {...args}
        minWidth="220px"
        ports={[{ position: 'left-top', size: '100%', icon: UiClock, color: COLORS.muted }]}
      >
        <NodeSection title="Size" items={['full height rail']} />
      </BoxNode>
    </div>
  ),
};

/**
 * `node` replaces the icon-and-label chip entirely — this is how the numbered
 * stage badge in the hub-and-spoke layout is built.
 */
export const CustomNode: Story = {
  args: {
    ...palette,
    title: 'Discover',
    minWidth: '180px',
    children: <NodeSection title="Stage" items={['Scan', 'Index']} />,
    ports: [
      {
        position: 'top-middle',
        node: (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[11px] shadow-md border-2 border-white"
            style={{ backgroundColor: COLORS.accent }}
          >
            1
          </div>
        ),
      },
    ],
  },
};
