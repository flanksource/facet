// The `facet` oxlint plugin: guardrails for authoring facet diagrams. Reference it from a
// `.oxlintrc.json` (it is also what `facet lint` runs for `.tsx` templates):
//
//   {
//     "jsPlugins": ["@flanksource/facet/oxlint"],
//     "rules": { "facet/no-data-driven-diagram": "warn" }
//   }
//
// Self-contained on purpose: no imports, so the file can be copied or embedded as-is.

const FACET_SHAPES = new Set(["BoxNode", "ContainerNode", "BrandBox", "BrandContainer", "Tile", "Zone", "Arrow"]);
const SVG_SHAPES = new Set(["rect", "circle", "ellipse", "line", "polyline", "polygon", "path", "text", "g"]);
const ITERATORS = new Set(["map", "flatMap"]);
const SKIPPED_KEYS = new Set(["parent", "loc", "range", "start", "end", "type"]);

function isFacetSource(source) {
  return source === "@flanksource/facet" || (typeof source === "string" && source.startsWith("@flanksource/facet/"));
}

function isFunction(node) {
  return node?.type === "ArrowFunctionExpression" || node?.type === "FunctionExpression";
}

function iteratorName(callee) {
  const member = callee?.type === "ChainExpression" ? callee.expression : callee;
  if (member?.type !== "MemberExpression" || member.computed) return undefined;
  return ITERATORS.has(member.property?.name) ? member.property.name : undefined;
}

// `zones.map` as written; a long receiver (a chained call) collapses to `….map`.
function calleeLabel(text, name) {
  return text.length <= 40 && !text.includes("\n") ? text : `….${name}`;
}

// Every name a binding pattern introduces: `a`, `{ x, y: z }`, `[a, ...rest]`, `a = 1`.
function bindingNames(pattern, out) {
  if (!pattern) return out;
  switch (pattern.type) {
    case "Identifier":
      out.add(pattern.name);
      break;
    case "ObjectPattern":
      for (const property of pattern.properties) bindingNames(property.type === "RestElement" ? property.argument : property.value, out);
      break;
    case "ArrayPattern":
      for (const element of pattern.elements) bindingNames(element, out);
      break;
    case "AssignmentPattern":
      bindingNames(pattern.left, out);
      break;
    case "RestElement":
      bindingNames(pattern.argument, out);
      break;
  }
  return out;
}

// Names read by an expression. Non-computed member properties and object keys are not reads.
function referencedNames(node, out = new Set()) {
  if (!node || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const child of node) referencedNames(child, out);
    return out;
  }
  if (node.type === "Identifier" || node.type === "JSXIdentifier") {
    out.add(node.name);
    return out;
  }
  if (node.type === "MemberExpression" && !node.computed) return referencedNames(node.object, out);
  for (const [key, value] of Object.entries(node)) {
    if (SKIPPED_KEYS.has(key)) continue;
    if (key === "key" && node.type === "Property" && !node.computed) continue;
    referencedNames(value, out);
  }
  return out;
}

function intersects(names, tainted) {
  for (const name of names) if (tainted.has(name)) return true;
  return false;
}

function visitChildren(node, visit) {
  for (const [key, value] of Object.entries(node)) {
    if (SKIPPED_KEYS.has(key)) continue;
    if (Array.isArray(value)) {
      for (const child of value) if (child?.type) visit(child);
    } else if (value?.type) visit(value);
  }
}

