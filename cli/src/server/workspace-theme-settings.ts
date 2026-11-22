import postcss, { type Declaration, type Rule } from 'postcss';
import { canonicalPageSize } from '../utils/page-size-presets.js';
import { RenderError } from './errors.js';
import type { WorkspaceThemes } from './workspace-themes.js';

const hex = /^#(?:[a-f0-9]{3}|[a-f0-9]{6})$/i;
const sides = ['top', 'right', 'bottom', 'left'] as const;
const defaultsFields = new Set(['pageSize', 'fontFamily', 'fontSize', 'lineHeight', 'margins']);

function invalid(message: string): never {
  throw new RenderError('VALIDATION_ERROR', message, 400);
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(`${label} must be an object`);
  return value as Record<string, unknown>;
}

export function readThemeDefaults(value: unknown) {
  const defaults = object(value, 'Document defaults');
  for (const [field, input] of Object.entries(defaults)) {
    if (!defaultsFields.has(field)) invalid(`Unknown document default: ${field}`);
    if (field === 'pageSize') {
      try { defaults[field] = canonicalPageSize(input); }
      catch (error) { invalid((error as Error).message); }
    } else if (field === 'margins') {
      for (const [side, margin] of Object.entries(object(input, 'Margins'))) {
        if (!sides.some(value => value === side) || typeof margin !== 'number' || !Number.isFinite(margin) || margin < 0) invalid(`Invalid ${side} margin`);
      }
    } else if (field === 'fontFamily') {
      if (typeof input !== 'string' || !input.trim() || input.length > 512 || /[;{}<>\r\n]/.test(input)) invalid('Enter a valid font family or font stack');
    } else if (!(typeof input === 'number' && Number.isFinite(input) && input > 0) &&
        !(typeof input === 'string' && (
          /^(?:\d+\.?\d*|\.\d+)(?:pt|px|em|rem|%)$/.test(input) ||
          (field === 'lineHeight' && /^(?:\d+\.?\d*|\.\d+)$/.test(input))
        ) && parseFloat(input) > 0)) {
      invalid(`Invalid ${field}`);
    }
  }
  return defaults;
}

function paletteDeclarations(source: string, selector: string) {
  const css = postcss.parse(source, { from: undefined });
  const rules = css.nodes.filter((rule): rule is Rule => rule.type === 'rule' && rule.selector === selector);
  if (rules.length !== 1) invalid(`Expected one stylesheet rule for ${selector}, found ${rules.length}`);
  const declarations = new Map<string, Declaration>();
  for (const node of rules[0]!.nodes) {
    if (node.type !== 'decl' || !/^--[a-z][a-z0-9_-]*$/i.test(node.prop) || !hex.test(node.value)) continue;
    if (declarations.has(node.prop)) invalid(`Duplicate palette color: ${node.prop}`);
    declarations.set(node.prop, node);
  }
  return { css, declarations };
}

export function readWorkspaceThemeSettings(workspace: WorkspaceThemes, id: string) {
  const editor = workspace.get(id).editor;
  if (!editor) return null;
  const defaults = workspace.readFile(id, editor.defaults);
  const palette = workspace.readFile(id, editor.palette.file);
  const { declarations } = paletteDeclarations(palette.bytes.toString('utf8'), editor.palette.selector);
  return {
    defaults: readThemeDefaults(JSON.parse(defaults.bytes.toString('utf8'))),
    defaultsRevision: defaults.revision,
    colors: Object.fromEntries([...declarations].map(([name, node]) => [name, node.value])),
    colorsRevision: palette.revision,
    selector: editor.palette.selector,
  };
}

export function saveWorkspaceThemeSettings(options: { workspace: WorkspaceThemes; id: string; kind: string; value: unknown; revision: string }): string {
  const { workspace, id, kind, value, revision } = options;
  const editor = workspace.get(id).editor;
  if (!editor) invalid(`Theme ${id} does not declare editable settings`);
  if (!revision || revision === '*') invalid('A settings file revision is required');
  if (kind === 'defaults') {
    const bytes = Buffer.from(JSON.stringify(readThemeDefaults(value), null, 2) + '\n');
    return workspace.saveFile({ id, path: editor.defaults, bytes, revision });
  }
  if (kind !== 'colors') invalid(`Unknown theme settings: ${kind}`);
  const path = editor.palette.file;
  const source = workspace.readFile(id, path);
  if (source.revision !== revision) throw new RenderError('INVALID_REQUEST', `${path} changed on disk. Reload settings before saving.`, 412);
  const { css, declarations } = paletteDeclarations(source.bytes.toString('utf8'), editor.palette.selector);
  for (const [name, color] of Object.entries(object(value, 'Palette colors'))) {
    const declaration = declarations.get(name);
    if (!declaration || typeof color !== 'string' || !hex.test(color)) invalid(`Invalid palette color: ${name}`);
    declaration.value = color;
  }
  return workspace.saveFile({ id, path, bytes: Buffer.from(css.toString()), revision });
}
