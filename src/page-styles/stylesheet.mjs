import postcss from 'postcss';

// The recipe owns the cascade layer. Flatten Tailwind's build layers in order
// so element defaults cannot outrank library utilities through a nested layer.
export function flattenStylesheetLayers(css) {
  const root = postcss.parse(css);
  const layered = postcss.root();
  for (const name of ['theme', 'base', 'facet', 'components', 'utilities']) {
    for (const node of [...root.nodes]) {
      if (node.type !== 'atrule' || node.name !== 'layer' || node.params !== name || !node.nodes) continue;
      layered.append(node.nodes);
      node.remove();
    }
  }
  root.walkAtRules('layer', (rule) => {
    if (!rule.nodes) rule.remove();
  });
  const imports = root.nodes.filter((node) => node.type === 'atrule' && node.name === 'import');
  for (const node of imports) node.remove();
  return postcss.root({ nodes: [...imports, ...layered.nodes, ...root.nodes] }).toString();
}
