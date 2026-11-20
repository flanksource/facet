import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { createRequire } from 'node:module';
import { parseSync } from 'rolldown/utils';

interface Manifest {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  exports?: Record<string, unknown>;
  [key: string]: unknown;
}

function manifest(root: string): Manifest {
  return JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
}

function packageDirectory(options: { name: string; from: string; root: string; optional: boolean }): string | undefined {
  const paths = createRequire(join(options.from, 'package.json')).resolve.paths(options.name);
  for (const path of paths ?? []) {
    const dir = join(path, options.name);
    if (!existsSync(join(dir, 'package.json'))) continue;
    const actual = realpathSync(dir);
    if (relative(options.root, actual).split(sep).includes('..')) continue;
    return actual;
  }
  if (options.optional) return undefined;
  throw new Error(`Required rendering dependency ${options.name} is not installed from ${options.from}`);
}

const excludedDirectories = new Set(['node_modules', 'test', 'tests', '__tests__', 'docs', 'examples', 'coverage', '.bin', '.cache', '.git']);

function copyFiles(source: string, destination: string): void {
  cpSync(source, destination, {
    recursive: true,
    dereference: true,
    filter: file => {
      const parts = relative(source, file).split(sep);
      return !parts.some(part => excludedDirectories.has(part)) && !/(?:\.map|\.d\.[cm]?ts|\.tsbuildinfo)$/.test(file);
    },
  });
}

