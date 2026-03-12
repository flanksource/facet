import clsx from 'clsx';
import CompactTable from './CompactTable';
import type { TableSize } from './CompactTable';

interface Specification {
  category: string;
  value: string | string[];
}

interface SpecificationTableProps {
  title?: string;
  specifications: Specification[];
  className?: string;
  size?: TableSize;
}

export default function SpecificationTable({ title, specifications, className, size }: SpecificationTableProps) {
  const data = specifications.map(s => [
    s.category,
    Array.isArray(s.value) ? s.value.join(', ') : s.value,
  ]);
  return (
    <section className={clsx("my-6", className)}>
      {title && <h3 className="mb-4">{title}</h3>}
      <CompactTable variant="reference" columns={["Component", "Requirement"]} data={data} size={size} />
    </section>
  );
}
