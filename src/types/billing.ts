import type { ReactNode } from 'react';

export interface TaskSummary {
  theme: string;
  status: string;
  description: string;
  commits?: {
    count: number;
    additions?: number;
    deletions?: number;
  };
  notes?: string | ReactNode;
  achievements?: string[];
}
