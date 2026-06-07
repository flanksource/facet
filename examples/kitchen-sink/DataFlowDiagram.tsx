import React from 'react';
import { Page, Section, Diagram, BoxNode, Arrow, NodeSection, COLORS } from '@flanksource/facet';

/**
 * A node-and-arrow data-flow diagram. Render with the live path:
 *
 *   facet html DataFlowDiagram.tsx --live
 *   facet pdf  DataFlowDiagram.tsx --live
 *
 * The arrows are drawn by react-xarrows, which measures the live DOM — so this
 * template only renders correctly through the --live (Vite dev server) path.
 */
export default function DataFlowDiagram() {
  return (
    <Page>
      <Section title="Data Flow">
        <Diagram className="relative">
          {(id) => (
            <>
              <div className="flex items-center justify-center gap-16 py-10">
                <BoxNode
                  id={id('source')}
                  title="Source"
                  headerColor={COLORS.primary}
                  bodyColor={COLORS.background}
                  borderColor={COLORS.primary}
                  minWidth="160px"
                >
                  <NodeSection title="Inputs" items={['Kubernetes', 'AWS', 'GitHub']} />
                </BoxNode>

                <BoxNode
                  id={id('mc')}
                  title="Mission Control"
                  headerColor={COLORS.accent}
                  bodyColor={COLORS.background}
                  borderColor={COLORS.accent}
                  minWidth="180px"
                >
                  <NodeSection title="Catalog" items={['Configs', 'Health', 'Changes']} />
                </BoxNode>

                <BoxNode
                  id={id('report')}
                  title="Report"
                  headerColor={COLORS.outputBorder}
                  bodyColor={COLORS.background}
                  borderColor={COLORS.outputBorder}
                  minWidth="160px"
                >
                  <NodeSection title="Outputs" items={['PDF', 'HTML']} />
                </BoxNode>
              </div>

              <Arrow variant="primary" start={id('source')} end={id('mc')} startAnchor="right" endAnchor="left" />
              <Arrow variant="primary" start={id('mc')} end={id('report')} startAnchor="right" endAnchor="left" />
            </>
          )}
        </Diagram>
      </Section>
    </Page>
  );
}
