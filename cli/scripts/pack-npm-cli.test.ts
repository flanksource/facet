// Tests the @flanksource/facet-cli npm package assembly: the CLI bundle, the
// runtime assets shipped beside it, and the version-pinned package.json.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const { buildPackage } = require('./pack-npm-cli.cjs');

describe('buildPackage', () => {
  let root: string;
  beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'facet-pack-')); });
  afterEach(() => { rmSync(root, { recursive: true, force: true }); });

  it('assembles the bundle, runtime assets, and a version-pinned package.json', () => {
    const repoRoot = join(root, 'repo');
    const templateDir = join(root, 'tmpl');
    const outDir = join(root, 'out');
    mkdirSync(join(repoRoot, 'dist'), { recursive: true });
    mkdirSync(join(repoRoot, 'node_modules', 'mermaid', 'dist'), { recursive: true });
    mkdirSync(templateDir, { recursive: true });
    writeFileSync(join(repoRoot, 'package.json'), JSON.stringify({ name: '@flanksource/facet', version: '1.0.0' }));
    writeFileSync(join(repoRoot, 'dist', 'styles.css'), '.compiled{}');
    writeFileSync(join(repoRoot, 'openapi.yaml'), 'openapi: 3.0.0');
    writeFileSync(join(repoRoot, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js'), 'window.mermaid={}');
    const bundlePath = join(root, 'cli.cjs');
    writeFileSync(bundlePath, '#!/usr/bin/env node\nconsole.log(1)');
    writeFileSync(join(templateDir, 'package.json'), JSON.stringify({ name: '@flanksource/facet-cli', version: '0.0.0', bin: { facet: 'facet.cjs' } }));
    writeFileSync(join(templateDir, 'README.md'), '# cli');

    buildPackage({ version: '9.9.9', bundlePath, repoRoot, templateDir, outDir });

    expect(existsSync(join(outDir, 'facet.cjs'))).toBe(true);
    expect(existsSync(join(outDir, 'assets', 'styles.css'))).toBe(true);
    expect(readFileSync(join(outDir, 'assets', 'styles.css'), 'utf8')).toBe('.compiled{}');
    expect(existsSync(join(outDir, 'assets', 'openapi.yaml'))).toBe(true);
    expect(readFileSync(join(outDir, 'assets', 'mermaid.min.js'), 'utf8')).toBe('window.mermaid={}');
    expect(existsSync(join(outDir, 'README.md'))).toBe(true);

    const pkg = JSON.parse(readFileSync(join(outDir, 'package.json'), 'utf8'));
    expect(pkg.version).toBe('9.9.9');
    expect(pkg.bin.facet).toBe('facet.cjs');
    // The shipped manifest is the @flanksource/facet component library.
    expect(JSON.parse(readFileSync(join(outDir, 'assets', 'package.json'), 'utf8')).name).toBe('@flanksource/facet');
  });
});
