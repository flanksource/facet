import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync, symlinkSync, utimesSync, lstatSync, readlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { Logger } from '../utils/logger.js';
import {
  FacetDirectory,
  localFacetBuildFingerprint,
  needsLocalFacetComponentsBuild,
  needsLocalFacetCssBuild,
  resolveFacetPackageOverride,
  serializeInjectedData,
} from './facet-directory.js';

let consumerRoot: string;
let facetRoot: string;
let logger: Logger;
let savedFacetPackagePath: string | undefined;

beforeEach(async () => {
  consumerRoot = await mkdtemp(join(tmpdir(), 'facet-fd-test-'));
  facetRoot = join(consumerRoot, '.facet');
  await mkdir(facetRoot, { recursive: true });
  savedFacetPackagePath = process.env.FACET_PACKAGE_PATH;
  delete process.env.FACET_PACKAGE_PATH;
  // Quiet logger — verbose=false suppresses debug, but warn/info still
  // print. Tests assert on return values, not on logger output.
  logger = new Logger(false);
});

afterEach(async () => {
  if (savedFacetPackagePath === undefined) delete process.env.FACET_PACKAGE_PATH;
  else process.env.FACET_PACKAGE_PATH = savedFacetPackagePath;
  await rm(consumerRoot, { recursive: true, force: true });
});

function newFacetDir(): FacetDirectory {
  return new FacetDirectory({
    consumerRoot,
    templateFile: 'template.tsx',
    logger,
  });
}

async function writeSentinels(deps: string[] = ['react', 'vite', '@vitejs/plugin-react', '@flanksource/facet']) {
  const nm = join(facetRoot, 'node_modules');
  for (const dep of deps) {
    const dir = join(nm, ...dep.split('/'));
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: dep, version: '0.0.0' }));
  }
}

async function writeLocalFacetPackage(options: { scripts?: Record<string, string> } = {}) {
  const root = join(consumerRoot, 'local-facet');
  await mkdir(join(root, 'src/components'), { recursive: true });
  await mkdir(join(root, 'cli'), { recursive: true });
  await mkdir(join(root, 'dist/components'), { recursive: true });
  await writeFile(join(root, 'package.json'), JSON.stringify({
    name: '@flanksource/facet',
    version: '9.9.9-local',
    dependencies: {
      react: '^18.2.0',
      vite: '^9.9.9',
      tailwindcss: '^3.4.0',
    },
    devDependencies: {
      '@vitejs/plugin-react': '^9.9.9',
    },
    scripts: options.scripts ?? {
      'build:components': 'echo build-components',
      'build:css': 'echo build-css',
    },
  }, null, 2));
  await writeFile(join(root, 'src/styles.css'), '/* local facet styles */\n.local-only { color: red; }\n');
  await writeFile(join(root, 'src/components/index.tsx'), 'export const Marker = "source";\n');
  await writeFile(join(root, 'dist/styles.css'), '/* built local css */\n');
  await writeFile(join(root, 'dist/components/index.js'), 'export const Marker = "built";\n');

  const oldTime = new Date(Date.now() - 60_000);
  const newTime = new Date(Date.now() + 60_000);
  for (const rel of ['package.json', 'src/styles.css', 'src/components/index.tsx']) {
    utimesSync(join(root, rel), oldTime, oldTime);
  }
  for (const rel of ['dist/styles.css', 'dist/components/index.js']) {
    utimesSync(join(root, rel), newTime, newTime);
  }
  return root;
}

describe('FacetDirectory.symlinkConsumerFiles', () => {
  it('skips cache/tool entries, prunes stale links, and keeps .facet-fragments', async () => {
    for (const dir of ['.pnpm-store', '.wrangler', '.tmp', 'npm-dist', '.facet-fragments', 'src']) {
      await mkdir(join(consumerRoot, dir), { recursive: true });
    }
    const facetSrc = join(facetRoot, 'src');
    await mkdir(facetSrc, { recursive: true });
    // Stale link from a facet version that mirrored everything.
    symlinkSync(join(consumerRoot, '.pnpm-store'), join(facetSrc, '.pnpm-store'), 'junction');

    const dir = newFacetDir();
    dir.create();
    dir.symlinkConsumerFiles();

    expect(existsSync(join(facetSrc, '.pnpm-store'))).toBe(false);
    expect(existsSync(join(facetSrc, '.wrangler'))).toBe(false);
    expect(existsSync(join(facetSrc, '.tmp'))).toBe(false);
    expect(existsSync(join(facetSrc, 'npm-dist'))).toBe(false);
    expect(lstatSync(join(facetSrc, '.facet-fragments')).isSymbolicLink()).toBe(true);
    expect(lstatSync(join(facetSrc, 'src')).isSymbolicLink()).toBe(true);
  });
});

