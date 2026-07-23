import { describe, expect, it, vi } from 'vitest';
import { Logger } from './logger.js';
import { RenderTimings } from './performance.js';

describe('RenderTimings', () => {
  it('accumulates render phases and serializes them in Server-Timing order', async () => {
    let now = 100;
    const timings = new RenderTimings(() => now);

    await timings.measure('vite', async () => { now += 8.25; });
    await timings.measure('dependency-install', async () => { now += 12.34; });
    await timings.measure('vite', async () => { now += 1.25; });
    await timings.measure('tailwind', async () => { now += 3.5; });
    await timings.measure('header-generation', async () => { now += 2; });
    await timings.measure('pdf-generation', async () => { now += 30.1; });
    await timings.measure('post-processing', async () => { now += 4.5; });
    await timings.measure('timestamping', async () => { now += 6.75; });

    expect(timings.entries()).toEqual([
      { name: 'dependency-install', description: 'Dependency install', durationMs: 12.3 },
      { name: 'vite', description: 'Vite', durationMs: 9.5 },
      { name: 'tailwind', description: 'Tailwind CSS', durationMs: 3.5 },
      { name: 'header-generation', description: 'Header generation', durationMs: 2 },
      { name: 'pdf-generation', description: 'PDF generation', durationMs: 30.1 },
      { name: 'post-processing', description: 'Post-processing', durationMs: 4.5 },
      { name: 'timestamping', description: 'Timestamping', durationMs: 6.8 },
    ]);
    expect(timings.toServerTiming()).toBe(
      'dependency-install;dur=12.3;desc="Dependency install", '
      + 'vite;dur=9.5;desc="Vite", '
      + 'tailwind;dur=3.5;desc="Tailwind CSS", '
      + 'header-generation;dur=2;desc="Header generation", '
      + 'pdf-generation;dur=30.1;desc="PDF generation", '
      + 'post-processing;dur=4.5;desc="Post-processing", '
      + 'timestamping;dur=6.8;desc="Timestamping"',
    );
  });

  it('shows measured phases in CLI output', async () => {
    let now = 0;
    const timings = new RenderTimings(() => now);
    const logger = new Logger();
    const info = vi.spyOn(logger, 'info').mockImplementation(() => undefined);

    await timings.measure('dependency-install', async () => { now = 12.34; });
    await timings.measure('vite', async () => { now = 20; });
    timings.log(logger);

    expect(info).toHaveBeenCalledWith('Timings: Dependency install 12.3ms | Vite 7.7ms');
  });
});
