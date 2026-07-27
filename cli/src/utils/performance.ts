import { performance } from 'node:perf_hooks';
import type { Logger } from './logger.js';

const RENDER_PHASES = [
  { name: 'dependency-install', description: 'Dependency install' },
  { name: 'vite', description: 'Vite' },
  { name: 'tailwind', description: 'Tailwind CSS' },
  { name: 'header-generation', description: 'Header generation' },
  { name: 'pdf-generation', description: 'PDF generation' },
  { name: 'post-processing', description: 'Post-processing' },
  { name: 'timestamping', description: 'Timestamping' },
] as const;

export type RenderTimingPhase = typeof RENDER_PHASES[number]['name'];

export interface RenderTimingEntry {
  name: RenderTimingPhase;
  description: string;
  durationMs: number;
}

export class RenderTimings {
  private readonly durations = new Map<RenderTimingPhase, number>();

  constructor(private readonly now: () => number = performance.now.bind(performance)) {}

  async measure<T>(phase: RenderTimingPhase, action: () => Promise<T>): Promise<T> {
    const startedAt = this.now();
    try {
      return await action();
    } finally {
      this.durations.set(phase, (this.durations.get(phase) ?? 0) + this.now() - startedAt);
    }
  }

  entries(): RenderTimingEntry[] {
    return RENDER_PHASES.flatMap(({ name, description }) => {
      const duration = this.durations.get(name);
      return duration == null ? [] : [{ name, description, durationMs: Number(duration.toFixed(1)) }];
    });
  }

  toServerTiming(): string {
    return this.entries()
      .map(({ name, description, durationMs }) => `${name};dur=${durationMs};desc="${description}"`)
      .join(', ');
  }

  log(logger: Logger): void {
    const summary = this.entries()
      .map(({ description, durationMs }) => `${description} ${durationMs}ms`)
      .join(' | ');
    if (summary) logger.info(`Timings: ${summary}`);
  }
}

interface StageMeasurement {
  stage: string;
  durationMs: number;
  rssMb: number;
  heapUsedMb: number;
}

/** Lightweight opt-in stage profiler. Enable with FACET_PROFILE=1. */
export class RenderProfiler {
  private readonly enabled = process.env['FACET_PROFILE'] === '1';
  private readonly startedAt = performance.now();
  private readonly measurements: StageMeasurement[] = [];

  constructor(
    private readonly operation: string,
    private readonly logger: Logger,
  ) {}

  async measure<T>(stage: string, action: () => Promise<T>): Promise<T> {
    if (!this.enabled) return action();
    const startedAt = performance.now();
    try {
      return await action();
    } finally {
      const memory = process.memoryUsage();
      this.measurements.push({
        stage,
        durationMs: performance.now() - startedAt,
        rssMb: memory.rss / 1024 / 1024,
        heapUsedMb: memory.heapUsed / 1024 / 1024,
      });
    }
  }

  finish(): void {
    if (!this.enabled) return;
    const profile = {
      operation: this.operation,
      totalDurationMs: Number((performance.now() - this.startedAt).toFixed(1)),
      pid: process.pid,
      stages: this.measurements.map((item) => ({
        ...item,
        durationMs: Number(item.durationMs.toFixed(1)),
        rssMb: Number(item.rssMb.toFixed(1)),
        heapUsedMb: Number(item.heapUsedMb.toFixed(1)),
      })),
    };
    this.logger.log(`[FACET_PROFILE] ${JSON.stringify(profile)}`);
  }
}
