import React, { useLayoutEffect, useRef, useState } from 'react';
import dagre from 'dagre';
import Arrow, { type ArrowProps } from './Arrow';
import BoxNode, { type BoxNodeProps } from './BoxNode';
import Diagram, { type IdFn } from './Diagram';
import type { DiagramColors } from './colors';

export type DiagramDirection = 'LR' | 'TB';
export interface DiagramGap { min: number; max: number }

export interface DiagreDiagramProps {
  children: (id: IdFn) => React.ReactNode;
  direction: DiagramDirection;
  gapX: DiagramGap;
  gapY: DiagramGap;
  colors?: DiagramColors;
  className?: string;
}

interface GraphNode { id: string; element: React.ReactElement<BoxNodeProps> }
interface GraphEdge { from: string; to: string }
interface MeasuredNode { id: string; width: number; height: number }

export function collectGraph(children: React.ReactNode): {
  nodes: GraphNode[];
  edges: GraphEdge[];
  arrows: React.ReactElement<ArrowProps>[];
} {
  const nodes: GraphNode[] = [];
  const arrows: React.ReactElement<ArrowProps>[] = [];
  const visit = (child: React.ReactNode) => {
    if (child == null || typeof child === 'boolean') return;
    if (Array.isArray(child)) return child.forEach(visit);
    if (!React.isValidElement(child)) throw new Error('DiagreDiagram children must be direct BoxNode or Arrow elements');
    if (child.type === React.Fragment) return React.Children.forEach((child.props as { children: React.ReactNode }).children, visit);
    if (child.type === BoxNode) {
      const node = child as React.ReactElement<BoxNodeProps>;
      if (!node.props.id) throw new Error('DiagreDiagram BoxNode requires an id');
      nodes.push({ id: node.props.id, element: node });
      return;
    }
    if (child.type === Arrow) {
      arrows.push(child as React.ReactElement<ArrowProps>);
      return;
    }
    throw new Error('DiagreDiagram requires direct BoxNode and Arrow children (fragments are allowed)');
  };
  visit(children);

  const endpoints = new Map<string, string>();
  for (const node of nodes) {
    for (const endpoint of [node.id, ...(node.element.props.ports ?? []).map((port) => port.id)]) {
      if (!endpoint || endpoints.has(endpoint)) throw new Error(`DiagreDiagram duplicate or empty endpoint: ${endpoint}`);
      endpoints.set(endpoint, node.id);
    }
  }
  const edges = arrows.map((arrow) => {
    const from = endpoints.get(arrow.props.from);
    const to = endpoints.get(arrow.props.to);
    if (!from || !to) throw new Error(`DiagreDiagram arrow endpoint missing: ${arrow.props.from} → ${arrow.props.to}`);
    return { from, to };
  });
  return { nodes, edges, arrows };
}

function validateGap(name: string, gap: DiagramGap): void {
  if (!gap || !Number.isFinite(gap.min) || !Number.isFinite(gap.max) || gap.min < 0 || gap.max < gap.min) {
    throw new Error(`DiagreDiagram ${name} requires 0 <= min <= max with finite values`);
  }
}

export function layoutGraph(options: {
  nodes: MeasuredNode[];
  edges: GraphEdge[];
  direction: DiagramDirection;
  gapX: DiagramGap;
  gapY: DiagramGap;
  availableWidth: number;
  availableHeight: number;
}): { positions: Record<string, { x: number; y: number }>; width: number; height: number } {
  validateGap('gapX', options.gapX);
  validateGap('gapY', options.gapY);
  if (options.direction !== 'LR' && options.direction !== 'TB') throw new Error(`DiagreDiagram invalid direction: ${options.direction}`);

  const build = (gapX: number, gapY: number) => {
    const graph = new dagre.graphlib.Graph();
    graph.setGraph({
      rankdir: options.direction,
      ranksep: options.direction === 'LR' ? gapX : gapY,
      nodesep: options.direction === 'LR' ? gapY : gapX,
      marginx: 0,
      marginy: 0,
    });
    graph.setDefaultEdgeLabel(() => ({}));
    for (const node of options.nodes) {
      if (!Number.isFinite(node.width) || !Number.isFinite(node.height) || node.width <= 0 || node.height <= 0) {
        throw new Error(`DiagreDiagram node ${node.id} has invalid dimensions`);
      }
      graph.setNode(node.id, { width: node.width, height: node.height });
    }
    for (const edge of options.edges) graph.setEdge(edge.from, edge.to);
    dagre.layout(graph);
    return graph;
  };

  let x = options.gapX.min;
  let y = options.gapY.min;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const previousX = x;
    const previousY = y;
    for (const axis of ['x', 'y'] as const) {
      const bound = axis === 'x' ? options.gapX : options.gapY;
      const available = axis === 'x' ? options.availableWidth : options.availableHeight;
      if (available <= 0) continue;
      let low = bound.min;
      let high = bound.max;
      for (let index = 0; index < 16; index += 1) {
        const middle = (low + high) / 2;
        const candidate = build(axis === 'x' ? middle : x, axis === 'y' ? middle : y);
        if ((axis === 'x' ? candidate.graph().width ?? 0 : candidate.graph().height ?? 0) <= available) low = middle;
        else high = middle;
      }
      if (axis === 'x') x = low;
      else y = low;
    }
    if (Math.abs(x - previousX) < 0.01 && Math.abs(y - previousY) < 0.01) break;
  }
  const graph = build(x, y);
  const width = graph.graph().width ?? 0;
  const height = graph.graph().height ?? 0;
  const offsetX = Math.max(0, (options.availableWidth - width) / 2);
  const offsetY = Math.max(0, (options.availableHeight - height) / 2);
  const positions: Record<string, { x: number; y: number }> = {};
  for (const node of options.nodes) {
    const position = graph.node(node.id);
    positions[node.id] = { x: position.x - node.width / 2 + offsetX, y: position.y - node.height / 2 + offsetY };
  }
  return { positions, width, height };
}

