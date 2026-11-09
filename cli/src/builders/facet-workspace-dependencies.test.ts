import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { FacetDirectory } from './facet-directory.js';
import { Logger } from '../utils/logger.js';

let root: string;
let consumerRoot: string;
let savedOverride: string | undefined;

beforeEach(async () => {
  await mkdir('.tmp', { recursive: true });
  root = await realpath(await mkdtemp(resolve('.tmp/facet-workspace-')));
  consumerRoot = join(root, 'apps/demo');
  await mkdir(join(consumerRoot, '.facet'), { recursive: true });
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'workspace', private: true }));
  savedOverride = process.env.FACET_PACKAGE_PATH;
  delete process.env.FACET_PACKAGE_PATH;
});

afterEach(async () => {
  if (savedOverride === undefined) delete process.env.FACET_PACKAGE_PATH;
  else process.env.FACET_PACKAGE_PATH = savedOverride;
  await rm(root, { recursive: true, force: true });
});

async function generate(templateFile = 'template.tsx') {
  await new FacetDirectory({ consumerRoot, templateFile, logger: new Logger(false) }).generatePackageJson();
  return JSON.parse(await readFile(join(consumerRoot, '.facet/package.json'), 'utf-8'));
}

describe('workspace dependencies in the standalone Facet manifest', () => {
  it('resolves default and named catalogs from an ancestor workspace', async () => {
    await writeFile(join(root, 'pnpm-workspace.yaml'), [
      'packages: [apps/*]',
      'catalog:',
      '  "@acme/icons": 1.2.3',
      '  react: ^19.0.0',
      'catalogs:',
      '  tools:',
      '    typescript: ~5.7.0',
      '',
    ].join('\n'));
    await writeFile(join(consumerRoot, 'package.json'), JSON.stringify({
      dependencies: { '@acme/icons': 'catalog:', react: 'catalog:default' },
      devDependencies: { typescript: 'catalog:tools' },
    }));

    expect((await generate()).dependencies).toMatchObject({
      '@acme/icons': '1.2.3', react: '^19.0.0', typescript: '~5.7.0',
    });
  });

  it('resolves catalog paths relative to the workspace and nested template dependencies relative to their package', async () => {
    await writeFile(join(root, 'pnpm-workspace.yaml'), 'catalog:\n  "@acme/kit": link:./packages/kit\n');
    await writeFile(join(consumerRoot, 'package.json'), '{}');
    await mkdir(join(consumerRoot, 'templates'), { recursive: true });
    await writeFile(join(consumerRoot, 'templates/package.json'), JSON.stringify({
      dependencies: { '@acme/kit': 'catalog:', '@acme/local': 'file:./local' },
    }));

    expect((await generate('templates/example.tsx')).dependencies).toMatchObject({
      '@acme/kit': `link:${join(root, 'packages/kit')}`,
      '@acme/local': `file:${join(consumerRoot, 'templates/local')}`,
    });
  });

  it.each(['catalog:', 'catalog:tools'])('rejects missing %s entries before writing a manifest', async (spec) => {
    await writeFile(join(root, 'pnpm-workspace.yaml'), 'catalog: {}\ncatalogs: { tools: {} }\n');
    await writeFile(join(consumerRoot, 'package.json'), JSON.stringify({ dependencies: { '@acme/missing': spec } }));

    await expect(generate()).rejects.toThrow(/@acme\/missing.*catalog.*pnpm-workspace.yaml/);
  });

  it('rejects a catalog reference without a workspace configuration', async () => {
    await writeFile(join(consumerRoot, 'package.json'), JSON.stringify({ dependencies: { '@acme/missing': 'catalog:' } }));

    await expect(generate()).rejects.toThrow(/@acme\/missing.*pnpm-workspace.yaml/);
  });

  it.each([
    ['@acme/kit', 'workspace:*'],
    ['@acme/kit', 'workspace:^'],
    ['@acme/kit', 'workspace:~'],
    ['@acme/kit', 'workspace:^1.0.0'],
    ['kit-alias', 'workspace:@acme/kit@*'],
    ['@acme/kit', 'workspace:../../packages/kit'],
  ])('links %s@%s without copying its unresolved catalog dependencies', async (name, spec) => {
    await writeFile(join(root, 'pnpm-workspace.yaml'), 'packages: [apps/*, packages/*]\ncatalog:\n  react: ^19.0.0\n');
    const kit = join(root, 'packages/kit');
    await mkdir(kit, { recursive: true });
    await writeFile(join(kit, 'package.json'), JSON.stringify({
      name: '@acme/kit', version: '1.2.3', dependencies: { react: 'catalog:' },
    }));
    await writeFile(join(consumerRoot, 'package.json'), JSON.stringify({
      name: 'demo', dependencies: { [name]: spec },
    }));

    expect((await generate()).dependencies[name]).toBe(`link:${kit}`);
  });

  it('rejects workspace versions that do not satisfy the declared range', async () => {
    await writeFile(join(root, 'pnpm-workspace.yaml'), 'packages: [apps/*, packages/*]\n');
    await mkdir(join(root, 'packages/kit'), { recursive: true });
    await writeFile(join(root, 'packages/kit/package.json'), JSON.stringify({ name: '@acme/kit', version: '1.2.3' }));
    await writeFile(join(consumerRoot, 'package.json'), JSON.stringify({ dependencies: { '@acme/kit': 'workspace:^2.0.0' } }));

    await expect(generate()).rejects.toThrow(/@acme\/kit@workspace:\^2.0.0.*workspace/);
  });

  it('rejects missing workspace packages instead of passing the protocol to pnpm install', async () => {
    await writeFile(join(root, 'pnpm-workspace.yaml'), 'packages: [apps/*]\n');
    await writeFile(join(consumerRoot, 'package.json'), JSON.stringify({
      name: 'demo', dependencies: { '@acme/missing': 'workspace:*' },
    }));

    await expect(generate()).rejects.toThrow(/@acme\/missing.*workspace/);
  });
});
