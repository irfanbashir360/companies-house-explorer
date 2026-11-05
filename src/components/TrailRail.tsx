import React, { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useGraphStore } from '../store/graphStore';
import { analyzeNetwork, type ShellCompanyAnalysis } from '../utils/networkAnalysis';
import { COLOR } from '../theme';
import { NodeGlyph } from './NodeGlyph';
import type { GraphData, GraphNode, NodeType } from '../types';

interface TrailRailProps {
  onExplore: (depth: number) => void;
  isExploring: boolean;
}

const linkEnd = (end: string | GraphNode) => (typeof end === 'string' ? end : end.id);

const neighbourCount = (graphData: GraphData, id: string, type?: NodeType) => {
  const ids = new Set<string>();
  graphData.links.forEach((l) => {
    const s = linkEnd(l.source);
    const t = linkEnd(l.target);
    if (s === id) ids.add(t);
    if (t === id) ids.add(s);
  });
  if (!type) return ids.size;
  return graphData.nodes.filter((n) => ids.has(n.id) && n.type === type).length;
};

export const TrailRail: React.FC<TrailRailProps> = ({ onExplore, isExploring }) => {
  const { graphData, trail, selectedNode, setSelectedNode, setHighlight } = useGraphStore();
  const [tab, setTab] = useState<'trail' | 'risk'>('trail');
  const [depth, setDepth] = useState(3);

  const analysis = useMemo(() => analyzeNetwork(graphData), [graphData]);
  const riskById = useMemo(
    () => new Map<string, ShellCompanyAnalysis>(analysis.shellCompanyRisks.map((r) => [r.companyId, r])),
    [analysis]
  );
  const nodeById = useMemo(() => new Map(graphData.nodes.map((n) => [n.id, n])), [graphData]);

  const steps = trail.map((id) => nodeById.get(id)).filter((n): n is GraphNode => Boolean(n));
  const flagged = analysis.shellCompanyRisks
    .filter((r) => r.riskLevel !== 'low')
    .sort((a, b) => b.riskScore - a.riskScore);
  const manyBoards = graphData.nodes
    .filter((n) => n.type === 'officer')
    .map((n) => ({ node: n, count: neighbourCount(graphData, n.id, 'company') }))
    .filter((x) => x.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Group shared-officer pairs by the person who links them
  const sharedByOfficer = useMemo(() => {
    const byOfficer = new Map<string, Set<string>>();
    analysis.sharedOfficerConnections.forEach((c) => {
      if (!byOfficer.has(c.officer)) byOfficer.set(c.officer, new Set());
      c.companies.forEach((id) => byOfficer.get(c.officer)!.add(nodeById.get(id)?.label ?? id));
    });
    return [...byOfficer.entries()]
      .map(([officer, companies]) => ({ officer, companies: [...companies] }))
      .sort((a, b) => b.companies.length - a.companies.length);
  }, [analysis, nodeById]);

  const start = steps[0];
  const canExplore = graphData.nodes.some((n) => n.type === 'company') && !isExploring;

  const select = (node: GraphNode | undefined) => node && setSelectedNode(node);

  const stepDetail = (node: GraphNode, index: number) => {
    if (node.type === 'company') {
      const people = neighbourCount(graphData, node.id, 'officer') + neighbourCount(graphData, node.id, 'psc');
      if (!node.expanded) return index === 0 ? 'Starting point, not opened yet' : 'Not opened yet';
      return `${people} ${people === 1 ? 'person' : 'people'} found`;
    }
    const companies = neighbourCount(graphData, node.id, 'company');
    return `${companies} ${companies === 1 ? 'company' : 'companies'} found`;
  };

  const tabButton = (id: 'trail' | 'risk', label: string, count?: number) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={`relative pb-2.5 text-sm font-bold transition-colors ${
        tab === id ? 'text-ink' : 'text-muted hover:text-ink'
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className="ml-1.5 tabular text-xs font-bold text-alert">{count}</span>
      )}
      {tab === id && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-nexis rounded-full" />}
    </button>
  );

  return (
    <aside className="hidden lg:flex w-72 flex-shrink-0 bg-rail border-r border-line flex-col min-h-0" aria-label="Investigation">
      <div className="px-5 pt-4 flex gap-6 border-b border-line" role="tablist">
        {tabButton('trail', 'Trail')}
        {tabButton('risk', 'Risk', flagged.length)}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin" role="tabpanel">
        {tab === 'trail' && (
          <>
            {steps.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted leading-relaxed">
                Every company and person you open is added here, in order. Hover a step to see how it connects
                back to where you started.
              </p>
            ) : (
              <ol className="py-2" onMouseLeave={() => setHighlight(null)}>
                {steps.map((node, i) => {
                  const active = selectedNode?.id === node.id;
                  return (
                    <li key={node.id}>
                      <button
                        type="button"
                        onClick={() => select(node)}
                        onMouseEnter={() => setHighlight(i === 0 ? null : node.id)}
                        onFocus={() => setHighlight(i === 0 ? null : node.id)}
                        onBlur={() => setHighlight(null)}
                        className={`group w-full flex gap-3 pl-5 pr-4 py-2 text-left transition-colors ${
                          active ? 'bg-nexis-wash' : 'hover:bg-canvas'
                        }`}
                      >
                        <span className="w-5 pt-0.5 text-xs font-bold text-muted/70 tabular text-right">{i + 1}</span>
                        <span className="pt-[3px]">
                          <NodeGlyph type={node.type} risk={riskById.get(node.id)?.riskLevel} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-ink leading-snug break-words">{node.label}</span>
                          <span className="block text-xs text-muted mt-0.5">{stepDetail(node, i)}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </>
        )}

        {tab === 'risk' && (
          <div className="px-5 py-4 space-y-7">
            <section>
              <h2 className="text-sm font-bold text-ink mb-1">Flagged companies</h2>
              {flagged.length === 0 ? (
                <p className="text-sm text-muted">
                  {graphData.nodes.length === 0
                    ? 'Open a company to check it for shell-company warning signs.'
                    : 'No company in this network shows shell-company warning signs.'}
                </p>
              ) : (
                <ul className="-mx-2">
                  {flagged.map((r) => (
                    <li key={r.companyId}>
                      <button
                        type="button"
                        onClick={() => select(nodeById.get(r.companyId))}
                        className="w-full flex gap-2.5 px-2 py-2 rounded-md text-left hover:bg-canvas"
                      >
                        <span className="pt-[3px]">
                          <NodeGlyph type="company" risk={r.riskLevel} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-ink leading-snug">{r.companyName}</span>
                          <span className="block text-xs mt-0.5" style={{ color: r.riskLevel === 'high' ? COLOR.alert : COLOR.amber }}>
                            {r.riskLevel === 'high' ? 'High risk' : 'Medium risk'}
                          </span>
                          <span className="block text-xs text-muted mt-0.5 leading-relaxed">
                            {r.flags.slice(0, 2).join('. ')}
                            {r.flags.length > 2 && `, and ${r.flags.length - 2} more`}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="text-sm font-bold text-ink mb-1">Shared officers</h2>
              {sharedByOfficer.length === 0 ? (
                <p className="text-sm text-muted">No two companies here share an officer yet.</p>
              ) : (
                <ul className="space-y-3">
                  {sharedByOfficer.slice(0, 8).map(({ officer, companies }) => (
                    <li key={officer} className="text-sm leading-snug">
                      <span className="font-bold text-ink">{officer}</span>
                      <span className="text-muted"> links {companies.length} companies</span>
                      <span className="block text-xs text-muted mt-0.5">{companies.join(', ')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="text-sm font-bold text-ink mb-1">People on several boards</h2>
              {manyBoards.length === 0 ? (
                <p className="text-sm text-muted">Nobody here is an officer of more than one company yet.</p>
              ) : (
                <ul className="-mx-2">
                  {manyBoards.map(({ node, count }) => (
                    <li key={node.id}>
                      <button
                        type="button"
                        onClick={() => select(node)}
                        className="w-full flex items-center justify-between gap-3 px-2 py-1.5 rounded-md text-left hover:bg-canvas"
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <NodeGlyph type="officer" />
                          <span className="text-sm text-ink truncate">{node.label}</span>
                        </span>
                        <span className="text-xs font-bold text-muted tabular shrink-0">{count} companies</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Explore further */}
      <div className="border-t border-line px-5 py-4 bg-white">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-ink" id="depth-label">
            Explore further
          </h2>
          <div className="flex rounded-md border border-line p-0.5" role="radiogroup" aria-labelledby="depth-label">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={depth === n}
                aria-label={`${n} ${n === 1 ? 'step' : 'steps'}`}
                onClick={() => setDepth(n)}
                className={`w-7 h-6 rounded text-xs font-bold tabular transition-colors ${
                  depth === n ? 'bg-ink text-white' : 'text-muted hover:text-ink'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted leading-relaxed mb-3">
          {start
            ? `Opens every company and person up to ${depth} ${depth === 1 ? 'step' : 'steps'} from ${start.label}.`
            : 'Search for a company first, then open its wider network in one go.'}
        </p>
        <button
          type="button"
          onClick={() => canExplore && onExplore(depth)}
          disabled={!canExplore}
          className="w-full h-10 rounded-md bg-nexis hover:bg-nexis-dark text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isExploring ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Exploring
            </>
          ) : (
            `Explore ${depth} ${depth === 1 ? 'step' : 'steps'}`
          )}
        </button>
      </div>
    </aside>
  );
};
