import type { FlowStepTag } from './flowTypes';

export const DEFAULT_FLOW_TAG_COLOR = '#b45309';

export function FlowTagPill({ tag }: { tag: FlowStepTag }) {
  return (
    <span
      className="inline-block whitespace-nowrap rounded-full px-1.5 align-middle text-[6.5pt] font-bold leading-[1.5]"
      data-flow-step-tag={tag.label}
      style={{ backgroundColor: tag.color ?? DEFAULT_FLOW_TAG_COLOR, color: '#ffffff' }}
    >
      {tag.label}
    </span>
  );
}
