import type { GraphData, GraphNode } from '../types';

/** DOM id of the main graph <svg>, used by Export SVG */
export const GRAPH_SVG_ID = 'network-graph';

const linkEnd = (end: string | GraphNode) => (typeof end === 'string' ? end : end.id);

/**
 * Shortest chain of links from `fromId` to `toId` (breadth-first search).
 * Returns the node ids and link keys ("a|b", both directions) on the path,
 * or null when the two nodes aren't connected.
 */
export function findPath(
  graphData: GraphData,
  fromId: string,
  toId: string
): { nodes: Set<string>; links: Set<string> } | null {
  const adjacency = new Map<string, string[]>();
  graphData.links.forEach((l) => {
    const s = linkEnd(l.source);
    const t = linkEnd(l.target);
    if (!adjacency.has(s)) adjacency.set(s, []);
    if (!adjacency.has(t)) adjacency.set(t, []);
    adjacency.get(s)!.push(t);
    adjacency.get(t)!.push(s);
  });

  const previous = new Map<string, string | null>([[fromId, null]]);
  const queue = [fromId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === toId) break;
    for (const next of adjacency.get(current) ?? []) {
      if (!previous.has(next)) {
        previous.set(next, current);
        queue.push(next);
      }
    }
  }
  if (!previous.has(toId)) return null;

  const nodes = new Set<string>();
  const links = new Set<string>();
  for (let at: string | null = toId; at !== null; at = previous.get(at) ?? null) {
    nodes.add(at);
    const before = previous.get(at);
    if (before) {
      links.add(`${before}|${at}`);
      links.add(`${at}|${before}`);
    }
  }
  return { nodes, links };
}

/**
 * Starting positions for `count` new nodes that are about to be attached to
 * `parent`. They are laid out in rings on the side of the parent that faces
 * away from its existing neighbours, so a freshly explored cluster grows
 * outward instead of on top of the clusters already on screen. The force
 * layout in NetworkGraph then relaxes these into a natural cluster.
 */
export function seedPositionsAround(
  parent: GraphNode,
  graphData: GraphData,
  count: number
): Array<{ x: number; y: number }> {
  if (count === 0) return [];

  const px = parent.x ?? 400;
  const py = parent.y ?? 300;

  // Direction pointing away from where we came from (the parent's current neighbours)
  const neighbourIds = new Set<string>();
  graphData.links.forEach((l) => {
    const s = linkEnd(l.source);
    const t = linkEnd(l.target);
    if (s === parent.id) neighbourIds.add(t);
    if (t === parent.id) neighbourIds.add(s);
  });
  const neighbours = graphData.nodes.filter(
    (n) => neighbourIds.has(n.id) && n.x !== undefined && n.y !== undefined
  );

  let dir = 0;
  let span = 2 * Math.PI;
  if (neighbours.length > 0) {
    const cx = neighbours.reduce((sum, n) => sum + n.x!, 0) / neighbours.length;
    const cy = neighbours.reduce((sum, n) => sum + n.y!, 0) / neighbours.length;
    const dx = px - cx;
    const dy = py - cy;
    if (dx !== 0 || dy !== 0) {
      dir = Math.atan2(dy, dx);
      // Few nodes: a tidy fan; many nodes: wrap further round the parent
      span = count <= 6 ? Math.PI * 0.9 : count <= 14 ? Math.PI * 1.4 : 2 * Math.PI;
    }
  }

  const positions: Array<{ x: number; y: number }> = [];
  const spacing = 80; // distance between neighbouring seeds along a ring
  let ring = 0;
  while (positions.length < count) {
    const radius = 120 + ring * 85;
    const capacity = Math.max(1, Math.floor((span * radius) / spacing));
    const inRing = Math.min(capacity, count - positions.length);
    for (let i = 0; i < inRing; i++) {
      const t = span >= 2 * Math.PI ? i / inRing : inRing === 1 ? 0.5 : i / (inRing - 1);
      // Offset alternate rings so nodes don't line up radially
      const angle = dir - span / 2 + t * span + (ring % 2) * (spacing / radius / 2);
      positions.push({ x: px + radius * Math.cos(angle), y: py + radius * Math.sin(angle) });
    }
    ring++;
  }
  return positions;
}
