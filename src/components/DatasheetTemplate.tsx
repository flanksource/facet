import Document, { type DocumentProps } from './Document';

/** @deprecated Use {@link DocumentProps}. */
export type DatasheetTemplateProps = DocumentProps;
export type { DocumentProps };

/**
 * @deprecated Use `Document` instead. This is a pure alias — it spreads its
 * props into `Document` and adds nothing — and two names for one component
 * leaves every template author guessing which is the real one. It stays
 * exported so published consumers keep working; every template, example and
 * doc in this repo now uses `Document`.
 *
 * Migration is a rename, nothing more:
 *
 * ```tsx
 * -<DatasheetTemplate title="Report">…</DatasheetTemplate>
 * +<Document title="Report">…</Document>
 * ```
 */
export default function DatasheetTemplate(props: DocumentProps) {
  return <Document {...props} />;
}