describe('FacetDirectory.nukeInstall', () => {
  it('removes node_modules and pnpm-lock.yaml', async () => {
    await writeSentinels();
    await writeFile(join(facetRoot, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n');
    await mkdir(join(facetRoot, '.pnpm-store'));

    newFacetDir().nukeInstall();

    expect(existsSync(join(facetRoot, 'node_modules'))).toBe(false);
    expect(existsSync(join(facetRoot, 'pnpm-lock.yaml'))).toBe(false);
    expect(existsSync(join(facetRoot, '.pnpm-store'))).toBe(false);
  });

  it('is a no-op when nothing is installed', () => {
    expect(() => newFacetDir().nukeInstall()).not.toThrow();
  });

  it('removes a symlinked node_modules without following the link', async () => {
    const externalCache = await mkdtemp(join(tmpdir(), 'facet-cache-'));
    await writeFile(join(externalCache, 'sentinel.txt'), 'do-not-delete');
    symlinkSync(externalCache, join(facetRoot, 'node_modules'), 'junction');
    await writeFile(join(facetRoot, 'package-lock.json'), '{}');
    newFacetDir().nukeInstall();
    expect(existsSync(join(facetRoot, 'node_modules'))).toBe(false);
    expect(existsSync(join(facetRoot, 'package-lock.json'))).toBe(false);
    expect(existsSync(join(externalCache, 'sentinel.txt'))).toBe(true);
    await rm(externalCache, { recursive: true, force: true });
  });
});

describe('FacetDirectory.generateViteConfig remark plugins', () => {
  it('keeps Markdown extension defaults and appends frontmatter plugins', async () => {
    const dir = new FacetDirectory({
      consumerRoot,
      templateFile: 'doc.mdx',
      logger,
      remarkConfig: { remarkPlugins: ['./remark-financial-table.ts'], rehypePlugins: ['rehype-slug'] },
    });
    dir.generateViteConfig();
    const config = await readFile(join(facetRoot, 'vite.config.ts'), 'utf-8');
    expect(config).toContain("import remarkFrontmatter from 'remark-frontmatter';");
    expect(config).toContain(`import _remarkPlugin0 from "${join(consumerRoot, 'remark-financial-table.ts')}";`);
    expect(config).toContain("remarkPlugins: [remarkFrontmatter, remarkGfm, [remarkAlert, { tagName: 'blockquote' }], _remarkPlugin0]");
    expect(config).toContain(
      "rehypePlugins: [[rehypeRaw, { passThrough: ['mdxFlowExpression', 'mdxJsxFlowElement', 'mdxJsxTextElement', 'mdxTextExpression', 'mdxjsEsm'] }], _rehypePlugin0]",
    );
  });

  it('emits only the always-on defaults when no frontmatter plugins are declared', async () => {
    newFacetDir().generateViteConfig();
    const config = await readFile(join(facetRoot, 'vite.config.ts'), 'utf-8');
    expect(config).toContain("remarkPlugins: [remarkFrontmatter, remarkGfm, [remarkAlert, { tagName: 'blockquote' }]]");
      expect(config).toContain(
        "rehypePlugins: [[rehypeRaw, { passThrough: ['mdxFlowExpression', 'mdxJsxFlowElement', 'mdxJsxTextElement', 'mdxTextExpression', 'mdxjsEsm'] }]]",
      );
  });

  it('transforms consumer Markdown before Vite parses files outside the generated .facet directory', async () => {
    const dir = newFacetDir();
    dir.generateViteConfig();
    dir.generateClientScaffold({});

    for (const config of await Promise.all([
      readFile(join(facetRoot, 'vite.config.ts'), 'utf-8'),
      readFile(join(facetRoot, 'vite.client.config.ts'), 'utf-8'),
    ])) {
      expect(config).toContain("enforce: 'pre'");
      expect(config).toContain('include: [/\\.(md|mdx)$/]');
    }
  });
});

describe('FacetDirectory Tailwind integration', () => {
  it('loads Facet defaults before template-owned consumer CSS', async () => {
    await mkdir(join(consumerRoot, 'src/styles'), { recursive: true });
    await writeFile(join(consumerRoot, 'template.tsx'), "import './src/styles/report.css';\nexport default function Template() { return null; }\n");
    await writeFile(join(consumerRoot, 'src/styles/report.css'), '@import "tailwindcss";\n');
    const dir = newFacetDir();
    dir.create();
    dir.symlinkConsumerFiles();
    dir.copyStylesCss();
    dir.generateEntryWrapper();

    const entry = await readFile(join(facetRoot, 'entry.tsx'), 'utf-8');
    const facetImport = entry.indexOf("import './facet.css';");
    const templateImport = entry.indexOf("import Template from './src/template.tsx';");
    expect(facetImport).toBeGreaterThanOrEqual(0);
    expect(templateImport).toBeGreaterThan(facetImport);

    const facetCss = await readFile(join(facetRoot, 'facet.css'), 'utf-8');
    expect(facetCss).toMatch(/^@import ['"]https:\/\/fonts\.googleapis\.com\//);
    expect(facetCss).toContain('@layer facet, theme, base, components, utilities;');
    expect(facetCss).toContain('@layer facet {');
    expect(facetCss).not.toContain('layer(facet)');

    const postProcessCss = await readFile(join(facetRoot, 'post-process.css'), 'utf-8');
    expect(postProcessCss.indexOf("@import './facet.css';"))
      .toBeLessThan(postProcessCss.indexOf("@import './src/src/styles/report.css';"));
    expect(postProcessCss).not.toContain('@source');

    const postProcessV4Css = await readFile(join(facetRoot, 'post-process-v4.css'), 'utf-8');
    expect(postProcessV4Css).toContain('@import "tailwindcss/theme.css" layer(theme);');
    expect(postProcessV4Css).toContain('@import "tailwindcss/utilities.css" layer(utilities) source(none);');
    expect(postProcessV4Css).not.toContain('preflight.css');
    expect(postProcessV4Css).toContain('@source "./src/template.tsx";');
    expect(postProcessV4Css).toContain('@source "./rendered-content.html";');
  });

  it('generates Vite configs that select the installed Tailwind major', async () => {
    const dir = newFacetDir();
    dir.generateViteConfig();
    dir.generateClientScaffold({});

    expect(await readFile(join(facetRoot, 'vite.config.ts'), 'utf-8'))
      .toContain("await import('@tailwindcss/vite')");
    expect(await readFile(join(facetRoot, 'vite.client.config.ts'), 'utf-8'))
      .toContain("await import('@tailwindcss/vite')");
    expect(await readFile(join(facetRoot, 'postcss.config.js'), 'utf-8'))
      .toContain("tailwindMajor === 3");
  });

  it('scans the template top-level source directory', async () => {
    await mkdir(join(consumerRoot, 'src'), { recursive: true });
    await writeFile(join(consumerRoot, 'src/template.tsx'), 'export default null;\n');
    const dir = new FacetDirectory({ consumerRoot, templateFile: 'src/template.tsx', logger });
    dir.create();
    dir.copyStylesCss();

    expect(await readFile(join(facetRoot, 'post-process-v4.css'), 'utf-8'))
      .toContain('@source "./src/src";');
  });
});

describe('FacetDirectory.generatePackageJson .npmrc', () => {
  it('disables modules-purge confirmation so non-interactive pnpm runs do not abort', async () => {
    await writeFile(join(consumerRoot, 'package.json'), JSON.stringify({ name: 'consumer', version: '0.0.0' }));
    await newFacetDir().generatePackageJson();
    const npmrc = await readFile(join(facetRoot, '.npmrc'), 'utf-8');
    expect(npmrc).toContain('confirm-modules-purge=false');
  });

  it('uses only the pinned default manifest in skip-modules mode', async () => {
    await writeFile(join(consumerRoot, 'package.json'), JSON.stringify({
      name: 'consumer',
      dependencies: { 'custom-module': '2.0.0' },
      packageManager: 'npm@11.0.0',
    }));
    process.env.FACET_PACKAGE_PATH = join(consumerRoot, 'mutable-facet-checkout');
    const directory = new FacetDirectory({
      consumerRoot,
      templateFile: 'template.tsx',
      logger,
      skipModules: true,
    });

    await directory.generatePackageJson();

    const generated = JSON.parse(await readFile(join(facetRoot, 'package.json'), 'utf-8'));
    expect(generated.name).toBe('.facet-default-modules');
    expect(generated.dependencies['@flanksource/facet']).toBe('0.1.59');
    expect(generated.dependencies['custom-module']).toBeUndefined();
    expect(await readFile(join(facetRoot, '.npmrc'), 'utf-8')).not.toContain('Inherited from consumer');
  });

  it('preserves source symlink paths so skip mode resolves from shared modules', async () => {
    const directory = new FacetDirectory({
      consumerRoot,
      templateFile: 'template.tsx',
      logger,
      skipModules: true,
    });
    directory.generateViteConfig();
    directory.generateClientScaffold({});

    expect(await readFile(join(facetRoot, 'vite.config.ts'), 'utf-8')).toContain('preserveSymlinks: true');
    expect(await readFile(join(facetRoot, 'vite.client.config.ts'), 'utf-8')).toContain('preserveSymlinks: true');
  });
});

describe('FACET_PACKAGE_PATH local directory override', () => {
  it('resolves directory and tarball overrides distinctly', async () => {
    const localRoot = await writeLocalFacetPackage();
    expect(resolveFacetPackageOverride(localRoot)).toEqual({ kind: 'directory', path: localRoot });

    const tarball = join(consumerRoot, 'facet.tgz');
    await writeFile(tarball, 'fake tarball');
    expect(resolveFacetPackageOverride(tarball)).toEqual({ kind: 'tarball', path: tarball });
  });

  it('imports compiled default styles from the local checkout', async () => {
    const localRoot = await writeLocalFacetPackage();
    process.env.FACET_PACKAGE_PATH = localRoot;
    await writeFile(join(consumerRoot, 'template.tsx'), 'export default function Template() { return null; }\n');
    const facetDir = newFacetDir();
    facetDir.create();

    facetDir.copyStylesCss();

    expect(await readFile(join(facetRoot, 'facet.css'), 'utf-8'))
      .toContain('@layer facet {\n/* built local css */');
  });

  it('uses local package metadata and writes a build fingerprint into .facet/package.json', async () => {
    const localRoot = await writeLocalFacetPackage();
    process.env.FACET_PACKAGE_PATH = localRoot;

    await newFacetDir().generatePackageJson();

    const generated = JSON.parse(await readFile(join(facetRoot, 'package.json'), 'utf-8'));
    expect(generated.dependencies['@flanksource/facet']).toBe(`file:${localRoot}`);
    expect(generated.dependencies.vite).toBe('^9.9.9');
    expect(generated.dependencies['@vitejs/plugin-react']).toBe('^9.9.9');
    expect(generated.facetLocalOverride).toEqual({
      path: localRoot,
      fingerprint: localFacetBuildFingerprint(localRoot),
    });
  });

  it('keeps tarball overrides dependency-only', async () => {
    const tarball = join(consumerRoot, 'facet.tgz');
    await writeFile(tarball, 'fake tarball');
    process.env.FACET_PACKAGE_PATH = tarball;

    await newFacetDir().generatePackageJson();

    const generated = JSON.parse(await readFile(join(facetRoot, 'package.json'), 'utf-8'));
    expect(generated.dependencies['@flanksource/facet']).toBe(`file:${tarball}`);
    expect(generated.facetLocalOverride).toBeUndefined();
  });

  it('changes the local build fingerprint when local dist output changes', async () => {
    const localRoot = await writeLocalFacetPackage();
    const before = localFacetBuildFingerprint(localRoot);

    await writeFile(join(localRoot, 'dist/components/index.js'), 'export const Marker = "changed";\n');
    const future = new Date(Date.now() + 120_000);
    utimesSync(join(localRoot, 'dist/components/index.js'), future, future);

    expect(localFacetBuildFingerprint(localRoot)).not.toBe(before);
  });

  it('detects stale component and css outputs without invoking pnpm', async () => {
    const localRoot = await writeLocalFacetPackage();
    const oldTime = new Date(Date.now() - 120_000);
    const future = new Date(Date.now() + 120_000);

    utimesSync(join(localRoot, 'dist/components/index.js'), oldTime, oldTime);
    utimesSync(join(localRoot, 'src/components/index.tsx'), future, future);
    expect(needsLocalFacetComponentsBuild(localRoot)).toBe(true);

    utimesSync(join(localRoot, 'dist/styles.css'), oldTime, oldTime);
    utimesSync(join(localRoot, 'src/styles.css'), future, future);
    expect(needsLocalFacetCssBuild(localRoot)).toBe(true);
  });

  it('detects css output removal after components clean dist', async () => {
    const localRoot = await writeLocalFacetPackage();
    const oldTime = new Date(Date.now() - 120_000);
    const future = new Date(Date.now() + 120_000);

    utimesSync(join(localRoot, 'src/styles.css'), oldTime, oldTime);
    utimesSync(join(localRoot, 'dist/styles.css'), future, future);
    expect(needsLocalFacetCssBuild(localRoot)).toBe(false);

    await rm(join(localRoot, 'dist/styles.css'), { force: true });
    expect(needsLocalFacetCssBuild(localRoot)).toBe(true);
  });

  it('waits for a local build lock without blocking the event loop', async () => {
    const localRoot = await writeLocalFacetPackage();
    process.env.FACET_PACKAGE_PATH = localRoot;
    const future = new Date(Date.now() + 120_000);
    utimesSync(join(localRoot, 'src/components/index.tsx'), future, future);
    const lockPath = join(localRoot, '.facet-local-build.lock');
    await writeFile(lockPath, 'other-process\n');
    let timerRan = false;
    const timer = setTimeout(() => {
      timerRan = true;
      void rm(lockPath, { force: true });
    }, 25);

    try {
      await newFacetDir().generatePackageJson();
    } finally {
      clearTimeout(timer);
    }

    expect(timerRan).toBe(true);
    expect(existsSync(lockPath)).toBe(false);
  });

  it('removes a stale installed local package copy when package.json is unchanged', async () => {
    const localRoot = await writeLocalFacetPackage();
    process.env.FACET_PACKAGE_PATH = localRoot;
    const facetDir = newFacetDir();

    await facetDir.generatePackageJson();

    const installedRoot = join(facetRoot, 'node_modules/@flanksource/facet');
    await mkdir(join(installedRoot, 'dist/components'), { recursive: true });
    await writeFile(join(installedRoot, 'package.json'), await readFile(join(localRoot, 'package.json'), 'utf-8'));
    await writeFile(join(installedRoot, 'dist/components/index.js'), 'export const Marker = "stale";\n');
    await writeFile(join(facetRoot, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n');

    await facetDir.generatePackageJson();

    expect(existsSync(installedRoot)).toBe(false);
    expect(existsSync(join(facetRoot, 'pnpm-lock.yaml'))).toBe(false);
  });
});

describe('serializeInjectedData', () => {
  it('escapes </script> so injected data cannot break out of the script tag', () => {
    const script = serializeInjectedData({ note: '</script><script>alert(1)</script>' });
    expect(script).not.toContain('</script>');
    expect(script).toContain('\\u003c/script>');
  });

  it('escapes U+2028 and U+2029 line separators', () => {
    const script = serializeInjectedData({ note: 'a\u2028b\u2029c' });
    expect(script).not.toContain('\u2028');
    expect(script).not.toContain('\u2029');
    expect(script).toContain('\\u2028');
    expect(script).toContain('\\u2029');
  });

  it('round-trips back to the original data', () => {
    const data = { a: 1, b: '</script>', c: ['x y'] };
    const script = serializeInjectedData(data);
    const json = script.replace(/^window\.__FACET_DATA__ = /, '').replace(/;\n$/, '');
    expect(JSON.parse(json)).toEqual(data);
  });
});

describe('FacetDirectory.linkConsumerNodeModules', () => {
  it('symlinks consumer node_modules to .facet/node_modules when the consumer has none', async () => {
    await writeSentinels();
    newFacetDir().linkConsumerNodeModules();

    const link = join(consumerRoot, 'node_modules');
    expect(lstatSync(link).isSymbolicLink()).toBe(true);
    expect(readlinkSync(link)).toBe(join(facetRoot, 'node_modules'));
    expect(existsSync(join(link, 'react', 'package.json'))).toBe(true);
  });

  it('leaves a real consumer node_modules directory untouched', async () => {
    await writeSentinels();
    const own = join(consumerRoot, 'node_modules', 'left-pad');
    await mkdir(own, { recursive: true });

    newFacetDir().linkConsumerNodeModules();

    expect(lstatSync(join(consumerRoot, 'node_modules')).isDirectory()).toBe(true);
    expect(existsSync(own)).toBe(true);
  });

  it('replaces a dangling consumer node_modules symlink', async () => {
    await writeSentinels();
    const link = join(consumerRoot, 'node_modules');
    symlinkSync(join(consumerRoot, 'gone'), link, 'junction');

    newFacetDir().linkConsumerNodeModules();

    expect(readlinkSync(link)).toBe(join(facetRoot, 'node_modules'));
  });
});
