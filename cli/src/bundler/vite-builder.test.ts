import { describe, it, expect } from 'bun:test';
import { isMissingDepError } from './vite-builder.js';

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
