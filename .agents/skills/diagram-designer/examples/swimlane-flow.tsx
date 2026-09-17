// @live
// Swimlane flow: numbered actions advance left-to-right across actor lanes.
// Render: facet png swimlane-flow.tsx -o dist --width 1400
import React from 'react';
import { COLORS, FlowDiagram, Page, Section } from '@flanksource/facet';
import { FiCheckCircle, FiDatabase, FiSend, FiUser } from 'react-icons/fi';

const lanes = [
  { key: 'requester', label: 'Requester', detail: 'Supplies the evidence', icon: FiUser, color: COLORS.primary },
  { key: 'manager', label: 'Approver', detail: 'Records the decision', icon: FiCheckCircle, color: COLORS.pk },
  { key: 'operator', label: 'Operator', detail: 'Applies the approved change', icon: FiSend, color: COLORS.accent },
  { key: 'system', label: 'System', detail: 'Enforces the new state', icon: FiDatabase, color: COLORS.outputBorder },
] as const;

const steps = [
  { key: 'submit', lane: 'requester', column: 1, number: 1, action: 'Submit request', detail: 'Evidence attached' },
  { key: 'review', lane: 'manager', column: 2, number: 2, action: 'Review request', detail: 'Approve or return' },
  { key: 'prepare', lane: 'operator', column: 3, number: 3, action: 'Prepare change', detail: 'Use approved input' },
  { key: 'apply', lane: 'operator', column: 4, number: 4, action: 'Apply change', detail: 'Record audit reference' },
  { key: 'enforce', lane: 'system', column: 5, number: 5, action: 'Enforce state', detail: 'Invalidate old access' },
  { key: 'confirm', lane: 'manager', column: 6, number: 6, action: 'Confirm outcome', detail: 'Reconcile and close', fullColor: true },
] as const;

const edges = [
  { from: 'submit', to: 'review' },
  { from: 'review', to: 'prepare' },
  { from: 'prepare', to: 'apply' },
  { from: 'apply', to: 'enforce' },
  { from: 'enforce', to: 'confirm' },
] as const;

export default function SwimlaneFlowExample() {
  return (
    <Page pageSize="a4-landscape">
      <Section title="Approval and provisioning flow">
        <FlowDiagram lanes={lanes} steps={steps} edges={edges} columns={6} stepOffsetMm={30} />
      </Section>
    </Page>
  );
}
