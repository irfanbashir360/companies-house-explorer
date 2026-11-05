import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { GraphNode, GraphLink, NodeType } from '../types';
import { useGraphStore } from '../store/graphStore';
import { analyzeNetwork, type ShellCompanyAnalysis } from '../utils/networkAnalysis';
import { GRAPH_SVG_ID, findPath } from '../utils/layout';
import { Maximize2 } from 'lucide-react';
import { COLOR, NODE_ACCENT, NODE_BORDER, NODE_FILL, RISK_COLOR } from '../theme';

interface NetworkGraphProps {
  onNodeClick: (node: GraphNode) => void;
}

interface SimulationNode extends GraphNode {
  x: number;
  y: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
}

interface SimulationLink extends GraphLink {
  source: SimulationNode;
  target: SimulationNode;
}

interface OverlayLink {
  source: SimulationNode;
  target: SimulationNode;
  label?: string;
}

// Node radius by type
const NODE_RADIUS: Record<NodeType, number> = {
  company: 34,
  officer: 24,
  psc: 24,
  charge: 20,
  filing: 18,
  establishment: 24,
};

const HALO_GAP = 6;
const HALO_WIDTH = 5;

// Icons drawn on a 24x24 grid
const ICONS: Partial<Record<NodeType, { paths: string[]; filled: boolean }>> = {
  company: {
    filled: false,
    paths: [
      'M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z',
      'M10 22v-4h4v4',
      'M10 6h.01M14 6h.01M10 10h.01M14 10h.01M10 14h.01M14 14h.01',
    ],
  },
  officer: {
    filled: true,
    paths: ['M12 3a4.2 4.2 0 1 1 0 8.4A4.2 4.2 0 0 1 12 3Z', 'M3.5 21a8.5 7.5 0 0 1 17 0Z'],
  },
  psc: {
    filled: true,
    paths: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'],
  },
};

// Split a label into at most two short lines so neighbours' labels don't collide
const MAX_LINE = 18;
function wrapLabel(label: string): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of (label || '').split(/\s+/).filter(Boolean)) {
    if (!current) current = word;
    else if (current.length + 1 + word.length <= MAX_LINE) current += ` ${word}`;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);

  const clip = (s: string) => s.slice(0, MAX_LINE - 1).trimEnd() + '…';
  const out = lines.slice(0, 2).map((l) => (l.length > MAX_LINE ? clip(l) : l));
  if (lines.length > 2 && !out[1].endsWith('…')) out[1] = clip(out[1]);
  return out;
}

// Space each node claims in the layout: its circle (plus risk halo) and its label
const collideRadius = (d: SimulationNode) =>
  NODE_RADIUS[d.type] + (d.type === 'company' ? 34 : 28);

const linkEndId = (end: string | GraphNode) => (typeof end === 'string' ? end : end.id);

