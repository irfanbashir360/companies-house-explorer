import { create } from 'zustand';
import type { GraphData, GraphNode, GraphLink, SearchHistoryItem } from '../types';

// Local type definition as workaround for Vite module resolution issue
interface FilterState {
  companies: boolean;
  officers: boolean;
  pscs: boolean;
  charges: boolean;
  filings: boolean;
  establishments: boolean;
}

interface GraphStore {
  // Graph data
  graphData: GraphData;
  selectedNode: GraphNode | null;

  // Filters
  filters: FilterState;

  // Search history
  searchHistory: SearchHistoryItem[];

  // Loading state
  loading: boolean;

  // Trail: ids of the starting node and every node explored, in order
  trail: string[];
  // Node whose path from the start is highlighted (hovering a Trail step)
  highlightId: string | null;

  // Actions
  addNode: (node: GraphNode) => void;
  addNodes: (nodes: GraphNode[]) => void;
  addLink: (link: GraphLink) => void;
  addLinks: (links: GraphLink[]) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, updates: Partial<GraphNode>) => void;
  updateNodes: (updates: Map<string, Partial<GraphNode>>) => void;
  setSelectedNode: (node: GraphNode | null) => void;
  addToTrail: (nodeId: string) => void;
  setHighlight: (nodeId: string | null) => void;
  clearGraph: () => void;
  setGraphData: (data: GraphData) => void;

  // Filter actions
  setFilter: (filterType: keyof FilterState, value: boolean) => void;
  resetFilters: () => void;

  // Search history actions
  addToHistory: (item: SearchHistoryItem) => void;
  clearHistory: () => void;

  // Loading actions
  setLoading: (loading: boolean) => void;

  // Export/Import
  exportGraph: () => string;
  importGraph: (data: string) => void;

  // Relationship helpers
  getNodeConnections: (nodeId: string) => { nodes: GraphNode[]; links: GraphLink[] };
  getPersonCompanies: (personName: string) => { companies: GraphNode[]; roles: Array<{ company: string; role: string }> };
}

const initialFilters: FilterState = {
  companies: true,
  officers: true,
  pscs: true,
  charges: true,
  filings: true,
  establishments: true,
};

