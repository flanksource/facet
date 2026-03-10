import { mkdtemp, writeFile, readdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { rmSync } from 'fs';
import { $ } from 'bun';
import { RenderError } from './errors.js';

export interface ExtractedArchive {
  tempDir: string;
  entryFile: string;
  consumerRoot: string;
  cleanup: () => void;
}

const ENTRY_EXTENSIONS = ['.tsx', '.jsx', '.ts', '.js'];

export async function extractArchive(
  data: Buffer,
  entryFile?: string,
  maxSize = 52428800,
): Promise<ExtractedArchive> {
  if (data.byteLength > maxSize) {
    throw new RenderError('ARCHIVE_ERROR', `Archive exceeds max size (${maxSize} bytes)`, 400);
  }

  const tempDir = await mkdtemp(join(tmpdir(), 'facet-archive-'));
  const tarPath = join(tempDir, 'upload.tar.gz');
  const extractDir = join(tempDir, 'content');

  try {
    await writeFile(tarPath, data);
    await $`mkdir -p ${extractDir} && tar xzf ${tarPath} -C ${extractDir}`.quiet();

    const resolved = entryFile ?? await autoDetectEntry(extractDir);
    if (!resolved) {
      throw new RenderError('ARCHIVE_ERROR', 'No .tsx/.jsx entry file found in archive', 400);
    }

    return {
      tempDir,
      entryFile: resolved,
      consumerRoot: extractDir,
      cleanup: () => rmSync(tempDir, { recursive: true, force: true }),
    };
  } catch (err) {
    rmSync(tempDir, { recursive: true, force: true });
    if (err instanceof RenderError) throw err;
    throw new RenderError('ARCHIVE_ERROR', `Failed to extract archive: ${err}`, 400);
  }
}

async function autoDetectEntry(dir: string): Promise<string | null> {
  const files = await readdir(dir);
  for (const ext of ENTRY_EXTENSIONS) {
    const match = files.find(
      (f) => f === `index${ext}` || f === `template${ext}` || f === `main${ext}`,
    );
    if (match) return match;
  }
  for (const ext of ENTRY_EXTENSIONS) {
    const match = files.find((f) => f.endsWith(ext));
    if (match) return match;
  }
  return null;
}
