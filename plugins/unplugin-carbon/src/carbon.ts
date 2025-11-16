import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { tmpdir } from 'os';
import type { CarbonCLIOptions } from './types';

const execFileAsync = promisify(execFile);

export async function generateCarbonScreenshot(
  sourceCode: string,
  outputPath: string,
  options: CarbonCLIOptions = {}
): Promise<string> {
  const tmpInputFile = join(tmpdir(), `carbon-input-${Date.now()}.txt`);

  await writeFile(tmpInputFile, sourceCode);

  await mkdir(dirname(outputPath), { recursive: true });

  const args = [tmpInputFile, '--save-to', dirname(outputPath)];

  if (options.theme) args.push('--theme', options.theme);
  if (options.backgroundColor) args.push('--background-color', options.backgroundColor);
  if (options.windowTheme) args.push('--window-theme', options.windowTheme);
  if (options.windowControls !== undefined) args.push('--window-controls', String(options.windowControls));
  if (options.fontFamily) args.push('--font-family', options.fontFamily);
  if (options.fontSize) args.push('--font-size', options.fontSize);
  if (options.lineHeight) args.push('--line-height', options.lineHeight);
  if (options.paddingVertical) args.push('--padding-vertical', options.paddingVertical);
  if (options.paddingHorizontal) args.push('--padding-horizontal', options.paddingHorizontal);
  if (options.dropShadow !== undefined) args.push('--drop-shadow', String(options.dropShadow));
  if (options.dropShadowOffsetY) args.push('--drop-shadow-offset-y', options.dropShadowOffsetY);
  if (options.dropShadowBlurRadius) args.push('--drop-shadow-blur-radius', options.dropShadowBlurRadius);
  if (options.widthAdjustment !== undefined) args.push('--width-adjustment', String(options.widthAdjustment));
  if (options.lineNumbers !== undefined) args.push('--line-numbers', String(options.lineNumbers));
  if (options.firstLineNumber !== undefined) args.push('--first-line-number', String(options.firstLineNumber));
  if (options.exportSize) args.push('--export-size', options.exportSize);
  if (options.watermark !== undefined) args.push('--watermark', String(options.watermark));
  if (options.squaredImage !== undefined) args.push('--squared-image', String(options.squaredImage));
  if (options.language) args.push('--language', options.language);

  try {
    await execFileAsync('carbon-now', args, {
      timeout: 30000,
    });

    return outputPath;
  } catch (error) {
    throw new Error(`Failed to generate carbon screenshot: ${error instanceof Error ? error.message : String(error)}`);
  }
}
