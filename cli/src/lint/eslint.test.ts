import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { formatESLint } from './eslint.js';
import type { LintIssue } from './types.js';

describe('ESLint JSON formatter', () => {
  it('exports numeric counts and omits clean files and empty optional fields', () => {
    const issues: LintIssue[] = [
      { file: 'Report.tsx', line: 3, column: 7, rule: 'inline-hex-colors', severity: 'warning', message: 'Use a theme colour' },
      { file: 'Report.tsx', line: 1, rule: 'empty-page', severity: 'error', message: 'Empty page' },
    ];
    expect(JSON.parse(formatESLint({ files: ['Report.tsx', 'Clean.tsx'], issues }))).toEqual([
      {
        filePath: resolve('Report.tsx'),
        messages: [
          { ruleId: 'empty-page', level: 'error', severity: 2, message: 'Empty page', line: 1, column: 1, locations: [{ type: 'source', line: 1 }] },
          { ruleId: 'inline-hex-colors', level: 'warning', severity: 1, message: 'Use a theme colour', line: 3, column: 7, locations: [{ type: 'source', line: 3, column: 7 }] },
        ],
        errorCount: 1, fatalErrorCount: 0, warningCount: 1,
        fixableErrorCount: 0, fixableWarningCount: 0,
      },
    ]);
  });

  it('preserves native PNG locations without inventing source lines', () => {
    const issues: LintIssue[] = [{
      file: 'diagram.png', rule: 'png-line-crossing', severity: 'warning', message: 'Crossing',
      locations: [{ type: 'png', units: 'px', origin: 'top-left', image: { width: 100, height: 60 }, x: 80, y: 0 }],
    }];
    expect(JSON.parse(formatESLint({ files: ['diagram.png'], issues }))[0].messages).toEqual([
      { ruleId: 'png-line-crossing', level: 'warning', severity: 1, message: 'Crossing', locations: issues[0].locations },
    ]);
  });

  it('projects info entries as ESLint warnings and preserves zero and false metadata', () => {
    const issues: LintIssue[] = [{ file: 'report.pdf', rule: 'pdf-font', severity: 'info', message: 'Example Face',
      locations: [{ type: 'pdf', page: 1 }], data: { embedded: false, gutter: 0, unknown: null, empty: [], nested: { absent: '' } } }];
    expect(JSON.parse(formatESLint({ files: ['report.pdf'], issues }))).toEqual([{
      filePath: resolve('report.pdf'), errorCount: 0, warningCount: 1, infoCount: 1, fatalErrorCount: 0, fixableErrorCount: 0, fixableWarningCount: 0,
      messages: [{ ruleId: 'pdf-font', level: 'info', severity: 1, message: 'Example Face', locations: [{ type: 'pdf', page: 1 }], data: { embedded: false, gutter: 0 } }],
    }]);
  });

  it('exports an empty array when no files were scanned', () => {
    expect(JSON.parse(formatESLint({ files: [], issues: [] }))).toEqual([]);
  });
});
