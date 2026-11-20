// @live
import React, { useLayoutEffect, useState } from 'react';
import { Arrow, BoxNode, Diagram, Document, Page } from '@flanksource/facet';

export default function ResponsiveCanvas() {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => { setWidth(window.innerWidth); }, []);
  return (
    <Document title="Responsive campaign" pageSize="facebook-square">
      <Page id="creative">
        <div data-mounted-width={width}>
          <h1>Build with clarity</h1>
          <Diagram>
            {(id) => (
              <div className="flex justify-between gap-4">
                <BoxNode id={id('source')} title="Create" className="w-24" />
                <BoxNode id={id('target')} title="Share" className="w-24" />
                <Arrow from={id('source')} to={id('target')} />
              </div>
            )}
          </Diagram>
        </div>
      </Page>
    </Document>
  );
}