function DiagreLayout({ graph, direction, gapX, gapY, availableWidth, availableHeight }: {
  graph: ReturnType<typeof collectGraph>;
  direction: DiagramDirection;
  gapX: DiagramGap;
  gapY: DiagramGap;
  availableWidth: number;
  availableHeight: number;
}) {
  const elements = useRef(new Map<string, HTMLDivElement>());
  const [sizes, setSizes] = useState<Record<string, { width: number; height: number }>>({});
  const nodeIds = graph.nodes.map((node) => node.id).join('\u0000');

  useLayoutEffect(() => {
    const measure = () => {
      const next: typeof sizes = {};
      for (const node of graph.nodes) {
        const element = elements.current.get(node.id);
        if (element) {
          const rect = element.getBoundingClientRect();
          next[node.id] = { width: rect.width, height: rect.height };
        }
      }
      setSizes((current) => JSON.stringify(current) === JSON.stringify(next) ? current : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    for (const element of elements.current.values()) observer.observe(element);
    return () => observer.disconnect();
  }, [nodeIds]);

  const layoutCache = useRef<{ key: string; result: ReturnType<typeof layoutGraph> } | null>(null);
  const layoutKey = JSON.stringify({ sizes, edges: graph.edges, direction, gapX, gapY, availableWidth, availableHeight });
  if (graph.nodes.every((node) => sizes[node.id]?.width && sizes[node.id]?.height) && layoutCache.current?.key !== layoutKey) {
    layoutCache.current = {
      key: layoutKey,
      result: layoutGraph({
        nodes: graph.nodes.map((node) => ({ id: node.id, ...sizes[node.id] })),
        edges: graph.edges,
        direction, gapX, gapY, availableWidth, availableHeight,
      }),
    };
  }
  const layout = layoutCache.current?.key === layoutKey ? layoutCache.current.result : null;

  return (
    <div style={{ position: 'relative', width: '100%', minWidth: layout?.width, height: layout?.height ?? 0 }}>
      {graph.nodes.map((node) => (
        <div
          key={node.id}
          data-diagre-node={node.id}
          ref={(element) => { if (element) elements.current.set(node.id, element); else elements.current.delete(node.id); }}
          style={{
            position: 'absolute',
            left: layout?.positions[node.id].x ?? 0,
            top: layout?.positions[node.id].y ?? 0,
            visibility: layout ? 'visible' : 'hidden',
            width: 'max-content',
          }}
        >
          {node.element}
        </div>
      ))}
      {graph.arrows.map((arrow, index) => React.cloneElement(arrow, { key: `${arrow.key ?? index}-${layoutKey}` }))}
    </div>
  );
}

export default function DiagreDiagram({ children, direction, gapX, gapY, colors, className }: DiagreDiagramProps) {
  validateGap('gapX', gapX);
  validateGap('gapY', gapY);
  const rootRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new ResizeObserver(([entry]) => {
      const next = { width: entry.contentRect.width, height: entry.contentRect.height };
      setSize((current) => current.width === next.width && current.height === next.height ? current : next);
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} className={className} data-diagre-diagram style={{ width: '100%' }}>
      <Diagram key={`${direction}-${gapX.min}-${gapX.max}-${gapY.min}-${gapY.max}-${size.width}-${size.height}`} colors={colors}>
        {(id) => <DiagreLayout graph={collectGraph(children(id))} direction={direction} gapX={gapX} gapY={gapY} availableWidth={size.width} availableHeight={size.height} />}
      </Diagram>
    </div>
  );
}
