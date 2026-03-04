import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { GraphNode, GraphLink } from '../types';
import { useGraphStore } from '../store/graphStore';
import { analyzeNetwork, type ShellCompanyAnalysis } from '../utils/networkAnalysis';
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

const NODE_SIZE = {
  company: 50,
  officer: 40,
  psc: 40,
  charge: 30,
  filing: 25,
  establishment: 35,
} as const;

const NODE_COLOR = {
  company: '#1e293b',
  officer: '#9333ea',
  psc: '#ec4899',
  charge: '#f59e0b',
  filing: '#10b981',
  establishment: '#06b6d4',
} as const;

export const NetworkGraph: React.FC<NetworkGraphProps> = ({ onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<SimulationNode, SimulationLink> | null>(null);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const { graphData, selectedNode, filters, updateNode } = useGraphStore();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

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

    // Check if all nodes have positions
    const allNodesHavePositions = filteredNodes.every(node =>
      node.x !== undefined && node.y !== undefined &&
      node.fx !== null && node.fx !== undefined &&
      node.fy !== null && node.fy !== undefined
    );

    // Create simulation nodes - all nodes are FIXED immediately
    const simNodes: SimulationNode[] = filteredNodes.map(node => {
      const hasPosition = node.x !== undefined && node.y !== undefined;
      const x = hasPosition ? node.x! : width / 2 + (Math.random() - 0.5) * 200;
      const y = hasPosition ? node.y! : height / 2 + (Math.random() - 0.5) * 200;

      return {
        ...node,
        x,
        y,
        fx: x, // ALWAYS fix position immediately
        fy: y,
      };
    });

    // Filter links to only include those between visible nodes
    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = links.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      return filteredNodeIds.has(sourceId) && filteredNodeIds.has(targetId);
    });

    // Create simulation links
    const simLinks: SimulationLink[] = filteredLinks.map(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      const source = simNodes.find(n => n.id === sourceId)!;
      const target = simNodes.find(n => n.id === targetId)!;
      return { ...link, source, target };
    });

    // Network analysis: shared officers, shell risk, overlay links
    const analysis = analyzeNetwork(graphData);
    const riskMap = new Map<string, ShellCompanyAnalysis>(
      analysis.shellCompanyRisks.map(r => [r.companyId, r])
    );
    const companyIdToNode = new Map(simNodes.filter(n => n.type === 'company').map(n => [n.id, n]));
    const overlayLinkData: OverlayLink[] = analysis.suspiciousLinks
      .map((link): OverlayLink | null => {
        const srcId = typeof link.source === 'string' ? link.source : link.source.id;
        const tgtId = typeof link.target === 'string' ? link.target : link.target.id;
        const source = companyIdToNode.get(srcId);
        const target = companyIdToNode.get(tgtId);
        if (!source || !target || !filteredNodeIds.has(srcId) || !filteredNodeIds.has(tgtId))
          return null;
        return { source, target, label: link.label };
      })
      .filter(Boolean) as OverlayLink[];

    // Create container for zoom
    const container = svg.append('g');

    // Setup zoom - preserve transform
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        transformRef.current = event.transform;
        container.attr('transform', event.transform.toString());
      });

    svg.call(zoom as any);

    // Apply saved transform
    svg.call(zoom.transform as any, transformRef.current);

    // Stop any existing simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    // Create force simulation - only run for new nodes without positions
    const simulation = d3.forceSimulation<SimulationNode>(simNodes)
      .force('link', d3.forceLink<SimulationNode, SimulationLink>(simLinks)
        .id(d => d.id)
        .distance(150))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<SimulationNode>().radius(d => NODE_SIZE[d.type] + 10));

    // If all nodes have positions, stop simulation immediately
    if (allNodesHavePositions) {
      simulation.alpha(0).stop();
    } else {
      // Run briefly for new nodes, then stop
      simulation.alpha(0.3).alphaDecay(0.1);
    }

    simulationRef.current = simulation;

    // Draw shared-officer overlay (red dashed lines) – behind normal links
    const overlayGroup = container.append('g').attr('class', 'relationship-overlay');
    const overlayLineElements = overlayGroup
      .selectAll<SVGLineElement, OverlayLink>('line')
      .data(overlayLinkData)
      .join('line')
      .attr('stroke', '#dc2626')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '6 4')
      .attr('stroke-opacity', 0.8)
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    // Draw links
    const linkGroup = container.append('g').attr('class', 'links');
    const linkElements = linkGroup.selectAll('line')
      .data(simLinks)
      .join('line')
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6);

    // Draw link labels
    const linkLabelGroup = container.append('g').attr('class', 'link-labels');
    const linkLabels = linkLabelGroup.selectAll('text')
      .data(simLinks)
      .join('text')
      .attr('font-size', '10px')
      .attr('fill', '#64748b')
      .attr('text-anchor', 'middle')
      .text(d => d.label || '');

    // Draw nodes
    const nodeGroup = container.append('g').attr('class', 'nodes');

    // Track if node was dragged
    let isDragging = false;
    let dragStartPos = { x: 0, y: 0 };

    const nodeElements = nodeGroup.selectAll<SVGGElement, SimulationNode>('g')
      .data(simNodes)
      .join('g')
      .attr('cursor', 'grab')
      .call(d3.drag<SVGGElement, SimulationNode>()
        .on('start', function (event, d) {
          isDragging = false;
          dragStartPos = { x: event.x, y: event.y };
          d3.select(this).attr('cursor', 'grabbing');
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', function (event, d) {
          // Check if actually dragging (moved more than 5 pixels)
          const dx = event.x - dragStartPos.x;
          const dy = event.y - dragStartPos.y;
          if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            isDragging = true;
          }

          // Update position during drag
          d.fx = event.x;
          d.fy = event.y;
          d.x = event.x;
          d.y = event.y;

          // Manually update positions without simulation
          d3.select(this).attr('transform', `translate(${d.x},${d.y})`);

          // Update label position
          labelGroup.selectAll('text')
            .filter((n: any) => n.id === d.id)
            .attr('x', d.x)
            .attr('y', d.y);

          // Update connected links
          linkElements
            .attr('x1', link => link.source.x)
            .attr('y1', link => link.source.y)
            .attr('x2', link => link.target.x)
            .attr('y2', link => link.target.y);

          linkLabels
            .attr('x', link => (link.source.x + link.target.x) / 2)
            .attr('y', link => (link.source.y + link.target.y) / 2);

          overlayLineElements
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        })
        .on('end', function (_event, d) {
          d3.select(this).attr('cursor', 'grab');
          // Keep position fixed permanently
          d.fx = d.x;
          d.fy = d.y;

          // Save position to store
          updateNode(d.id, {
            x: d.x,
            y: d.y,
            fx: d.fx,
            fy: d.fy,
          });

          // If not dragged, treat as click
          if (!isDragging) {
            onNodeClick(d);
          }
          isDragging = false;
        })
      );

    // Add circles to nodes (risk-based stroke; selection takes precedence)
    const getStroke = (d: SimulationNode) => {
      if (selectedNode?.id === d.id) return '#1e293b';
      if (d.type !== 'company') return '#ffffff';
      const r = riskMap.get(d.id);
      if (!r) return '#ffffff';
      if (r.riskLevel === 'high') return '#dc2626';
      if (r.riskLevel === 'medium') return '#ea580c';
      return '#ffffff';
    };
    const getStrokeWidth = (d: SimulationNode) => {
      if (selectedNode?.id === d.id) return 4;
      if (d.type !== 'company') return 3;
      const r = riskMap.get(d.id);
      if (!r) return 3;
      if (r.riskLevel === 'high') return 4;
      if (r.riskLevel === 'medium') return 3;
      return 3;
    };
    nodeElements.append('circle')
      .attr('r', d => NODE_SIZE[d.type])
      .attr('fill', d => NODE_COLOR[d.type])
      .attr('stroke', getStroke)
      .attr('stroke-width', getStrokeWidth)
      .attr('opacity', 0.9);

    // Add icons to nodes
    nodeElements.each(function (d) {
      const node = d3.select(this);
      const iconSize = NODE_SIZE[d.type] * 0.7; // Increased from 0.5 to 0.7 for bigger icons

      const icon = node.append('foreignObject')
        .attr('width', iconSize * 2)
        .attr('height', iconSize * 2)
        .attr('x', -iconSize)
        .attr('y', -iconSize)
        .style('pointer-events', 'none');

      const div = document.createElement('div');
      div.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        color: white;
      `;
      div.innerHTML = `
        <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${d.type === 'company' ? '<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>' : ''}
          ${d.type === 'officer' ? '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' : ''}
          ${d.type === 'psc' ? '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' : ''}
        </svg>
      `;
      icon.node()?.appendChild(div);

      // Risk badge (H/M) for high/medium company risk
      if (d.type === 'company') {
        const r = riskMap.get(d.id);
        if (r && (r.riskLevel === 'high' || r.riskLevel === 'medium')) {
          const badge = r.riskLevel === 'high' ? 'H' : 'M';
          const radius = NODE_SIZE[d.type];
          node
            .append('text')
            .attr('class', 'risk-badge')
            .attr('x', radius * 0.65)
            .attr('y', -radius * 0.65)
            .attr('font-size', '11px')
            .attr('font-weight', '700')
            .attr('fill', r.riskLevel === 'high' ? '#dc2626' : '#ea580c')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .style('pointer-events', 'none')
            .text(badge);
        }
      }
    });

    // Add labels
    const labelGroup = container.append('g').attr('class', 'labels');
    const labels = labelGroup.selectAll('text')
      .data(simNodes)
      .join('text')
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .attr('fill', '#1e293b')
      .attr('text-anchor', 'middle')
      .attr('dy', d => NODE_SIZE[d.type] + 20)
      .attr('pointer-events', 'none')
      .text(d => {
        const maxLen = 25;
        return d.label.length > maxLen ? d.label.substring(0, maxLen) + '...' : d.label;
      });

    // Update positions on tick (only if simulation is running)
    simulation.on('tick', () => {
      linkElements
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      linkLabels
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2);

      overlayLineElements
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      nodeElements.attr('transform', d => `translate(${d.x},${d.y})`);
      labels.attr('x', d => d.x).attr('y', d => d.y);
    });

    // After simulation settles, fix all node positions and save
    simulation.on('end', () => {
      simNodes.forEach(node => {
        node.fx = node.x;
        node.fy = node.y;

        // Save to store
        updateNode(node.id, {
          x: node.x,
          y: node.y,
          fx: node.fx,
          fy: node.fy,
        });
      });
    });

    // Initial position update
    linkElements
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    linkLabels
      .attr('x', d => (d.source.x + d.target.x) / 2)
      .attr('y', d => (d.source.y + d.target.y) / 2);

    overlayLineElements
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    nodeElements.attr('transform', d => `translate(${d.x},${d.y})`);
    labels.attr('x', d => d.x).attr('y', d => d.y);

    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [graphData, dimensions, selectedNode, filters, onNodeClick, updateNode]);

  return (
    <div className="relative w-full h-full bg-white rounded-lg shadow-sm">
      <svg ref={svgRef} className="w-full h-full" style={{ minHeight: '400px' }} />

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
              <div className="w-3 h-3 rounded-full border border-slate-300" style={{ backgroundColor: NODE_COLOR.company }} />
              <span className="text-xs text-slate-700">Company</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLOR.officer }} />
              <span className="text-xs text-slate-700">Officer</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLOR.psc }} />
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
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-red-600" style={{ backgroundColor: NODE_COLOR.company }} />
              <span className="text-xs text-slate-700">High</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-orange-500" style={{ backgroundColor: NODE_COLOR.company }} />
              <span className="text-xs text-slate-700">Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border border-slate-300" style={{ backgroundColor: NODE_COLOR.company }} />
              <span className="text-xs text-slate-700">Low</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
