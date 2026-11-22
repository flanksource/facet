import chalk from 'chalk';

const stages = ['prepare', 'install', 'node', 'browser', 'packages', 'publish'] as const;

export function createRuntimeBuildProgress(output: NodeJS.WritableStream, colors: Pick<typeof chalk.stderr, 'cyan' | 'dim' | 'green'> = chalk.stderr) {
  function writeStage(completed: number, message: string, color: (text: string) => string) {
    const filled = color('='.repeat(completed));
    const remaining = colors.dim('-'.repeat(stages.length - completed));
    output.write(`[${filled}${remaining}] ${color(`${completed}/${stages.length}`)}  ${color(message)}\n`);
  }

  return {
    output,
    stage(stage: typeof stages[number], message: string) {
      writeStage(stages.indexOf(stage), message, colors.cyan);
    },
    detail(message: string) {
      output.write(`  ${colors.dim(message)}\n`);
    },
    done(message: string) {
      writeStage(stages.length, message, colors.green);
    },
  };
}

export type RuntimeBuildProgress = ReturnType<typeof createRuntimeBuildProgress>;
