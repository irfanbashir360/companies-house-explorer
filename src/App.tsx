import { useState, useCallback } from 'react';
import { NetworkGraph } from './components/NetworkGraph';
import { SearchBar } from './components/SearchBar';
import { InfoPanel } from './components/InfoPanel';
import { FilterPanel } from './components/FilterPanel';
import { Toolbar } from './components/Toolbar';
import { SearchHistory } from './components/SearchHistory';
import { ExplorationPanel } from './components/ExplorationPanel';
import { RelationshipPanel } from './components/RelationshipPanel';
import { RelationshipAnalysisPanel } from './components/RelationshipAnalysisPanel';
import { AnalysisPanel } from './components/AnalysisPanel';
import { Logo } from './components/Logo';
import { useGraphStore } from './store/graphStore';
import { companiesHouseAPI } from './services/companiesHouse';
import type { GraphNode, GraphLink } from './types';
import { seedPositionsAround } from './utils/layout';
import { Loader2, AlertCircle } from 'lucide-react';

function App() {
  const {
    addNode,
    addNodes,
    addLinks,
    setSelectedNode,
    selectedNode,
    updateNode,
    clearGraph,
    addToHistory,
    graphData,
  } = useGraphStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExploring, setIsExploring] = useState(false);

  // Handle node click - update side panel
  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      setSelectedNode(node);
    },
    [setSelectedNode]
  );

  // Expand a node to show connections
  const handleExpandNode = useCallback(
    async (staleNode: GraphNode) => {
      // The caller's copy may be out of date (e.g. the selected node in the
      // side panel), so read the latest position/expanded state from the store.
      const node =
        useGraphStore.getState().graphData.nodes.find((n) => n.id === staleNode.id) ?? staleNode;
      if (node.expanded) return;

      setLoading(true);
      setError(null);

      try {
        const newNodes: GraphNode[] = [];
        const newLinks: GraphLink[] = [];

        if (node.type === 'company') {
          // Expand company -> show officers and PSCs
          const companyNumber = node.data?.company_number || node.id.replace('company-', '');
          const relations = await companiesHouseAPI.getCompanyRelations(companyNumber);

          (relations.officers?.items ?? []).forEach((officer: any, index: number) => {
            const officerId =
              officer.links?.officer?.appointments?.split('/').slice(-2)[0] ||
              `${companyNumber}-officer-${index}`;
            const officerNode: GraphNode = {
              id: `officer-${officerId}`,
              label: officer.name,
              type: 'officer',
              data: officer,
              expanded: false,
            };
            newNodes.push(officerNode);
            newLinks.push({
              source: node.id,
              target: officerNode.id,
              type: 'officer',
              label: officer.officer_role,
            });
          });

          (relations.pscs?.items ?? []).forEach((psc: any, index: number) => {
            const pscNode: GraphNode = {
              id: `psc-${companyNumber}-${index}`,
              label: psc.name,
              type: 'psc',
              data: psc,
              expanded: false,
            };
            newNodes.push(pscNode);
            newLinks.push({
              source: node.id,
              target: pscNode.id,
              type: 'psc',
              label: 'PSC',
            });
          });
        } else if (node.type === 'officer') {
          // Expand officer -> show their active companies
          const officerId = node.id.replace('officer-', '');
          const appointmentsData = await companiesHouseAPI.getOfficerAppointments(officerId);

          (appointmentsData.items ?? [])
            .filter((app: any) => !app.resigned_on && app.appointed_to)
            .slice(0, 15)
            .forEach((appointment: any) => {
              const companyId = `company-${appointment.appointed_to.company_number}`;
              newNodes.push({
                id: companyId,
                label: appointment.appointed_to.company_name,
                type: 'company',
                data: appointment.appointed_to,
                expanded: false,
              });
              newLinks.push({
                source: node.id,
                target: companyId,
                type: 'appointment',
                label: appointment.officer_role,
              });
            });
        }

        // Seed only genuinely new nodes next to the parent, facing away from
        // where we came from. They are left unpinned so the force layout in
        // NetworkGraph can relax them into a cluster without overlaps.
        const graphNow = useGraphStore.getState().graphData;
        const existingIds = new Set(graphNow.nodes.map((n) => n.id));
        const unique = newNodes.filter(
          (n, i) => !existingIds.has(n.id) && newNodes.findIndex((m) => m.id === n.id) === i
        );
        const seeds = seedPositionsAround(node, graphNow, unique.length);
        unique.forEach((n, i) => {
          n.x = seeds[i].x;
          n.y = seeds[i].y;
          n.fx = null;
          n.fy = null;
        });

        addNodes(unique);
        addLinks(newLinks);
        updateNode(node.id, { expanded: true });
      } catch (err: any) {
        console.error('Error expanding node:', err);
        setError('Failed to expand node');
      } finally {
        setLoading(false);
      }
    },
    [addNodes, addLinks, updateNode]
  );

  // Search for and add a company
  const handleSelectCompany = useCallback(
    async (companyNumber: string, companyName: string) => {
      setLoading(true);
      setError(null);

      try {
        clearGraph();

        const profile = await companiesHouseAPI.getCompanyProfile(companyNumber);
        // Prefer the official name from the profile over the search result's name
        const resolvedName = profile.company_name || companyName;

        // Place initial company at center
        const companyNode: GraphNode = {
          id: `company-${companyNumber}`,
          label: resolvedName,
          type: 'company',
          data: profile,
          expanded: false,
          x: 400,
          y: 300,
          fx: 400,
          fy: 300,
          pinned: true,
        };

        addNode(companyNode);
        setSelectedNode(companyNode);

        // Add to search history
        addToHistory({
          id: `${Date.now()}-${companyNumber}`,
          query: resolvedName,
          type: 'company',
          timestamp: Date.now(),
          result: {
            id: companyNumber,
            name: resolvedName,
          },
        });
      } catch (err: any) {
        console.error('Error fetching company:', err);
        setError('Failed to fetch company data');
      } finally {
        setLoading(false);
      }
    },
    [clearGraph, addNode, setSelectedNode, addToHistory]
  );

  // Search for and add an officer
  const handleSelectOfficer = useCallback(
    async (officerId: string, officerName: string) => {
      setLoading(true);
      setError(null);

      try {
        clearGraph();

        // Place initial officer at center
        const officerNode: GraphNode = {
          id: `officer-${officerId}`,
          label: officerName,
          type: 'officer',
          data: { name: officerName },
          expanded: false,
          x: 400,
          y: 300,
          fx: 400,
          fy: 300,
          pinned: true,
        };

        addNode(officerNode);
        setSelectedNode(officerNode);

        // Add to search history
        addToHistory({
          id: `${Date.now()}-${officerId}`,
          query: officerName,
          type: 'officer',
          timestamp: Date.now(),
          result: {
            id: officerId,
            name: officerName,
          },
        });

        // Automatically expand to show their companies
        await handleExpandNode(officerNode);
      } catch (err: any) {
        console.error('Error fetching officer:', err);
        setError('Failed to fetch officer data');
      } finally {
        setLoading(false);
      }
    },
    [clearGraph, addNode, setSelectedNode, addToHistory, handleExpandNode]
  );

  // Explore to depth with delays
  const exploreToDepth = useCallback(
    async (startNode: GraphNode, maxDepth: number) => {
      setIsExploring(true);
      setError(null);

      const exploreNode = async (node: GraphNode, currentDepth: number): Promise<void> => {
        if (currentDepth >= maxDepth || node.expanded) {
          return;
        }

        // Delay before each expansion
        const delay = currentDepth === 0 ? 1500 : 2000;
        await new Promise((resolve) => setTimeout(resolve, delay));

        try {
          await handleExpandNode(node);
          await new Promise((resolve) => setTimeout(resolve, 800));

          const currentGraphData = useGraphStore.getState().graphData;
          const nodesToExpand: GraphNode[] = [];

          if (node.type === 'company') {
            const connectedNodes = currentGraphData.links
              .filter((link) => {
                const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
                return sourceId === node.id;
              })
              .map((link) => {
                const targetId = typeof link.target === 'string' ? link.target : link.target.id;
                return currentGraphData.nodes.find((n) => n.id === targetId);
              })
              .filter((n): n is GraphNode => n !== undefined && (n.type === 'officer' || n.type === 'psc'))
              .filter((n) => !n.expanded);

            nodesToExpand.push(...connectedNodes.slice(0, 10));
          } else if (node.type === 'officer') {
            const connectedNodes = currentGraphData.links
              .filter((link) => {
                const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
                return sourceId === node.id;
              })
              .map((link) => {
                const targetId = typeof link.target === 'string' ? link.target : link.target.id;
                return currentGraphData.nodes.find((n) => n.id === targetId);
              })
              .filter((n): n is GraphNode => n !== undefined && n.type === 'company')
              .filter((n) => !n.expanded);

            nodesToExpand.push(...connectedNodes.slice(0, 5));
          }

          for (const nextNode of nodesToExpand) {
            if (currentDepth + 1 < maxDepth) {
              await new Promise((resolve) => setTimeout(resolve, 1500));
              await exploreNode(nextNode, currentDepth + 1);
            }
          }
        } catch (err: any) {
          console.error(`Error in explore at depth ${currentDepth}:`, err);
        }
      };

      try {
        await exploreNode(startNode, 0);
      } finally {
        setIsExploring(false);
      }
    },
    [handleExpandNode]
  );

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="relative z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="px-8 py-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <Logo size={44} className="flex-shrink-0" />
              <div>
                <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                  Tracewire
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  Explore company structures, officers, and ownership networks
                  <span className="text-slate-400"> · Data from Companies House</span>
                </p>
              </div>
            </div>
            <Toolbar />
          </div>

          <SearchBar
            onSelectCompany={handleSelectCompany}
            onSelectOfficer={handleSelectOfficer}
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 bg-slate-50/50 border-r border-slate-200/60 overflow-y-auto scrollbar-thin p-5 space-y-5">
          <ExplorationPanel
            onExplore={(depth) => {
              const companyNode = graphData.nodes.find((n) => n.type === 'company');
              if (companyNode) {
                exploreToDepth(companyNode, depth);
              }
            }}
            isExploring={isExploring}
          />
          <AnalysisPanel />
          <RelationshipAnalysisPanel />
          <RelationshipPanel selectedNode={selectedNode} />
          <FilterPanel />
          <SearchHistory
            onSelectCompany={handleSelectCompany}
            onSelectOfficer={handleSelectOfficer}
          />
        </aside>

        {/* Graph Area */}
        <main className="flex-1 p-6 relative bg-white">
          {loading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-xl shadow-xl border border-slate-200">
                <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
                <span className="text-slate-700 font-medium text-sm">Loading...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10">
              <div className="flex items-center gap-3 bg-red-50 px-6 py-4 rounded-xl shadow-xl border border-red-200">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-red-900 font-semibold text-sm">Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="ml-4 text-red-600 hover:text-red-700"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <NetworkGraph onNodeClick={handleNodeClick} />
        </main>

        {/* Info Panel */}
        {selectedNode && (
          <aside className="w-96 overflow-hidden">
            <InfoPanel
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
              onExpand={handleExpandNode}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

export default App;
