import type { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import { inspectDOCX } from '../office/inspect/index.js';
import { formatInspection } from '../office/inspect/format.js';

export function registerInspectCommand(program: Command): void {
  program.command('inspect <file>')
    .allowExcessArguments(false)
    .description('Inspect DOCX embedded assets, section page sizes/margins, and Word/PDF fonts without modifying the file')
    .option('--json', 'Emit machine-readable JSON instead of human-readable tables')
    .action(async (file: string, options: { json?: boolean }) => {
      try {
        const inspection = await inspectDOCX(await readFile(file));
        process.stdout.write(options.json ? JSON.stringify(inspection, null, 2) + '\n' : formatInspection(inspection));
      } catch (error) {
        process.stderr.write(`Cannot inspect ${file}: ${error instanceof Error ? error.message : String(error)}\n`);
        process.exitCode = 1;
      }
    });
}
