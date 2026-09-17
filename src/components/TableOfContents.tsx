import clsx from 'clsx';

export interface TableOfContentsItemBase {
  title: string;
  level?: 1 | 2 | 3;
}

export interface AutomaticTableOfContentsItem extends TableOfContentsItemBase {
  target: string;
  page?: never;
}

export interface ExplicitTableOfContentsItem extends TableOfContentsItemBase {
  page: string | number;
  target?: never;
}

export type TableOfContentsItem = AutomaticTableOfContentsItem | ExplicitTableOfContentsItem;

export interface TableOfContentsProps {
  items: TableOfContentsItem[];
  title?: string;
  className?: string;
}

const LEVEL_CLASSES: Record<NonNullable<TableOfContentsItem['level']>, string> = {
  1: 'pl-0',
  2: 'pl-[6mm]',
  3: 'pl-[12mm]',
};

export default function TableOfContents({
  items,
  title = 'Table of contents',
  className,
}: TableOfContentsProps) {
  return (
    <section data-table-of-contents="true" className={clsx('m-0', className)}>
      <h2 className="mb-[10mm] border-b-[2pt] border-slate-900 pb-[4mm] text-[20pt] font-semibold leading-[26pt] text-slate-950">
        {title}
      </h2>
      <ol className="m-0 space-y-[3mm] p-0">
        {items.map((item, index) => {
          const automatic = 'target' in item && item.target !== undefined;
          const Entry = automatic ? 'a' : 'div';
          return (
            <li
              key={`${item.title}-${index}`}
              data-toc-level={item.level ?? 1}
              className={clsx('m-0 list-none', LEVEL_CLASSES[item.level ?? 1])}
            >
              <Entry href={automatic ? `#${item.target}` : undefined} className="flex items-end gap-[2mm] no-underline">
                <span className="min-w-0 text-[10pt] leading-[14pt] text-slate-900">{item.title}</span>
                <span aria-hidden="true" className="mb-[2.5pt] min-w-[8mm] flex-1 border-b border-dotted border-slate-400" />
                <span
                  data-facet-toc-target={automatic ? item.target : undefined}
                  className="w-[14mm] shrink-0 whitespace-nowrap text-right text-[9pt] leading-[14pt] tabular-nums text-slate-700"
                >
                  {automatic ? '—' : item.page}
                </span>
              </Entry>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
