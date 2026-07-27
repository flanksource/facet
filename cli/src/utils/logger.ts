import chalk from 'chalk';

export class Logger {
  private readonly level: number;

  constructor(verbose: boolean | number = false) {
    this.level = typeof verbose === 'number' ? Math.max(0, verbose) : (verbose ? 1 : 0);
  }

  isVerbose(): boolean {
    return this.level >= 1;
  }

  verbosity(): number {
    return this.level;
  }

  info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  success(message: string): void {
    console.log(chalk.green('✓'), message);
  }

  error(message: string): void {
    console.error(chalk.red('✗'), message);
  }

  warn(message: string): void {
    console.warn(chalk.yellow('⚠'), message);
  }

  debug(message: string): void {
    if (this.level >= 1) {
      console.log(chalk.gray('[DEBUG]'), message);
    }
  }

  log(message: string): void {
    console.log(message);
  }
}
