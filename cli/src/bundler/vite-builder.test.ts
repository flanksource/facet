import { describe, it, expect, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { isMissingDepError, prepareModules } from './vite-builder.js';
import { FacetDirectory } from '../builders/facet-directory.js';
import { Logger } from '../utils/logger.js';
import * as installed from '../runtime/installed.js';

it('removes temporary registry credentials when installed runtime selection fails', async () => {
  const parent = resolve('.tmp');
  mkdirSync(parent, { recursive: true });
  const root = mkdtempSync(join(parent, 'runtime-failure-'));
  vi.stubEnv('FACET_PACKAGE_PATH', '');
  const logger = new Logger(false);
  const facet = new FacetDirectory({ consumerRoot: root, buildRoot: root, templateFile: 'Report.tsx', logger });
  writeFileSync(join(root, 'package.json'), '{"dependencies":{"react":"18.3.1"}}');
  writeFileSync(join(root, '.npmrc'), '//registry.npmjs.org/:_authToken=example-token');
  vi.spyOn(installed, 'installedRuntimePayload').mockImplementation(() => { throw new Error('Missing installed payload'); });
  try {
    await expect(prepareModules(facet, logger)).rejects.toThrow('Missing installed payload');
    expect(existsSync(join(root, '.npmrc'))).toBe(false);
  } finally { vi.restoreAllMocks(); vi.unstubAllEnvs(); rmSync(root, { recursive: true, force: true }); }
});

describe('isMissingDepError', () => {
  describe('returns true for bare-specifier (package) resolution failures', () => {
    it('matches Vite "Failed to resolve import" with a package', () => {
      expect(isMissingDepError('Failed to resolve import "react" from "src/foo.tsx"')).toBe(true);
    });

    it('matches Rollup "Could not resolve" with a package', () => {
      expect(isMissingDepError('Could not resolve "react-dom/client" from ".facet/entry.tsx"')).toBe(true);
    });

    it('matches "Cannot find module" with a package', () => {
      expect(isMissingDepError("Error: Cannot find module 'vite'")).toBe(true);
    });

    it('matches scoped packages', () => {
      expect(isMissingDepError('Could not resolve "@flanksource/facet" from "entry.tsx"')).toBe(true);
    });

    it('matches ERR_MODULE_NOT_FOUND', () => {
      expect(isMissingDepError('code: ERR_MODULE_NOT_FOUND ...')).toBe(true);
    });
  });

  describe('returns false for relative-path (template bug) failures', () => {
    it('does not match a missing relative file', () => {
      expect(isMissingDepError('Could not resolve "./src/styles.css" from ".facet/entry.tsx"')).toBe(false);
    });

    it('does not match a missing absolute path', () => {
      expect(isMissingDepError('Cannot find module "/abs/path/to/file.tsx"')).toBe(false);
    });

    it('does not match parent-relative paths', () => {
      expect(isMissingDepError('Failed to resolve import "../missing.tsx" from "src/foo.tsx"')).toBe(false);
    });
  });

  describe('returns false for unrelated errors', () => {
    it('does not match a syntax error', () => {
      expect(isMissingDepError('SyntaxError: Unexpected token <')).toBe(false);
    });

    it('does not match an empty string', () => {
      expect(isMissingDepError('')).toBe(false);
    });
  });
});