export const useGraphStore = create<GraphStore>((set, get) => ({
  graphData: { nodes: [], links: [] },
  selectedNode: null,
  filters: initialFilters,
  searchHistory: [],
  loading: false,
  trail: [],
  highlightId: null,

  addNode: (node) => {
    const { graphData } = get();
    // Check if node already exists
    if (graphData.nodes.find((n) => n.id === node.id)) {
      return;
    }
    set({
      graphData: {
        nodes: [...graphData.nodes, node],
        links: graphData.links,
      },
    });
  },

  addNodes: (nodes) => {
    const { graphData } = get();
    const existingIds = new Set(graphData.nodes.map((n) => n.id));
    const newNodes = nodes.filter((n) => !existingIds.has(n.id));

    if (newNodes.length === 0) return;

    set({
      graphData: {
        nodes: [...graphData.nodes, ...newNodes],
        links: graphData.links,
      },
    });
  },

  addLink: (link) => {
    const { graphData } = get();
    // Check if link already exists
    const linkExists = graphData.links.some(
      (l) =>
        (typeof l.source === 'string' ? l.source : l.source.id) === (typeof link.source === 'string' ? link.source : link.source.id) &&
        (typeof l.target === 'string' ? l.target : l.target.id) === (typeof link.target === 'string' ? link.target : link.target.id)
    );

    if (linkExists) return;

    set({
      graphData: {
        nodes: graphData.nodes,
        links: [...graphData.links, link],
      },
    });
  },

  addLinks: (links) => {
    const { graphData } = get();
    const existingLinks = new Set(
      graphData.links.map((l) =>
        `${typeof l.source === 'string' ? l.source : l.source.id}-${typeof l.target === 'string' ? l.target : l.target.id}`
      )
    );

    const newLinks = links.filter((l) => {
      const key = `${typeof l.source === 'string' ? l.source : l.source.id}-${typeof l.target === 'string' ? l.target : l.target.id}`;
      return !existingLinks.has(key);
    });

    if (newLinks.length === 0) return;

    set({
      graphData: {
        nodes: graphData.nodes,
        links: [...graphData.links, ...newLinks],
      },
    });
  },

  removeNode: (nodeId) => {
    const { graphData } = get();
    set({
      graphData: {
        nodes: graphData.nodes.filter((n) => n.id !== nodeId),
        links: graphData.links.filter(
          (l) =>
            (typeof l.source === 'string' ? l.source : l.source.id) !== nodeId &&
            (typeof l.target === 'string' ? l.target : l.target.id) !== nodeId
        ),
      },
    });
  },

  updateNode: (nodeId, updates) => {
    const { graphData } = get();
    set({
      graphData: {
        nodes: graphData.nodes.map((n) =>
          n.id === nodeId ? { ...n, ...updates } : n
        ),
        links: graphData.links,
      },
    });
  },

  // Apply many node updates in one store write (one graph re-render)
  updateNodes: (updates) => {
    if (updates.size === 0) return;
    const { graphData } = get();
    set({
      graphData: {
        nodes: graphData.nodes.map((n) => {
          const u = updates.get(n.id);
          return u ? { ...n, ...u } : n;
        }),
        links: graphData.links,
      },
    });
  },

  setSelectedNode: (node) => {
    set({ selectedNode: node });
  },

  addToTrail: (nodeId) => {
    const { trail } = get();
    if (!trail.includes(nodeId)) set({ trail: [...trail, nodeId] });
  },

  setHighlight: (nodeId) => {
    set({ highlightId: nodeId });
  },

  clearGraph: () => {
    set({
      graphData: { nodes: [], links: [] },
      selectedNode: null,
      trail: [],
      highlightId: null,
    });
  },

  setGraphData: (data) => {
    set({ graphData: data });
  },

  setFilter: (filterType, value) => {
    set({
      filters: {
        ...get().filters,
        [filterType]: value,
      },
    });
  },

  resetFilters: () => {
    set({ filters: initialFilters });
  },

  addToHistory: (item) => {
    const { searchHistory } = get();
    // Keep only last 50 items (session-based only)
    const newHistory = [item, ...searchHistory].slice(0, 50);
    set({ searchHistory: newHistory });
  },

  clearHistory: () => {
    set({ searchHistory: [] });
  },

  setLoading: (loading) => {
    set({ loading });
  },

  exportGraph: () => {
    const { graphData } = get();
    return JSON.stringify(graphData, null, 2);
  },

  importGraph: (data) => {
    try {
      const parsed = JSON.parse(data) as GraphData;
      // Rebuild the Trail from the saved graph: the pinned start, then explored nodes
      const start = parsed.nodes.find((n) => n.pinned) ?? parsed.nodes[0];
      const trail = [start, ...parsed.nodes.filter((n) => n.expanded && n !== start)]
        .filter(Boolean)
        .map((n) => n.id);
      set({ graphData: parsed, trail, selectedNode: null, highlightId: null });
    } catch (error) {
      console.error('Error importing graph:', error);
    }
  },

  getNodeConnections: (nodeId) => {
    const { graphData } = get();
    const connectedNodeIds = new Set<string>();
    const connectedLinks: GraphLink[] = [];

    graphData.links.forEach((link) => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;

      if (sourceId === nodeId) {
        connectedNodeIds.add(targetId);
        connectedLinks.push(link);
      } else if (targetId === nodeId) {
        connectedNodeIds.add(sourceId);
        connectedLinks.push(link);
      }
    });

    const connectedNodes = graphData.nodes.filter((n) => connectedNodeIds.has(n.id));

    return { nodes: connectedNodes, links: connectedLinks };
  },

  getPersonCompanies: (personName) => {
    const { graphData } = get();
    const personNodes = graphData.nodes.filter(
      (n) => n.type === 'officer' && n.label.toLowerCase() === personName.toLowerCase()
    );

    const companies: GraphNode[] = [];
    const roles: Array<{ company: string; role: string }> = [];

    personNodes.forEach((personNode) => {
      graphData.links.forEach((link) => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;

        if (sourceId === personNode.id) {
          const companyNode = graphData.nodes.find((n) => n.id === targetId && n.type === 'company');
          if (companyNode) {
            companies.push(companyNode);
            roles.push({
              company: companyNode.label,
              role: link.label || 'Unknown',
            });
          }
        }
      });
    });

    return { companies, roles };
  },
}));