function diagramIteratorCalls(program) {
  const scopes = new WeakMap();
  const owners = new WeakMap();
  const functions = new Set();
  const calls = [];
  const elements = [];
  const roots = new Set();
  const edges = new Map();
  const containers = new Set(['Diagram', 'FlowDiagram', 'DiagreDiagram']);
  const functionNode = node => isFunction(node) || node.type === 'FunctionDeclaration';
  function index(node, scope, owner) {
    if (node.type === 'FunctionDeclaration' && node.id) scope.bindings.set(node.id.name, node);
    if (functionNode(node)) {
      functions.add(node);
      owner = node;
      scope = { parent: scope, bindings: new Map() };
      for (const param of node.params) for (const name of bindingNames(param, new Set())) scope.bindings.set(name, null);
    } else if (node.type === 'Program' || node.type === 'BlockStatement') {
      scope = { parent: scope, bindings: new Map() };
    }
    scopes.set(node, scope);
    owners.set(node, owner);
    if (node.type === 'VariableDeclarator') {
      for (const name of bindingNames(node.id, new Set())) scope.bindings.set(name, node.init);
    }
    if (node.type === 'ImportDeclaration') {
      for (const spec of node.specifiers) {
        const imported = spec.imported?.name ?? spec.imported?.value;
        scope.bindings.set(spec.local.name, isFacetSource(node.source.value)
          ? { diagram: containers.has(imported), namespace: spec.type === 'ImportNamespaceSpecifier' } : null);
      }
    }
    if (node.type === 'CallExpression') calls.push(node);
    if (node.type === 'JSXElement') elements.push(node);
    visitChildren(node, child => index(child, scope, owner));
  }
  index(program, undefined, undefined);
  function lookup(node, name) {
    for (let scope = scopes.get(node); scope; scope = scope.parent) {
      if (scope.bindings.has(name)) return scope.bindings.get(name);
    }
    return undefined;
  }
  function resolveFunction(node, seen = new Set()) {
    if (!node || seen.has(node)) return undefined;
    if (functions.has(node)) return node;
    seen.add(node);
    return node.type === 'Identifier' ? resolveFunction(lookup(node, node.name), seen) : undefined;
  }
  function link(from, to) {
    if (!from || !to) return;
    if (!edges.has(from)) edges.set(from, new Set());
    edges.get(from).add(to);
  }
  for (const node of elements) {
    const tag = node.openingElement.name;
    const binding = tag.type === 'JSXIdentifier' ? lookup(node, tag.name)
      : tag.type === 'JSXMemberExpression' && tag.object.type === 'JSXIdentifier' ? lookup(node, tag.object.name) : undefined;
    if (binding?.diagram || (binding?.namespace && containers.has(tag.property?.name))) roots.add(owners.get(node));
    if (tag.type === 'JSXIdentifier') link(owners.get(node), resolveFunction(binding));
  }
  for (const call of calls) {
    link(owners.get(call), resolveFunction(call.callee));
    for (const arg of call.arguments) link(owners.get(call), resolveFunction(arg));
  }
  // Render-prop callbacks are part of their enclosing component's JSX.
  for (const fn of functions) {
    let parent = fn.parent;
    while (parent && !functionNode(parent) && parent.type !== 'Program') parent = parent.parent;
    if (parent && functions.has(parent) && fn.parent?.type === 'JSXExpressionContainer') link(parent, fn);
  }
  const active = new Set();
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const [caller, targets] of edges) {
      if (!roots.has(caller) && [...targets].some(target => roots.has(target))) {
        roots.add(caller);
        expanded = true;
      }
    }
  }
  function activate(fn) {
    if (!fn || active.has(fn)) return;
    active.add(fn);
    for (const child of edges.get(fn) ?? []) activate(child);
  }
  for (const root of roots) activate(root);
  function producesJsx(fn, seen = new Set()) {
    if (!fn || seen.has(fn)) return false;
    seen.add(fn);
    function valueHasJsx(node, values = new Set()) {
      if (!node || values.has(node)) return false;
      values.add(node);
      if (node.type === 'JSXElement' || node.type === 'JSXFragment') return true;
      if (node.type === 'Identifier') return valueHasJsx(lookup(node, node.name), values);
      if (node.type === 'CallExpression') return !iteratorName(node.callee) && producesJsx(resolveFunction(node.callee), seen);
      let found = false;
      if (!functionNode(node)) visitChildren(node, child => { if (valueHasJsx(child, values)) found = true; });
      return found;
    }
    if (fn.body.type !== 'BlockStatement') return valueHasJsx(fn.body);
    let found = false;
    function scanReturns(node) {
      if (functionNode(node)) return;
      if (node.type === 'ReturnStatement' && valueHasJsx(node.argument)) found = true;
      visitChildren(node, scanReturns);
    }
    scanReturns(fn.body);
    return found;
  }
  return new Set(calls.filter(call => iteratorName(call.callee) && active.has(owners.get(call)) && producesJsx(resolveFunction(call.arguments[0]))));
}

