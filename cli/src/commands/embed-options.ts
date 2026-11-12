import { InvalidArgumentError, type Command } from 'commander';
import { parseEmbedFormat, parseEmbedSize } from '../utils/embed.js';

function commanderParser<T>(parse: (value: string) => T): (value: string) => T {
  return (value) => {
    try {
      return parse(value);
    } catch (error) {
      throw new InvalidArgumentError(error instanceof Error ? error.message : String(error));
    }
  };
}

export function addEmbedOptions(command: Command, defaultFormat: 'pdf' | 'png'): Command {
  return command
    .option('--embed-format <format>', `How diagrams and figures are inserted: pdf (vector) or png (raster) (default: ${defaultFormat})`, commanderParser(parseEmbedFormat))
    .option('--embed-size <scale>', 'Resolution of PNG captures: 1x, 2x, 3x or 4x (default: 2x)', commanderParser(parseEmbedSize));
}