export const NetworkGraph: React.FC<NetworkGraphProps> = ({ onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<SimulationNode, SimulationLink> | null>(null);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  // Latest on-screen positions, so a layout interrupted by a new expansion
  // carries on from where nodes actually are rather than jumping back.
  const livePositions = useRef(new Map<string, { x: number; y: number }>());
  // Current element selections, so hovering a Trail step can restyle without a full redraw
  const selectionsRef = useRef<{
    nodes: d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown>;
    labels: d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown>;
    links: d3.Selection<SVGLineElement, SimulationLink, SVGGElement, unknown>;
    linkLabels: d3.Selection<SVGTextElement, SimulationLink, SVGGElement, unknown>;
    overlay: d3.Selection<SVGLineElement, OverlayLink, SVGGElement, unknown>;
  } | null>(null);
  // Zooms the view so the whole network fits; set by the render effect
  const fitRef = useRef<(animate: boolean) => void>(() => {});
  // Set when a layout settles off-screen: the redraw that follows zooms to fit
  const pendingFitRef = useRef(false);
  const { graphData, selectedNode, filters, updateNode, updateNodes, trail, highlightId } = useGraphStore();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Forget positions when the graph is cleared (subscribe fires synchronously,
  // even when React batches the clear with the next search's first node).
  useEffect(
    () =>
      useGraphStore.subscribe((state) => {
        if (state.graphData.nodes.length === 0) livePositions.current.clear();
      }),
    []
  );

  // Track the canvas size (it changes when the details panel opens or closes, not only on window resize)
  useEffect(() => {
    const parent = svgRef.current?.parentElement;
    if (!parent) return;
    const update = () => setDimensions({ width: parent.clientWidth, height: parent.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  // Render graph
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const { nodes, links } = graphData;

    if (nodes.length === 0) {
      selectionsRef.current = null;
      return;
    }

    // Filter nodes based on filters
    const filteredNodes = nodes.filter((node) => {
      const filterMap = {
        company: filters.companies,
        officer: filters.officers,
        psc: filters.pscs,
        charge: filters.charges,
        filing: filters.filings,
        establishment: filters.establishments,
      };
      return filterMap[node.type] ?? true;
    });

    // New (not yet settled) nodes have no fixed position: lay the graph out again.
    const needsLayout = filteredNodes.some((n) => n.fx == null || n.fy == null);

    const simNodes: SimulationNode[] = filteredNodes.map((node) => {
      const live = node.pinned ? undefined : livePositions.current.get(node.id);
      const x = live?.x ?? node.x ?? width / 2 + (Math.random() - 0.5) * 200;
      const y = live?.y ?? node.y ?? height / 2 + (Math.random() - 0.5) * 200;
      // During a layout only pinned nodes stay put; everything else may shift
      // a little to make room for the new cluster.
      const fixed = !needsLayout || node.pinned;
      return { ...node, x, y, fx: fixed ? x : null, fy: fixed ? y : null };
    });

    const nodeById = new Map(simNodes.map((n) => [n.id, n]));
    const filteredNodeIds = new Set(nodeById.keys());

    const simLinks: SimulationLink[] = links
      .filter((l) => filteredNodeIds.has(linkEndId(l.source)) && filteredNodeIds.has(linkEndId(l.target)))
      .map((l) => ({
        ...l,
        source: nodeById.get(linkEndId(l.source))!,
        target: nodeById.get(linkEndId(l.target))!,
      }));

    // Number of connections per node: busy companies get a roomier cluster
    const degree = new Map<string, number>();
    simLinks.forEach((l) => {
      degree.set(l.source.id, (degree.get(l.source.id) ?? 0) + 1);
      degree.set(l.target.id, (degree.get(l.target.id) ?? 0) + 1);
    });

    // Network analysis: shared officers, shell risk, overlay links
    const analysis = analyzeNetwork(graphData);
    const riskMap = new Map<string, ShellCompanyAnalysis>(
      analysis.shellCompanyRisks.map((r) => [r.companyId, r])
    );
    const riskLevel = (d: SimulationNode) =>
      d.type === 'company' ? riskMap.get(d.id)?.riskLevel : undefined;

    const overlayLinkData: OverlayLink[] = analysis.suspiciousLinks
      .map((link): OverlayLink | null => {
        const source = nodeById.get(linkEndId(link.source));
        const target = nodeById.get(linkEndId(link.target));
        if (!source || !target || source.type !== 'company' || target.type !== 'company') return null;
        return { source, target, label: link.label };
      })
      .filter(Boolean) as OverlayLink[];

    // Create container for zoom
    const container = svg.append('g');

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        transformRef.current = event.transform;
        container.attr('transform', event.transform.toString());
      });

    svg.call(zoom);
    svg.call(zoom.transform, transformRef.current);

    const fit = (animate: boolean) => {
      if (simNodes.length === 0) return;
      // Generous padding; extra on the right and bottom where the key and stats sit
      const xs = simNodes.map((n) => n.x);
      const ys = simNodes.map((n) => n.y);
      const minX = Math.min(...xs) - 70, maxX = Math.max(...xs) + 150;
      const minY = Math.min(...ys) - 70, maxY = Math.max(...ys) + 110;
      const k = Math.min(1.2, width / (maxX - minX), height / (maxY - minY));
      const t = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(k)
        .translate(-(minX + maxX) / 2, -(minY + maxY) / 2);
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (animate && !reduce) svg.transition().duration(450).call(zoom.transform, t);
      else svg.call(zoom.transform, t);
    };
    fitRef.current = fit;
    // Is any node outside the visible area at the current zoom?
    const outOfView = () => {
      const t = transformRef.current;
      return simNodes.some((n) => {
        const [x, y] = t.apply([n.x, n.y]);
        return x < 30 || y < 30 || x > width - 30 || y > height - 30;
      });
    };

    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    // Natural clusters: links hold each company's people near it, charge pushes
    // clusters apart, collision keeps circles and labels from overlapping.
    const simulation = d3
      .forceSimulation<SimulationNode>(simNodes)
      .force(
        'link',
        d3
          .forceLink<SimulationNode, SimulationLink>(simLinks)
          .id((d) => d.id)
          .distance((l) => {
            const hub = Math.max(degree.get(l.source.id) ?? 1, degree.get(l.target.id) ?? 1);
            return 80 + 10 * Math.sqrt(hub);
          })
      )
      .force(
        'charge',
        d3
          .forceManyBody<SimulationNode>()
          .strength((d) => (d.type === 'company' ? -600 : -250))
          .distanceMax(700)
      )
      .force('collision', d3.forceCollide<SimulationNode>().radius(collideRadius).strength(1).iterations(3));

    // Without any pinned anchor, gently hold the graph in view
    if (!simNodes.some((n) => n.pinned)) {
      simulation
        .force('x', d3.forceX<SimulationNode>(width / 2).strength(0.02))
        .force('y', d3.forceY<SimulationNode>(height / 2).strength(0.02));
    }

    if (needsLayout) {
      // Settle in roughly a second and a half, then freeze
      simulation.alpha(0.8).alphaDecay(0.05).alphaMin(0.01).velocityDecay(0.35);
    } else {
      simulation.alpha(0).stop();
    }

    simulationRef.current = simulation;

    // Shared-officer overlay (red dashed lines) – behind normal links
    const overlayGroup = container.append('g').attr('class', 'relationship-overlay');
    const overlayLineElements = overlayGroup
      .selectAll<SVGLineElement, OverlayLink>('line')
      .data(overlayLinkData)
      .join('line')
      .attr('stroke', COLOR.alert)
      .attr('stroke-width', 1.2)
      .attr('stroke-dasharray', '5 4')
      .attr('stroke-opacity', 0.4);

    // Links
    const linkElements = container
      .append('g')
      .attr('class', 'links')
      .selectAll<SVGLineElement, SimulationLink>('line')
      .data(simLinks)
      .join('line')
      .attr('stroke', COLOR.linkGrey)
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.8);

    // Link labels (role), with a white outline so they stay legible over lines
    const linkLabels = container
      .append('g')
      .attr('class', 'link-labels')
      .selectAll<SVGTextElement, SimulationLink>('text')
      .data(simLinks)
      .join('text')
      .attr('font-size', '9px')
      .attr('fill', COLOR.muted)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 3)
      .attr('paint-order', 'stroke')
      .attr('pointer-events', 'none')
      .text((d) => d.label || '');

    // Nodes
    let isDragging = false;
    let dragStartPos = { x: 0, y: 0 };

    const nodeElements = container
      .append('g')
      .attr('class', 'nodes')
      .selectAll<SVGGElement, SimulationNode>('g')
      .data(simNodes)
      .join('g')
      .attr('cursor', 'grab');

    // Labels are drawn after nodes so they sit on top of neighbouring circles
    const labels = container
      .append('g')
      .attr('class', 'labels')
      .selectAll<SVGGElement, SimulationNode>('g')
      .data(simNodes)
      .join('g')
      .attr('pointer-events', 'none');

    const updatePositions = () => {
      linkElements
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);
      linkLabels
        .attr('x', (d) => (d.source.x + d.target.x) / 2)
        .attr('y', (d) => (d.source.y + d.target.y) / 2);
      overlayLineElements
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);
      nodeElements.attr('transform', (d) => `translate(${d.x},${d.y})`);
      labels.attr('transform', (d) => `translate(${d.x},${d.y})`);
    };

    nodeElements.call(
      d3
        .drag<SVGGElement, SimulationNode>()
        .on('start', function (event, d) {
          isDragging = false;
          dragStartPos = { x: event.x, y: event.y };
          d3.select(this).attr('cursor', 'grabbing');
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', function (event, d) {
          if (Math.abs(event.x - dragStartPos.x) > 5 || Math.abs(event.y - dragStartPos.y) > 5) {
            isDragging = true;
          }
          d.fx = event.x;
          d.fy = event.y;
          d.x = event.x;
          d.y = event.y;
          updatePositions();
        })
        .on('end', function (_event, d) {
          d3.select(this).attr('cursor', 'grab');
          d.fx = d.x;
          d.fy = d.y;

          if (isDragging) {
            // A node the user placed by hand stays exactly where they put it
            livePositions.current.set(d.id, { x: d.x, y: d.y });
            updateNode(d.id, { x: d.x, y: d.y, fx: d.fx, fy: d.fy, pinned: true });
          } else {
            onNodeClick(d);
          }
          isDragging = false;
        })
    );

    // Selection ring
    nodeElements
      .filter((d) => selectedNode?.id === d.id)
      .append('circle')
      .attr('r', (d) => NODE_RADIUS[d.type] + (d.type === 'company' ? HALO_GAP + HALO_WIDTH + 4 : 6))
      .attr('fill', 'none')
      .attr('stroke', COLOR.nexis)
      .attr('stroke-width', 2.5);

    // Company halo: faint for low risk, solid red for high, dashed orange for medium
    nodeElements
      .filter((d) => d.type === 'company')
      .append('circle')
      .attr('r', (d) => NODE_RADIUS[d.type] + HALO_GAP)
      .attr('fill', 'none')
      .attr('stroke', (d) => {
        const level = riskLevel(d);
        return level === 'high' || level === 'medium' ? RISK_COLOR[level] : COLOR.ink;
      })
      .attr('stroke-opacity', (d) => {
        const level = riskLevel(d);
        return level === 'high' || level === 'medium' ? 1 : 0.12;
      })
      .attr('stroke-width', HALO_WIDTH)
      .attr('stroke-dasharray', (d) => (riskLevel(d) === 'medium' ? '8 4' : null));

    // Main circle
    nodeElements
      .append('circle')
      .attr('r', (d) => NODE_RADIUS[d.type])
      .attr('fill', (d) => NODE_FILL[d.type])
      .attr('stroke', (d) => NODE_BORDER[d.type] ?? 'none')
      .attr('stroke-width', 1.5);

    // Icon
    nodeElements.each(function (d) {
      const icon = ICONS[d.type];
      if (!icon) return;
      const size = NODE_RADIUS[d.type] * (d.type === 'company' ? 1.0 : 1.05);
      const g = d3
        .select(this)
        .append('g')
        .attr('transform', `translate(${-size / 2},${-size / 2}) scale(${size / 24})`)
        .attr('pointer-events', 'none');
      icon.paths.forEach((p) => {
        const path = g.append('path').attr('d', p);
        if (icon.filled) {
          path.attr('fill', NODE_ACCENT[d.type]);
        } else {
          path
            .attr('fill', 'none')
            .attr('stroke', NODE_ACCENT[d.type])
            .attr('stroke-width', 2)
            .attr('stroke-linecap', 'round')
            .attr('stroke-linejoin', 'round');
        }
      });
    });

    // Name labels: up to two short lines under the node
    labels.each(function (d) {
      const lines = wrapLabel(d.label);
      const top = NODE_RADIUS[d.type] + (d.type === 'company' ? HALO_GAP + HALO_WIDTH + 12 : 14);
      const text = d3
        .select(this)
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('font-weight', d.type === 'company' ? 600 : 500)
        .attr('fill', COLOR.ink)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 3)
        .attr('paint-order', 'stroke');
      lines.forEach((line, i) => {
        text.append('tspan').attr('x', 0).attr('y', top + i * 13).text(line);
      });
    });

    simulation.on('tick', () => {
      simNodes.forEach((n) => livePositions.current.set(n.id, { x: n.x, y: n.y }));
      updatePositions();
    });

    // Once settled, freeze every node where it landed and save in one update
    simulation.on('end', () => {
      if (!needsLayout) return;
      const updates = new Map<string, Partial<GraphNode>>();
      simNodes.forEach((n) => {
        n.fx = n.x;
        n.fy = n.y;
        updates.set(n.id, { x: n.x, y: n.y, fx: n.x, fy: n.y });
      });
      // Keep the whole network in view after it grows (done by the redraw below)
      if (outOfView()) pendingFitRef.current = true;
      updateNodes(updates);
    });

    updatePositions();

    // Fade smoothly when a Trail step is hovered
    container.selectAll('.nodes > g, .labels > g, .links line, .link-labels text').style('transition', 'opacity 150ms ease');
    if (pendingFitRef.current && !needsLayout) {
      pendingFitRef.current = false;
      fit(true);
    }

    selectionsRef.current = { nodes: nodeElements, labels, links: linkElements, linkLabels, overlay: overlayLineElements };

    return () => {
      simulation.stop();
    };
  }, [graphData, dimensions, selectedNode, filters, onNodeClick, updateNode, updateNodes]);

  // Trace the wire: when a Trail step is hovered, light up the chain of links
  // from the starting node to it and fade everything else.
  useEffect(() => {
    const sel = selectionsRef.current;
    if (!sel) return;
    const path =
      highlightId && trail[0] ? findPath(graphData, trail[0], highlightId) : null;

    if (!path) {
      sel.nodes.style('opacity', null);
      sel.labels.style('opacity', null);
      sel.linkLabels.style('opacity', null);
      sel.overlay.style('opacity', null);
      sel.links
        .style('opacity', null)
        .attr('stroke', COLOR.linkGrey)
        .attr('stroke-width', 1.5);
      return;
    }

    const onPath = (l: SimulationLink) => path.links.has(`${l.source.id}|${l.target.id}`);
    sel.nodes.style('opacity', (d) => (path.nodes.has(d.id) ? 1 : 0.25));
    sel.labels.style('opacity', (d) => (path.nodes.has(d.id) ? 1 : 0.2));
    sel.linkLabels.style('opacity', (l) => (onPath(l) ? 1 : 0));
    sel.overlay.style('opacity', 0.15);
    sel.links
      .style('opacity', (l) => (onPath(l) ? 1 : 0.2))
      .attr('stroke', (l) => (onPath(l) ? COLOR.nexis : COLOR.linkGrey))
      .attr('stroke-width', (l) => (onPath(l) ? 3 : 1.5));
    // Draw the traced links above the rest
    sel.links.filter(onPath).raise();
  }, [highlightId, trail, graphData, selectedNode, filters, dimensions]);

  return (
    <>
      <svg
        id={GRAPH_SVG_ID}
        ref={svgRef}
        className="w-full h-full block"
        style={{ minHeight: '400px' }}
        role="img"
        aria-label="Network of companies and the people connected to them"
      />
      {graphData.nodes.length > 0 && (
        <button
          type="button"
          onClick={() => fitRef.current(true)}
          title="Fit to screen"
          aria-label="Fit network to screen"
          className="absolute top-4 right-4 h-9 w-9 inline-flex items-center justify-center rounded-md bg-white border border-line text-muted hover:text-ink shadow-sm"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      )}
    </>
  );
};
