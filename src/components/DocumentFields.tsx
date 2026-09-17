import React from 'react';
import clsx from 'clsx';

export interface DocumentField {
  label: string;
  value: React.ReactNode;
}

export interface DocumentFieldsProps {
  fields: DocumentField[];
  className?: string;
}

export default function DocumentFields({ fields, className }: DocumentFieldsProps) {
  return (
    <dl
      data-document-fields="true"
      className={clsx('grid grid-cols-[max-content_1fr] gap-x-[8mm] gap-y-[2.5mm]', className)}
    >
      {fields.map((field, index) => (
        <React.Fragment key={`${field.label}-${index}`}>
          <dt className="whitespace-nowrap text-[8pt] font-semibold uppercase tracking-wide text-slate-500">
            {field.label}
          </dt>
          <dd className="whitespace-nowrap text-[9pt] text-slate-900">
            {field.value}
          </dd>
        </React.Fragment>
      ))}
    </dl>
  );
}
