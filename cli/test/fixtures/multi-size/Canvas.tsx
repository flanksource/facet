import React from 'react';
import { Document, Page } from '@flanksource/facet';

export default function Canvas() {
  return (
    <Document title="Campaign" pageSize="facebook-square">
      <Page id="creative">
        <h1>Build with clarity</h1>
        <p>One template. Every canvas.</p>
      </Page>
    </Document>
  );
}
