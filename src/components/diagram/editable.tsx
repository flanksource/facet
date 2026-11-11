import type { ReactNode } from 'react';

/** Extra `data-*` attributes a node forwards to its root element. */
export type DataAttributes = { [attr: `data-${string}`]: string | undefined };

const isEditableValue = (value: ReactNode): value is string | number => typeof value === 'string' || typeof value === 'number';

/** Marks the element that wraps exactly `prop`'s text, only when that text is a plain string or number. */
export function editableText(prop: string, value: ReactNode): { 'data-editable-text'?: string } {
  return isEditableValue(value) ? { 'data-editable-text': prop } : {};
}

/** Wraps plain text in a marked span so it can share an element with an icon; other nodes render untouched. */
export function EditableText({ prop, children }: { prop: string; children: ReactNode }) {
  return isEditableValue(children) ? <span data-editable-text={prop}>{children}</span> : <>{children}</>;
}
