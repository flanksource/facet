// @live
import React from 'react';
import { Arrow, BoxNode, Diagram, Document, Page } from '@flanksource/facet';

export default function LiveOfficeDiagram() {
  return (
    <Document title="Deployment path" pageSize="a4" fontSize={10}>
      <Page margins={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <h1>Deployment path</h1>
        <p>This heading and paragraph stay editable. The measured diagram is embedded as an image.</p>
        <Diagram className="p-8">
          {(id) => (
            <div className="flex items-center justify-between gap-16">
              <BoxNode id={id('source')} title="Source" className="w-64 bg-blue-600" bodyClassName="bg-blue-50">Approved change</BoxNode>
              <BoxNode id={id('target')} title="Deployment" className="w-64 bg-green-600" bodyClassName="bg-green-50">Running service</BoxNode>
              <Arrow from={id('source')} to={id('target')} />
            </div>
          )}
        </Diagram>
      </Page>
    </Document>
  );
}
