import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { GraphNode, GraphLink, NodeType } from '../types';
import { useGraphStore } from '../store/graphStore';
import { analyzeNetwork, type ShellCompanyAnalysis } from '../utils/networkAnalysis';
import { GRAPH_SVG_ID } from '../utils/layout';
import { Building2 } from 'lucide-react';

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

// Fill / icon colours ("refined circles": companies solid, people soft-tinted)
const NODE_FILL: Record<NodeType, string> = {
  company: '#0f172a',
  officer: '#f3e8ff',
  psc: '#fce7f3',
  charge: '#fef3c7',
  filing: '#d1fae5',
  establishment: '#cffafe',
};
const NODE_ACCENT: Record<NodeType, string> = {
  company: '#ffffff',
  officer: '#9333ea',
  psc: '#ec4899',
  charge: '#f59e0b',
  filing: '#10b981',
  establishment: '#06b6d4',
};
const NODE_BORDER: Partial<Record<NodeType, string>> = {
  officer: '#d8b4fe',
  psc: '#f9a8d4',
  charge: '#fcd34d',
  filing: '#6ee7b7',
  establishment: '#67e8f9',
};

const RISK_COLOR = { high: '#dc2626', medium: '#ea580c' } as const;
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
  const { graphData, selectedNode, filters, updateNode, updateNodes } = useGraphStore();
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

  // Update dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current?.parentElement) {
        setDimensions({
          width: svgRef.current.parentElement.clientWidth,
          height: svgRef.current.parentElement.clientHeight,
        });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Render graph
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const { nodes, links } = graphData;

    if (nodes.length === 0) {
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
      .attr('stroke', '#dc2626')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '6 4')
      .attr('stroke-opacity', 0.7);

    // Links
    const linkElements = container
      .append('g')
      .attr('class', 'links')
      .selectAll<SVGLineElement, SimulationLink>('line')
      .data(simLinks)
      .join('line')
      .attr('stroke', '#cbd5e1')
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
      .attr('fill', '#94a3b8')
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
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 2);

    // Company halo: faint for low risk, solid red for high, dashed orange for medium
    nodeElements
      .filter((d) => d.type === 'company')
      .append('circle')
      .attr('r', (d) => NODE_RADIUS[d.type] + HALO_GAP)
      .attr('fill', 'none')
      .attr('stroke', (d) => {
        const level = riskLevel(d);
        return level === 'high' || level === 'medium' ? RISK_COLOR[level] : '#0f172a';
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
        .attr('fill', '#1e293b')
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
      updateNodes(updates);
    });

    updatePositions();

    return () => {
      simulation.stop();
    };
  }, [graphData, dimensions, selectedNode, filters, onNodeClick, updateNode, updateNodes]);

  return (
    <div className="relative w-full h-full bg-white rounded-lg shadow-sm">
      <svg id={GRAPH_SVG_ID} ref={svgRef} className="w-full h-full" style={{ minHeight: '400px' }} />

      {graphData.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-slate-400">
            <Building2 className="w-16 h-16 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-semibold text-slate-600">Start Exploring</p>
            <p className="text-sm mt-2 text-slate-500">Search for a company or person above</p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-6 right-6 bg-white p-4 rounded-xl shadow-xl border border-slate-200 space-y-4">
        <div>
          <h3 className="text-xs font-semibold mb-3 text-slate-700 uppercase">Node Types</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: NODE_FILL.company }} />
              <span className="text-xs text-slate-700">Company</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3.5 h-3.5 rounded-full border"
                style={{ backgroundColor: NODE_FILL.officer, borderColor: NODE_ACCENT.officer }}
              />
              <span className="text-xs text-slate-700">Officer</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3.5 h-3.5 rounded-full border"
                style={{ backgroundColor: NODE_FILL.psc, borderColor: NODE_ACCENT.psc }}
              />
              <span className="text-xs text-slate-700">PSC</span>
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-xs font-semibold mb-3 text-slate-700 uppercase">Relationships</h3>
          <div className="flex items-center gap-2">
            <svg width="24" height="4" className="flex-shrink-0">
              <line x1="0" y1="2" x2="24" y2="2" stroke="#dc2626" strokeWidth="2" strokeDasharray="4 3" strokeOpacity="0.8" />
            </svg>
            <span className="text-xs text-slate-700">Shared officers</span>
          </div>
        </div>
        <div>
          <h3 className="text-xs font-semibold mb-3 text-slate-700 uppercase">Risk (shell analysis)</h3>
          <div className="space-y-2">
            {[
              { label: 'High', stroke: RISK_COLOR.high, opacity: 1, dash: undefined },
              { label: 'Medium', stroke: RISK_COLOR.medium, opacity: 1, dash: '3 2' },
              { label: 'Low', stroke: '#0f172a', opacity: 0.15, dash: undefined },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <svg width="16" height="16" className="flex-shrink-0">
                  <circle cx="8" cy="8" r="6" fill="none" stroke={item.stroke} strokeOpacity={item.opacity} strokeWidth="2.5" strokeDasharray={item.dash} />
                  <circle cx="8" cy="8" r="3.5" fill={NODE_FILL.company} />
                </svg>
                <span className="text-xs text-slate-700">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
