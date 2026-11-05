import { useState, useCallback } from 'react';
import { NetworkGraph } from './components/NetworkGraph';
import { SearchBar } from './components/SearchBar';
import { Dossier } from './components/Dossier';
import { Toolbar } from './components/Toolbar';
import { TrailRail } from './components/TrailRail';
import { GraphKey, GraphStats, EmptyState } from './components/GraphOverlays';
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
    addToTrail,
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
        addToTrail(node.id);
      } catch (err: any) {
        console.error('Error expanding node:', err);
        setError("Couldn't load these connections from Companies House. Try again in a moment.");
      } finally {
        setLoading(false);
      }
    },
    [addNodes, addLinks, updateNode, addToTrail]
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
        addToTrail(companyNode.id);
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
        setError("Couldn't load this company from Companies House. Check the company number and try again.");
      } finally {
        setLoading(false);
      }
    },
    [clearGraph, addNode, setSelectedNode, addToHistory, addToTrail]
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
        addToTrail(officerNode.id);
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
        setError("Couldn't load this officer from Companies House. Try again in a moment.");
      } finally {
        setLoading(false);
      }
    },
    [clearGraph, addNode, setSelectedNode, addToHistory, addToTrail, handleExpandNode]
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
    <div className="h-screen flex flex-col bg-white">
      <header className="relative z-50 h-14 flex-shrink-0 flex items-center gap-3 lg:gap-6 px-4 lg:px-5 border-b border-line bg-white">
        <div className="flex items-center gap-2.5 lg:w-[15.5rem] flex-shrink-0">
          <Logo size={30} />
          <h1 className="hidden sm:block text-lg font-black text-ink tracking-tight">Tracewire</h1>
        </div>
        <div className="flex-1 min-w-0 max-w-2xl">
          <SearchBar onSelectCompany={handleSelectCompany} onSelectOfficer={handleSelectOfficer} />
        </div>
        <div className="ml-auto flex-shrink-0">
          <Toolbar />
        </div>
      </header>

      <div className="flex-1 flex min-h-0 relative">
        <TrailRail
          onExplore={(depth) => {
            const companyNode = graphData.nodes.find((n) => n.type === 'company');
            if (companyNode) exploreToDepth(companyNode, depth);
          }}
          isExploring={isExploring}
        />

        <main className="flex-1 relative min-w-0 bg-white overflow-hidden">
          <NetworkGraph onNodeClick={handleNodeClick} />

          {graphData.nodes.length === 0 ? (
            <EmptyState onSelectCompany={handleSelectCompany} onSelectOfficer={handleSelectOfficer} />
          ) : (
            <>
              <GraphStats />
              <GraphKey />
            </>
          )}

          {loading && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-ink text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg" role="status">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading from Companies House
            </div>
          )}

          {error && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 max-w-md flex items-start gap-3 bg-white border border-line border-l-[3px] border-l-alert px-4 py-3 rounded-md shadow-lg" role="alert">
              <AlertCircle className="w-4 h-4 text-alert mt-0.5 flex-shrink-0" />
              <p className="text-sm text-ink flex-1">{error}</p>
              <button type="button" onClick={() => setError(null)} className="text-sm font-bold text-muted hover:text-ink">
                Dismiss
              </button>
            </div>
          )}
        </main>

        {selectedNode && (
          <Dossier node={selectedNode} onClose={() => setSelectedNode(null)} onExpand={handleExpandNode} />
        )}
      </div>
    </div>
  );
}

export default App;