const rule = {
  meta: {
    type: "suggestion",
    docs: { description: "Disallow diagram shapes that are generated from data inside .map/.flatMap callbacks" },
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    const facetNames = new Set();
    const facetNamespaces = new Set();
    const callbacks = new Map();
    const frames = [];
    let generatedCalls = new Set();

    function tagOf(opening) {
      const name = opening.name;
      if (name.type === "JSXIdentifier") {
        if (SVG_SHAPES.has(name.name) || facetNames.has(name.name)) return sourceCode.getText(name);
        return undefined;
      }
      if (name.type === "JSXMemberExpression" && name.object.type === "JSXIdentifier") {
        if (facetNamespaces.has(name.object.name) && FACET_SHAPES.has(name.property.name)) return sourceCode.getText(name);
      }
      return undefined;
    }

    // Own attributes (except React's `key`) and direct expression children. Nested iterator calls
    // are skipped: the shapes they produce are reported themselves.
    function ownExpressions(element) {
      const expressions = [];
      for (const attribute of element.openingElement.attributes) {
        if (attribute.type === "JSXSpreadAttribute") expressions.push(attribute.argument);
        else if (attribute.name.name !== "key" && attribute.value?.type === "JSXExpressionContainer") expressions.push(attribute.value.expression);
      }
      for (const child of element.children) {
        if (child.type === "JSXSpreadChild") expressions.push(child.expression);
        else if (child.type === "JSXExpressionContainer" && !isIteratorCall(child.expression)) expressions.push(child.expression);
      }
      return expressions;
    }

    function isIteratorCall(expression) {
      const call = expression?.type === "ChainExpression" ? expression.expression : expression;
      return call?.type === "CallExpression" && iteratorName(call.callee) !== undefined;
    }

    function enterFunction(node) {
      const callee = callbacks.get(node);
      if (callee) frames.push({ callee, tainted: node.params.reduce((names, param) => bindingNames(param, names), new Set()) });
    }

    function exitFunction(node) {
      if (callbacks.has(node)) frames.pop();
    }

    return {
      Program(program) {
        generatedCalls = diagramIteratorCalls(program);
        for (const statement of program.body) {
          if (statement.type !== "ImportDeclaration" || !isFacetSource(statement.source.value)) continue;
          for (const specifier of statement.specifiers) {
            if (specifier.type === "ImportSpecifier") {
              const imported = specifier.imported.name ?? specifier.imported.value;
              if (FACET_SHAPES.has(imported)) facetNames.add(specifier.local.name);
            } else {
              facetNamespaces.add(specifier.local.name);
            }
          }
        }
      },
      CallExpression(node) {
        if (!iteratorName(node.callee)) return;
        if (generatedCalls.has(node)) context.report({
          node: node.callee,
          message: `Diagram JSX is generated by \`${calleeLabel(sourceCode.getText(node.callee), iteratorName(node.callee))}\`; write each diagram element explicitly as JSX so it can be edited in place.`,
        });
        const callback = node.arguments[0];
        if (isFunction(callback)) callbacks.set(callback, calleeLabel(sourceCode.getText(node.callee), iteratorName(node.callee)));
      },
      ArrowFunctionExpression: enterFunction,
      "ArrowFunctionExpression:exit": exitFunction,
      FunctionExpression: enterFunction,
      "FunctionExpression:exit": exitFunction,
      VariableDeclarator(node) {
        const frame = frames.at(-1);
        if (frame && node.init && intersects(referencedNames(node.init), frame.tainted)) bindingNames(node.id, frame.tainted);
      },
      JSXElement(node) {
        if (frames.length === 0) return;
        for (let parent = node.parent; parent; parent = parent.parent) if (generatedCalls.has(parent)) return;
        const tag = tagOf(node.openingElement);
        if (!tag) return;
        const names = referencedNames(ownExpressions(node));
        const frame = frames.findLast((candidate) => intersects(names, candidate.tainted));
        if (!frame) return;
        context.report({
          node: node.openingElement,
          message: `\`<${tag}>\` is drawn from data (\`${frame.callee}\`); write each diagram shape as JSX so it can be edited in place.`,
        });
      },
    };
  },
};

export default {
  meta: { name: "facet" },
  rules: { "no-data-driven-diagram": rule },
};
