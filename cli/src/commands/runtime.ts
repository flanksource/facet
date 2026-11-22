import type { Command } from 'commander';
import { createRuntimeBuildProgress } from '../runtime/build-progress.js';
import { listNamedRuntimes, deleteNamedRuntime } from '../runtime/named.js';
import { sharedRuntimeCacheRoot } from '../runtime/workspace.js';

export function registerRuntimeCommands(program: Command): void {
  const runtime = program.command('runtime').description('Manage prebuilt Facet rendering runtimes');
  runtime.command('list').description('List installed runtimes and build metadata')
    .option('--json', 'Print runtime metadata as JSON')
    .option('--selectors', 'Print only name@version selectors')
    .action(({ json, selectors }) => {
      const rows = listNamedRuntimes().map(({ name, version, builtAt, git, root }) => ({ selector: `${name}@${version}`, name, version, builtAt, path: root, git }));
      if (json) console.log(JSON.stringify(rows, null, 2));
      else if (rows.length === 0) {
        console.error('No named Facet runtimes installed.');
        console.error('Build one from a project directory with `facet runtime build my-runtime`.');
      } else if (selectors) {
        for (const row of rows) console.log(row.selector);
      } else {
        const width = Math.max('Runtime'.length, ...rows.map(row => row.selector.length));
        console.log(`${'Runtime'.padEnd(width)}  ${'Last built (UTC)'.padEnd(24)}  Git`);
        for (const { selector, builtAt, git } of rows) {
          const revision = git ? `${git.commit?.slice(0, 12) ?? 'No commits'} (${git.dirty ? 'dirty' : 'clean'})` : 'Unknown';
          console.log(`${selector.padEnd(width)}  ${new Date(builtAt).toISOString()}  ${revision}`);
        }
      }
    });
  runtime.command('build <name> [project-dir]').description('Build a runtime from a project package.json')
    .option('--version <version>', 'Runtime version (defaults to the project version)')
    .action(async (name: string, project = '.', { version }: { version?: string }) => {
      const { buildNamedRuntime } = await import('../runtime/build-named.js');
      const runtime = await buildNamedRuntime({ name, project, version, progress: createRuntimeBuildProgress(process.stderr) });
      console.log(runtime.root);
    });
  runtime.command('delete <name[@version]>').description('Delete one installed runtime version').action(async (selector: string) => {
    const deleted = await deleteNamedRuntime(sharedRuntimeCacheRoot(), selector);
    console.log(`Deleted ${selector.split('@')[0]}@${deleted.version}`);
  });
}
