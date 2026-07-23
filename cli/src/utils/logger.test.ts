import { describe, expect, it } from 'vitest';
import { Logger } from './logger.js';

describe('Logger verbosity', () => {
  it('maps boolean construction onto levels', () => {
    expect(new Logger().verbosity()).toBe(0);
    expect(new Logger(false).isVerbose()).toBe(false);
    expect(new Logger(true).verbosity()).toBe(1);
    expect(new Logger(true).isVerbose()).toBe(true);
  });

  it('keeps counted levels and clamps negatives', () => {
    expect(new Logger(0).isVerbose()).toBe(false);
    expect(new Logger(3).verbosity()).toBe(3);
    expect(new Logger(3).isVerbose()).toBe(true);
    expect(new Logger(-2).verbosity()).toBe(0);
  });
});
