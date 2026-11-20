import { Command, InvalidArgumentError } from 'commander';
import { readFile } from 'node:fs/promises';
import { inspectFile } from '../inspection/inventory.js';

function boolean(value: string): boolean {
  if (value !== 'true' && value !== 'false') throw new InvalidArgumentError('Expected true or false');
  return value === 'true';
}

function table(rows: Record<string, unknown>[]): string[] {
  const columns = [...new Set(rows.flatMap(row => Object.keys(row)))];
  const cell = (value: unknown): string => (value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)).replaceAll('|', '\\|').replaceAll('\n', ' ');
  return [`| ${columns.join(' | ')} |`, `| ${columns.map(() => '---').join(' | ')} |`, ...rows.map(row => `| ${columns.map(column => cell(row[column])).join(' | ')} |`)];
}

function formatInspection(result: Record<string, unknown>): string {
  const lines = [`${result.filePath} (${result.format})`];
  for (const [category, value] of Object.entries(result)) {
    if (['filePath', 'format'].includes(category)) continue;
    lines.push(`\n${category}`);
    const rows = Array.isArray(value) ? value : typeof value === 'object' && value !== null ? [value] : [{ value }];
    for (const row of rows) {
      const record = row as Record<string, unknown>;
      if (Array.isArray(record.entries)) {
        const { entries, ...metadata } = record;
        lines.push(...table([metadata]));
        if (entries.length) lines.push(...table(entries as Record<string, unknown>[]));
        if (!record.entries.length) lines.push('No entries');
      } else lines.push(...table([record]));
    }
  }
  return lines.join('\n');
}

export function registerInspectCommand(program: Command): void {
  program.command('inspect <files...>')
    .description('Inspect native fonts, colors, pages and embedded assets in PDF, PNG and DOCX files')
    .option('--fonts <boolean>', 'Include native font metadata (PNG reports unavailable)', boolean, true)
    .option('--font-position <boolean>', 'Include native font references', boolean, false)
    .option('--colors <boolean>', 'Include native colors or a grouped PNG palette', boolean, true)
    .option('--color-positions <boolean>', 'Include native color references or PNG pixel bounds', boolean, false)
    .option('--embedded-images', 'Inspect embedded images and PDF payloads')
    .option('--json', 'Export indented native inspection JSON')
    .action(async (files: string[], options) => {
      try {
        const results = [];
        for (const file of files) results.push(await inspectFile({ ...options, file, data: await readFile(file) }));
        console.log(options.json ? JSON.stringify(results, null, 2) : results.map(formatInspection).join('\n\n'));
      } catch (error) {
        console.error(`Inspection failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exitCode = options.json ? 2 : 1;
      }
    });
}