function stripSourceMaps(root: string): void {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const file = join(root, entry.name);
    if (entry.isDirectory()) { stripSourceMaps(file); continue; }
    if (!entry.isFile() || !/\.[cm]?js$/.test(file)) continue;
    let source = readFileSync(file, 'utf8');
    if (!source.includes('sourceMappingURL')) continue;
    const parsed = parseSync(file, source, { sourceType: 'unambiguous' });
    if (parsed.errors.length) throw new Error(`Cannot strip source maps from ${file}: ${parsed.errors.map(error => error.message).join('\n')}`);
    for (const comment of [...parsed.comments].reverse()) {
      if (!/^[#@]\s*sourceMappingURL=/.test(comment.value.trimStart())) continue;
      source = source.slice(0, comment.start) + source.slice(comment.start, comment.end).replace(/[^\r\n]/g, ' ') + source.slice(comment.end);
    }
    writeFileSync(file, source);
  }
}

function copyTools(options: { root: string; out: string; packages: string[] }): void {
  const copied = new Set<string>();
  const nativeVersions = new Map<string, string>();
  const root = realpathSync(options.root);
  const visit = (name: string, from: string, optional = false): void => {
    if (name.startsWith('@types/')) return;
    const directory = packageDirectory({ name, from, root, optional });
    if (!directory || copied.has(directory)) return;
    const pkg = manifest(directory);
    if (/^(?:rolldown|lightningcss)(?:-|$)/.test(pkg.name) || pkg.name.startsWith('@rolldown/binding-')) {
      const previous = nativeVersions.get(pkg.name);
      if (previous && previous !== pkg.version) throw new Error(`Rendering dependency ${pkg.name} is duplicated at ${previous} and ${pkg.version}; align the rendering install overrides`);
      nativeVersions.set(pkg.name, pkg.version);
    }
    copied.add(directory);
    copyFiles(directory, join(options.out, relative(root, directory)));
    for (const dependency of Object.keys(pkg.dependencies ?? {})) visit(dependency, directory);
    for (const dependency of Object.keys(pkg.optionalDependencies ?? {})) visit(dependency, directory, true);
  };
  for (const name of options.packages) if (name !== '@flanksource/facet') visit(name, options.root);
}

function copyFacet(options: { root: string; out: string }): void {
  const source = join(options.root, 'node_modules/@flanksource/facet');
  const destination = join(options.out, 'node_modules/@flanksource/facet');
  const runtimeRoot = join(options.out, 'page-runtime/node');
  const runtime = JSON.parse(readFileSync(join(runtimeRoot, 'runtime.json'), 'utf8')) as { imports: Record<string, string> };
  const exports: Record<string, unknown> = { './package.json': './package.json', './styles.css': './dist/styles.css' };
  mkdirSync(join(destination, 'entries'), { recursive: true });
  for (const [specifier, entry] of Object.entries(runtime.imports)) {
    if (specifier !== '@flanksource/facet' && !specifier.startsWith('@flanksource/facet/')) continue;
    const target = join(runtimeRoot, entry);
    const parsed = parseSync(target, readFileSync(target, 'utf8'));
    if (parsed.errors.length) throw new Error(`Invalid precompiled rendering entry ${target}: ${parsed.errors.map(error => error.message).join('\n')}`);
    const hasDefault = parsed.module.staticExports.some(item => item.entries.some(value => value.exportName.kind === 'Default' || value.exportName.name === 'default'));
    const file = `entries/${Object.keys(exports).length}.mjs`;
    const module = JSON.stringify(relative(dirname(join(destination, file)), target).split(sep).join('/'));
    writeFileSync(join(destination, file), `export * from ${module};\n${hasDefault ? `export { default } from ${module};\n` : ''}`);
    exports[specifier === '@flanksource/facet' ? '.' : `.${specifier.slice('@flanksource/facet'.length)}`] = `./${file}`;
  }
  const pkg = manifest(source);
  const { scripts, devDependencies, bin, main, module, types, files, ...metadata } = pkg;
  writeFileSync(join(destination, 'package.json'), JSON.stringify({ ...metadata, exports }, null, 2));
  for (const file of ['dist/styles.css', 'dist/runtime/importmap.json', 'dist/runtime/barrels.json']) {
    mkdirSync(dirname(join(destination, file)), { recursive: true });
    cpSync(join(source, file), join(destination, file));
  }
  for (const file of readdirSync(source).filter(file => /^(?:licen[sc]e|notice|copying)(?:\.|$)/i.test(file))) cpSync(join(source, file), join(destination, file));
}

function copyLicenses(options: { root: string; out: string }): void {
  const seen = new Set<string>();
  for (const target of ['node', 'browser']) {
    const runtime = JSON.parse(readFileSync(join(options.root, 'page-runtime', target, 'runtime.json'), 'utf8')) as { inputs?: Record<string, string> };
    for (const file of Object.keys(runtime.inputs ?? {})) {
      let directory = dirname(file);
      while (true) {
        if (existsSync(join(directory, 'package.json'))) {
          const pkg = manifest(directory);
          if (typeof pkg.name === 'string' && typeof pkg.version === 'string') break;
        }
        if (directory === dirname(directory)) throw new Error(`No license metadata for rendering input ${file}`);
        directory = dirname(directory);
      }
      if (seen.has(directory)) continue;
      seen.add(directory);
      const pkg = manifest(directory);
      const out = join(options.out, 'licenses', `${pkg.name}@${pkg.version}`);
      mkdirSync(out, { recursive: true });
      writeFileSync(join(out, 'package.json'), JSON.stringify({ name: pkg.name, version: pkg.version, license: pkg.license, repository: pkg.repository }));
      for (const name of readdirSync(directory).filter(name => /^(?:licen[sc]e|notice|copying)(?:\.|$)/i.test(name))) cpSync(join(directory, name), join(out, name), { recursive: true });
    }
  }
}

export async function stageRenderingRuntime(options: { root: string; out: string; packages: string[] }): Promise<void> {
  if (resolve(options.root) === resolve(options.out)) throw new Error('Rendering projection must not overwrite its source installation');
  mkdirSync(join(options.out, 'node_modules'), { recursive: true });
  copyTools(options);
  cpSync(join(options.root, 'page-runtime'), join(options.out, 'page-runtime'), { recursive: true });
  if (options.packages.includes('@flanksource/facet')) copyFacet(options);
  stripSourceMaps(join(options.out, 'node_modules'));
  copyLicenses(options);
  const pkg = manifest(options.root);
  const dependencies = Object.fromEntries(options.packages.map(name => [name, manifest(join(options.out, 'node_modules', name)).version]));
  writeFileSync(join(options.out, 'package.json'), JSON.stringify({ name: 'facet-render-runtime', private: true, type: 'module', dependencies, packageManager: pkg.packageManager }, null, 2));
  cpSync(join(options.root, 'pnpm-lock.yaml'), join(options.out, 'pnpm-lock.yaml'));
}
