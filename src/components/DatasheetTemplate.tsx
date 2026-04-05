import Document, { type DocumentProps } from './Document';

export type DatasheetTemplateProps = DocumentProps;
export type { DocumentProps };

export default function DatasheetTemplate(props: DocumentProps) {
  return <Document {...props} />;
}
