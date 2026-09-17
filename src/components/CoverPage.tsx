import React from 'react';
import clsx from 'clsx';
import Page from './Page';
import type { PageMargins, PageSize } from './Page';

export interface CoverPageProps {
  title: string;
  subtitle?: string;
  logo?: React.ReactNode;
  children?: React.ReactNode;
  id?: string;
  pageSize?: PageSize;
  margins?: PageMargins;
  watermark?: string;
  className?: string;
}

export default function CoverPage({
  title,
  subtitle,
  logo,
  children,
  id,
  pageSize,
  margins,
  watermark,
  className,
}: CoverPageProps) {
  return (
    <Page
      id={id}
      type="first"
      pageSize={pageSize}
      margins={margins}
      watermark={watermark}
      className={clsx(
        'flex flex-col [&>article]:flex [&>article]:flex-1 [&>article]:flex-col',
        className,
      )}
    >
      <section
        data-cover-page="true"
        className="m-0 flex flex-1 flex-col border-t-[2pt] border-slate-900 pb-[10mm] pt-[16mm]"
      >
        <div>
          {logo && <div className="mb-[28mm] flex min-h-[12mm] items-center">{logo}</div>}
          <h1 className="max-w-[165mm] text-[30pt] font-semibold leading-[36pt] tracking-tight text-slate-950">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-[6mm] max-w-[145mm] text-[14pt] leading-[20pt] text-slate-600">
              {subtitle}
            </p>
          )}
        </div>
        {children && (
          <div className="mt-auto border-t border-slate-300 pt-[7mm]">
            {children}
          </div>
        )}
      </section>
    </Page>
  );
}
