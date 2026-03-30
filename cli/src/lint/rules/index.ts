import type { LintRule } from '../types.js';
import { hardcodedPageBreak } from './hardcoded-page-break.js';
import { inlineHexColors } from './inline-hex-colors.js';
import { mixedUnits } from './mixed-units.js';
import { inlineStyleLayout } from './inline-style-layout.js';
import { conflictingTailwind } from './conflicting-tailwind.js';
import { conflictingPrintCss } from './conflicting-print-css.js';
import { pageStructure } from './page-structure.js';

export const allRules: LintRule[] = [
  hardcodedPageBreak,
  inlineHexColors,
  mixedUnits,
  inlineStyleLayout,
  conflictingTailwind,
  conflictingPrintCss,
  pageStructure,
];
