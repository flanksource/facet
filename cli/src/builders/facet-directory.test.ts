import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync, symlinkSync, utimesSync, lstatSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import { Logger } from '../utils/logger.js';
import { VERSION } from '../version-generated.js';
import {
  FacetDirectory,
  localFacetBuildFingerprint,
  needsLocalFacetComponentsBuild,
  needsLocalFacetCssBuild,
  resolveFacetPackageOverride,
  serializeInjectedData,
  wrapFacetStylesInLayer,
} from './facet-directory.js';

let consumerRoot: string;
let facetRoot: string;
let logger: Logger;
let savedFacetPackagePath: string | undefined;

beforeEach(async () => {
  consumerRoot = await mkdtemp(join(tmpdir(), 'facet-fd-test-'));
  vi.stubEnv('FACET_CACHE_DIR', join(consumerRoot, '.cache'));
  facetRoot = join(consumerRoot, '.facet');
  await mkdir(facetRoot, { recursive: true });
  savedFacetPackagePath = process.env.FACET_PACKAGE_PATH;
  delete process.env.FACET_PACKAGE_PATH;
  // Quiet logger — verbose=false suppresses debug, but warn/info still
  // print. Tests assert on return values, not on logger output.
  logger = new Logger(false);
});

afterEach(async () => {
  vi.unstubAllEnvs();
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

describe('wrapFacetStylesInLayer', () => {
  it('keeps leading comments and imports outside the facet layer', () => {
    const css = `${'/* / */\n'.repeat(1_000)}@import url("https://fonts.example/font.css");\nh1 { font-size: 22pt; }\n`;

    const wrapped = wrapFacetStylesInLayer(css);

    expect(wrapped).toContain('@import url("https://fonts.example/font.css");\n@layer theme');
    expect(wrapped).toContain('@layer facet {\nh1 { font-size: 22pt; }\n}');
  });
});


async function writeLocalFacetPackage(options: { scripts?: Record<string, string> } = {}) {
  const root = join(consumerRoot, 'local-facet');
  await mkdir(join(root, 'src/components'), { recursive: true });
  await mkdir(join(root, 'cli'), { recursive: true });
  await mkdir(join(root, 'dist/components'), { recursive: true });
  await mkdir(join(root, 'dist/page-styles'), { recursive: true });
  await writeFile(join(root, 'package.json'), JSON.stringify({
    name: '@flanksource/facet',
    version: '9.9.9-local',
    dependencies: {
      react: '^18.2.0',
      vite: '^9.9.9',
      tailwindcss: '^4.1.17',
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
  await writeFile(join(root, 'dist/page-styles/index.mjs'), 'export const pageStyles = {};\n');
  await writeFile(join(root, 'dist/components/index.js'), 'export const Marker = "built";\n');

  const oldTime = new Date(Date.now() - 60_000);
  const newTime = new Date(Date.now() + 60_000);
  for (const rel of ['package.json', 'src/styles.css', 'src/components/index.tsx']) {
    utimesSync(join(root, rel), oldTime, oldTime);
  }
  for (const rel of ['dist/styles.css', 'dist/components/index.js', 'dist/page-styles/index.mjs']) {
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


describe('FacetDirectory.generateViteConfig remark plugins', () => {
  it('resolves public Facet subpaths through the compiled runtimes in both renderers', async () => {
    const dir = newFacetDir();
    dir.generateViteConfig();
    dir.generateClientScaffold({});

    for (const name of ['vite.config.ts', 'vite.client.config.ts']) {
      const config = await readFile(join(facetRoot, name), 'utf-8');
      expect(config).toContain("await facetRuntimePlugin(__dirname,");
      expect(config).not.toContain("'@flanksource/facet': resolve(__dirname, 'node_modules/@flanksource/facet')");
    }
  });

  // The runtime <Classified> (and <SlideNotes>) apply the same policy to TSX content, so
  // both renderers must compile it into the bundle — the empty policy when none is given.
  it.each([
    [undefined, '{"allow":{}}'],
    [{ allow: { audience: ['presenter'] } }, '{"allow":{"audience":["presenter"]}}'],
  ])('defines the redaction policy %j as __FACET_REDACT__ in both renderers', async (redact, policy) => {
    const dir = new FacetDirectory({ consumerRoot, templateFile: 'deck.tsx', logger, redact });
    dir.generateViteConfig();
    dir.generateClientScaffold({});

    for (const name of ['vite.config.ts', 'vite.client.config.ts']) {
      expect(await readFile(join(facetRoot, name), 'utf-8')).toContain(`__FACET_REDACT__: ${JSON.stringify(policy)}`);
    }
  });

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
    expect(config).toContain("remarkPlugins: [remarkFrontmatter, remarkGfm, [remarkAlert, { tagName: 'blockquote' }], [facetRedact, {\"allow\":{}}], _remarkPlugin0]");
    expect(config).toContain(
      "rehypePlugins: [[rehypeRaw, { passThrough: ['mdxFlowExpression', 'mdxJsxFlowElement', 'mdxJsxTextElement', 'mdxTextExpression', 'mdxjsEsm'] }], _rehypePlugin0]",
    );
  });

  it('emits only the always-on defaults when no frontmatter plugins are declared', async () => {
    newFacetDir().generateViteConfig();
    const config = await readFile(join(facetRoot, 'vite.config.ts'), 'utf-8');
    // Redaction is always installed, even with no policy: a build that skipped
    // it would publish classified regions instead of failing on them.
    expect(config).toContain("remarkPlugins: [remarkFrontmatter, remarkGfm, [remarkAlert, { tagName: 'blockquote' }], [facetRedact, {\"allow\":{}}]]");
    expect(config).toContain("import facetRedact from './facet-redact.mjs';");
      expect(config).toContain(
        "rehypePlugins: [[rehypeRaw, { passThrough: ['mdxFlowExpression', 'mdxJsxFlowElement', 'mdxJsxTextElement', 'mdxTextExpression', 'mdxjsEsm'] }]]",
      );
  });

  it('feeds the point type scale to the Tailwind v4 theme', async () => {
    // Without this the `text-*` utilities resolve from Tailwind's rem defaults
    // against an unset root, and outrank anything the stylesheet declares — so
    // text-xs printed 9pt where the scale says 7pt.
    await writeFile(join(consumerRoot, 'template.tsx'), 'export default function Template() { return null; }\n');
    const dir = newFacetDir();
    dir.create();
    dir.symlinkConsumerFiles();
    dir.copyStylesCss();
    dir.generateEntryWrapper();

    const v4 = await readFile(join(facetRoot, 'post-process-v4.css'), 'utf-8');
    expect(v4).toContain('--text-xs: 7pt;');
    expect(v4).toContain('--text-2xl: 24pt;');
    // Leading travels with the size. Emitting size alone left text-2xl drawing
    // 24pt glyphs on whatever leading the element had.
    expect(v4).toContain('--text-xs--line-height: 9pt;');
    expect(v4).toContain('--text-2xl--line-height: 28pt;');
  });

  it('loads compiled dependency modules with ESM default interop', async () => {
    newFacetDir().generateViteConfig();
    const config = await readFile(join(facetRoot, 'vite.config.ts'), 'utf-8');

    expect(config).toContain("formats: ['es']");
    expect(config).toContain("await facetRuntimePlugin(__dirname, 'node')");
  });

  it('keeps lazy imports inside the one SSR bundle', async () => {
    newFacetDir().generateViteConfig();
    const config = await readFile(join(facetRoot, 'vite.config.ts'), 'utf-8');

    expect(config).toMatch(/output:\s*\{[^}]*codeSplitting:\s*false/);
  });

  it('transforms consumer Markdown while leaving raw imports to Vite', async () => {
    const dir = newFacetDir();
    dir.generateViteConfig();
    dir.generateClientScaffold({});

    for (const config of await Promise.all([
      readFile(join(facetRoot, 'vite.config.ts'), 'utf-8'),
      readFile(join(facetRoot, 'vite.client.config.ts'), 'utf-8'),
    ])) {
      expect(config).toContain("enforce: 'pre'");
      expect(config).toContain('include: [/\\.(md|mdx)$/]');
      expect(config).toContain('exclude: [/\\?raw(?:&|$)/]');
      expect(config).toContain('if (/(?:\\?|&)raw(?:&|$)/.test(id)) return null;');
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
    expect(facetCss).toMatch(/@import ['"]https:\/\/fonts\.googleapis\.com\//);
    expect(facetCss.indexOf('@import')).toBeLessThan(facetCss.indexOf('@layer theme'));
    // facet sits between base and utilities: above Tailwind preflight, so the
    // stylesheet's element defaults survive, and below utilities, so a
    // `text-lg` on the element still wins.
    expect(facetCss).toContain('@layer theme, base, facet, components, utilities;');
    expect(facetCss).toContain('@layer facet {');
    expect(facetCss).not.toContain('layer(facet)');

    expect(readdirSync(facetRoot).filter((name) => name.startsWith('tailwind.') || /^post-process(\.css|\.entry\.ts)$/.test(name))).toEqual([]);

    const postProcessV4Css = await readFile(join(facetRoot, 'post-process-v4.css'), 'utf-8');
    expect(postProcessV4Css).toContain('@import "tailwindcss/theme.css" layer(theme);');
    expect(postProcessV4Css).toContain('@import "tailwindcss/utilities.css" layer(utilities) source(none);');
    expect(postProcessV4Css).not.toContain('preflight.css');
    // The recipe entry carries only compiler inputs, so the facet stylesheet and
    // consumer CSS are imported ahead of it and the preset comes from the entry.
    expect(postProcessV4Css.indexOf("@import './facet.css';"))
      .toBeLessThan(postProcessV4Css.indexOf("@import './src/src/styles/report.css';"));
    expect(postProcessV4Css.indexOf("@import './src/src/styles/report.css';"))
      .toBeLessThan(postProcessV4Css.indexOf('@import "tailwindcss/theme.css" layer(theme);'));
    expect(postProcessV4Css).toContain('@config "@flanksource/facet/tailwind-preset";');
    expect(postProcessV4Css).toContain('@plugin "@tailwindcss/typography";');
    expect(postProcessV4Css).toContain('@source "./src/template.tsx";');
    expect(postProcessV4Css).toContain('@source "./rendered-content.html";');
  });

  it('serves template utilities to the live client entry', async () => {
    await writeFile(join(consumerRoot, 'template.tsx'), 'export default function Template() { return null; }\n');
    const dir = newFacetDir();
    dir.create();
    dir.copyStylesCss();
    dir.generateClientScaffold({});

    expect(await readFile(join(facetRoot, 'live-tailwind.css'), 'utf-8')).toBe('@tailwind utilities;\n');
    const clientEntry = await readFile(join(facetRoot, 'entry.client.tsx'), 'utf-8');
    expect(clientEntry).toContain("import './live-tailwind.css';");
  });

  it('generates Vite configs that require Tailwind v4 and drops the v3 PostCSS plugin', async () => {
    const dir = newFacetDir();
    dir.generateViteConfig();
    dir.generateClientScaffold({});
    dir.generatePostCSSConfig();

    for (const name of ['vite.config.ts', 'vite.client.config.ts']) {
      const config = await readFile(join(facetRoot, name), 'utf-8');
      expect(config).toContain("import tailwind from '@tailwindcss/vite'");
      expect(config).toContain('facet requires Tailwind CSS v4 (with @tailwindcss/vite)');
      expect(config).not.toContain('tailwindMajor');
    }
    const postcss = await readFile(join(facetRoot, 'postcss.config.js'), 'utf-8');
    expect(postcss).not.toMatch(/tailwindMajor|tailwind\.postprocess|tailwind\.config|import\('tailwindcss'\)/);
    expect(postcss).toContain('plugins: [autoprefixer(), facetFontScale()]');
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
    expect(generated.dependencies['@flanksource/facet']).toBe(VERSION);
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

    await facetDir.generatePackageJson();
    facetDir.copyStylesCss();

    expect(await readFile(join(facetRoot, 'facet.css'), 'utf-8'))
      .toContain('@layer facet {\n/* built local css */');
  });

  it('changes the build digest when the facet stylesheet changes', async () => {
    // The SSR bundle inlines facet.css and is cached under this digest, keyed
    // on the facet *version*. Editing facet's own CSS — or installing a patched
    // build at the same version — therefore served a bundle with the old
    // styles, and the edit looked like it simply did nothing.
    const localRoot = await writeLocalFacetPackage();
    process.env.FACET_PACKAGE_PATH = localRoot;
    await writeFile(join(consumerRoot, 'template.tsx'), 'export default function Template() { return null; }\n');
    const facetDir = newFacetDir();
    facetDir.create();
    await facetDir.generatePackageJson();

    facetDir.copyStylesCss();
    const before = facetDir.generatedConfigDigest();

    await writeFile(join(localRoot, 'dist/styles.css'), '/* built local css */\np { font-size: 11pt; }\n');
    facetDir.copyStylesCss();

    expect(facetDir.generatedConfigDigest()).not.toBe(before);
  });

  it('anchors every local-path consumer dependency at the consumer root in .facet/package.json', async () => {
    // .facet/package.json sits one level below the consumer, so a relative link:
    // left as written resolves one directory too high and the import fails.
    await writeFile(join(consumerRoot, 'package.json'), JSON.stringify({
      dependencies: { '@acme/kit': 'file:../kit', '@acme/linked': 'link:../../packages/linked', 'left-pad': '^1.3.0' },
      devDependencies: { '@acme/portal': 'portal:./portal' },
    }));

    await newFacetDir().generatePackageJson();

    const generated = JSON.parse(await readFile(join(facetRoot, 'package.json'), 'utf-8'));
    expect({
      kit: generated.dependencies['@acme/kit'],
      linked: generated.dependencies['@acme/linked'],
      portal: generated.dependencies['@acme/portal'],
      registry: generated.dependencies['left-pad'],
    }).toEqual({
      kit: `file:${resolve(consumerRoot, '../kit')}`,
      linked: `link:${resolve(consumerRoot, '../../packages/linked')}`,
      portal: `portal:${resolve(consumerRoot, 'portal')}`,
      registry: '^1.3.0',
    });
  });

  it('invalidates template bundles when a linked override changes its built modules', async () => {
    const library = join(consumerRoot, 'example-kit');
    await mkdir(join(library, 'dist'), { recursive: true });
    await writeFile(join(library, 'package.json'), JSON.stringify({ name: 'example-kit', version: '1.0.0' }));
    await writeFile(join(library, 'dist/index.js'), 'export const value = "first";');
    await writeFile(join(facetRoot, 'package.json'), JSON.stringify({ dependencies: {}, pnpm: { overrides: { 'example-kit': `link:${library}` } } }));
    const dir = newFacetDir();
    const before = dir.generatedConfigDigest();
    await writeFile(join(library, 'dist/index.js'), 'export const value = "second";');
    expect(dir.generatedConfigDigest()).not.toBe(before);
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

  it.each(['type-scale.mjs', 'font-scale.mjs', 'recipe.mjs', 'preset.mjs', 'stylesheet.mjs'])('rebuilds CSS when page-styles/%s changes', async (name) => {
    const localRoot = await writeLocalFacetPackage();
    await mkdir(join(localRoot, 'src/page-styles'), { recursive: true });
    const source = join(localRoot, 'src/page-styles', name);
    await writeFile(source, 'export const changed = true;\n');
    utimesSync(source, new Date(Date.now() + 120_000), new Date(Date.now() + 120_000));
    expect(needsLocalFacetCssBuild(localRoot)).toBe(true);
  });

  it('rebuilds a missing recipe and fingerprints changes in its built modules', async () => {
    const localRoot = await writeLocalFacetPackage();
    const recipe = join(localRoot, 'dist/page-styles/index.mjs');
    const before = localFacetBuildFingerprint(localRoot);
    await writeFile(recipe, 'export const pageStyles = { changed: true };\n');
    expect(localFacetBuildFingerprint(localRoot)).not.toBe(before);
    await rm(recipe);
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
