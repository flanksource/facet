import {
  Arrow,
  BoxNode,
  COLORS,
  Diagram,
  NodeSection,
  Page,
  Section,
} from '@flanksource/facet';

const nodeNames = ['source', 'processor', 'output'];

export function PipelineDiagram() {
  return (
    <Page>
      <Section title="Pipeline">
        <Diagram className="relative">
          {(id) => (
            <>
              <div className="flex items-center justify-center gap-16 py-10" style={{ minWidth: 1080 }}>
                {nodeNames.map((name) => (
                  <BoxNode
                    bodyColor={COLORS.background}
                    borderColor={COLORS.primary}
                    compact
                    headerColor={COLORS.primary}
                    id={id(name)}
                    key={name}
                    minWidth="180px"
                    title={name}
                  >
                    <NodeSection items={['One', 'Two', 'Three']} title="Key elements" />
                  </BoxNode>
                ))}
              </div>
              <Arrow
                endAnchor="left"
                from={id('source')}
                labels={{ middle: <span>Process</span> }}
                path="straight"
                startAnchor="right"
                to={id('processor')}
              />
              <Arrow
                endAnchor="left"
                from={id('processor')}
                path="straight"
                startAnchor="right"
                to={id('output')}
                variant="secondary"
              />
            </>
          )}
        </Diagram>
      </Section>
    </Page>
  );
}
