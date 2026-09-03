/**
 * Removes classified regions from a Markdown document before it is compiled.
 *
 * A region is delimited by an element — `<Classified>` by default — carrying one
 * or more classifying attributes. The caller declares, per attribute, which
 * values the artifact being built is permitted to carry; a region whose value is
 * not permitted is deleted from the tree.
 *
 * Two properties matter and both are deliberate:
 *
 * - **Removal, not concealment.** This runs on mdast, before the SSR bundle is
 *   built, so redacted text is absent from the bundle as well as the output.
 *   Hiding a region with CSS leaves the text in the file for anyone who looks.
 *
 * - **Membership, not ranking.** Permitted values are an explicit set. A
 *   classification scheme is not necessarily a total order — a tier may be less
 *   sensitive than another yet reach a wider audience — so a `level <= clearance`
 *   comparison would silently misfile exactly those cases.
 *
 * Unknown attributes fail the build rather than passing through: forgetting to
 * declare a policy must never publish the content it was meant to govern.
 *
 * Copied into `.facet/` rather than imported from `@flanksource/facet`, for the
 * same reason as facet-font-scale.mjs — `.facet` pins whatever facet version the
 * consumer declared, which may predate this file.
 */

const ATTRIBUTE = /([A-Za-z_][-A-Za-z0-9_]*)\s*=\s*"([^"]*)"/g;

function parseOpenTag(value, element) {
  const match = new RegExp(`^<${element}(\\s[^>]*)?>$`).exec(value.trim());
  if (!match) return null;
  const attributes = {};
  for (const [, name, attributeValue] of (match[1] ?? '').matchAll(ATTRIBUTE)) {
    attributes[name] = attributeValue;
  }
  return attributes;
}

function isCloseTag(value, element) {
  return value.trim() === `</${element}>`;
}

function htmlRegionParts(node, element, inline) {
  const parts = [];
  let value = '';
  const flush = () => {
    if (value) parts.push({ kind: 'node', node: { ...node, value } });
    value = '';
  };

  const lines = node.value.split('\n');
  for (const [index, line] of lines.entries()) {
    const attributes = parseOpenTag(line, element);
    if (attributes) {
      flush();
      parts.push({ kind: 'open', attributes, inline });
    } else if (isCloseTag(line, element)) {
      flush();
      parts.push({ kind: 'close', inline });
    } else {
      value += line;
      if (index < lines.length - 1) value += '\n';
    }
  }
  flush();
  return parts;
}

/** MDX keeps the element as a node; plain Markdown may combine boundaries and adjacent content. */
function regionParts(node, element, inline = false) {
  if (node.type === 'mdxJsxFlowElement' && node.name === element) {
    const attributes = {};
    for (const attribute of node.attributes ?? []) {
      if (attribute.type === 'mdxJsxAttribute' && typeof attribute.value === 'string') {
        attributes[attribute.name] = attribute.value;
      }
    }
    return [{ kind: 'element', attributes, inline, node }];
  }
  if (node.type === 'html') return htmlRegionParts(node, element, inline);
  if (Array.isArray(node.children)) {
    const parts = [];
    let children = [];
    const flush = () => {
      if (children.length > 0) parts.push({ kind: 'node', node: { ...node, children } });
      children = [];
    };
    for (const child of node.children) {
      for (const part of regionParts(child, element, true)) {
        if (part.kind === 'node') children.push(part.node);
        else {
          flush();
          parts.push(part);
        }
      }
    }
    flush();
    return parts;
  }
  return [{ kind: 'node', node }];
}

function permits(allow, attributes, element) {
  for (const [name, value] of Object.entries(attributes)) {
    const permitted = allow[name];
    if (!permitted) {
      throw new Error(
        `<${element}> declares ${name}="${value}" but no policy was given for ${name}. `
        + `Declare the permitted ${name} values for this build.`,
      );
    }
    if (!permitted.includes(value)) return false;
  }
  return true;
}

export default function facetRedact(options = {}) {
  const element = options.element ?? 'Classified';
  const allow = options.allow ?? {};

  return (tree) => {
    const children = [];
    let open = null;
    let body = [];

    for (const node of tree.children) {
      for (const part of regionParts(node, element)) {
        // MDX gives the whole region as one node, so it resolves immediately.
        if (part.kind === 'element') {
          if (part.inline) throw new Error(`Inline <${element}> region`);
          if (permits(allow, part.attributes, element)) children.push(part.node);
          continue;
        }
        if (part.kind === 'open') {
          if (part.inline) throw new Error(`Inline <${element}> region`);
          if (open) throw new Error(`Nested <${element}> region`);
          open = part.attributes;
          body = [];
          continue;
        }
        if (part.kind === 'close') {
          if (!open) throw new Error(`Unmatched </${element}>`);
          if (permits(allow, open, element)) children.push(...body);
          open = null;
          continue;
        }
        (open ? body : children).push(part.node);
      }
    }

    if (open) throw new Error(`Unclosed <${element}> region`);
    tree.children = children;
  };
}
