import React from 'react';
import { Users, Building2, Link2, TrendingUp } from 'lucide-react';
import { useGraphStore } from '../store/graphStore';
import { analyzeNetwork } from '../utils/networkAnalysis';
import type { SharedOfficerConnection, ShellCompanyAnalysis } from '../utils/networkAnalysis';

const STAR_TOPOLOGY_THRESHOLD = 5;

function getOfficerCompanyCount(
  officerId: string,
  graphData: { nodes: { id: string; type: string }[]; links: { source: unknown; target: unknown }[] }
): number {
  const companyIds = new Set(
    graphData.nodes.filter(n => n.type === 'company').map(n => n.id)
  );
  let count = 0;
  graphData.links.forEach(link => {
    const sourceId = typeof link.source === 'string' ? link.source : (link.source as { id: string }).id;
    const targetId = typeof link.target === 'string' ? link.target : (link.target as { id: string }).id;
    if (sourceId !== officerId && targetId !== officerId) return;
    const other = sourceId === officerId ? targetId : sourceId;
    if (companyIds.has(other)) count++;
  });
  return count;
}

function companyLabel(nodes: { id: string; label: string }[], companyId: string): string {
  const node = nodes.find(n => n.id === companyId);
  return node?.label ?? companyId.replace('company-', '');
}

export const RelationshipAnalysisPanel: React.FC = () => {
  const { graphData } = useGraphStore();

  const companies = graphData.nodes.filter(n => n.type === 'company');
  const hasData = companies.length > 0;

  if (!hasData) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <Link2 className="w-5 h-5 text-slate-700" />
          <h3 className="font-semibold text-slate-900 tracking-tight">Relationship & Risk</h3>
        </div>
        <p className="text-sm text-slate-500">
          Explore a company network to see relationship and risk analysis.
        </p>
      </div>
    );
  }

  const analysis = analyzeNetwork(graphData);
  const { sharedOfficerConnections, shellCompanyRisks, stats } = analysis;

  const sortedRisks = [...shellCompanyRisks].sort((a, b) => b.riskScore - a.riskScore);

  const officers = graphData.nodes.filter(n => n.type === 'officer');
  const officerCompanyCounts = officers.map(o => ({
    officer: o,
    count: getOfficerCompanyCount(o.id, graphData),
  }));
  const starOfficers = officerCompanyCounts
    .filter(x => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5 space-y-5">
      <div className="flex items-center gap-2.5">
        <Link2 className="w-5 h-5 text-slate-700" />
        <h3 className="font-semibold text-slate-900 tracking-tight">Relationship & Risk</h3>
      </div>

      {/* Shared officer connections */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-slate-600" />
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Shared officer connections
          </span>
        </div>
        {stats.totalSharedConnections > 0 ? (
          <>
            <div className="text-xs text-slate-500 mb-2">
              {stats.totalSharedConnections} connection{stats.totalSharedConnections !== 1 ? 's' : ''} in graph
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
              {sharedOfficerConnections.map((conn: SharedOfficerConnection, i: number) => {
                const [a, b] = conn.companies;
                const labelA = companyLabel(graphData.nodes, a);
                const labelB = companyLabel(graphData.nodes, b);
                return (
                  <div
                    key={`${a}-${b}-${i}`}
                    className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50"
                  >
                    <div className="text-sm font-medium text-slate-900 truncate" title={labelA}>
                      {labelA}
                    </div>
                    <div className="text-xs text-slate-500 py-0.5">↔</div>
                    <div className="text-sm font-medium text-slate-900 truncate" title={labelB}>
                      {labelB}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      Shared: <span className="font-medium">{conn.officer}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">No shared-officer connections in current graph.</p>
        )}
      </div>

      {/* Shell company risk */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="w-4 h-4 text-slate-600" />
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Shell company risk
          </span>
        </div>
        {(stats.highRiskCompanies > 0 || stats.mediumRiskCompanies > 0) && (
          <div className="text-xs text-slate-500 mb-2">
            {stats.highRiskCompanies} high, {stats.mediumRiskCompanies} medium
          </div>
        )}
        <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin">
          {sortedRisks.map((r: ShellCompanyAnalysis) => (
            <div
              key={r.companyId}
              className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-sm font-semibold text-slate-900 truncate min-w-0">
                  {r.companyName}
                </div>
                <span
                  className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${
                    r.riskLevel === 'high'
                      ? 'bg-red-100 text-red-700'
                      : r.riskLevel === 'medium'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {r.riskLevel === 'high' ? 'H' : r.riskLevel === 'medium' ? 'M' : 'L'}
                </span>
              </div>
              {r.companyId.replace('company-', '') && (
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  {r.companyId.replace('company-', '')}
                </div>
              )}
              <div className="text-xs text-slate-500 mt-1">Score: {r.riskScore}</div>
              {r.flags.length > 0 && (
                <ul className="text-xs text-slate-600 mt-1.5 space-y-0.5">
                  {r.flags.slice(0, 4).map((f, i) => (
                    <li key={i}>• {f}</li>
                  ))}
                  {r.flags.length > 4 && (
                    <li className="text-slate-400">+{r.flags.length - 4} more</li>
                  )}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Star topology */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-slate-600" />
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Network patterns (star topology)
          </span>
        </div>
        {starOfficers.length > 0 ? (
          <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
            {starOfficers.map(({ officer, count }) => (
              <div
                key={officer.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900 truncate">
                    {officer.label}
                  </div>
                  {count >= STAR_TOPOLOGY_THRESHOLD && (
                    <div className="text-xs text-amber-600 font-medium mt-0.5">
                      Possible star topology
                    </div>
                  )}
                </div>
                <div className="text-sm font-bold text-slate-900 shrink-0 ml-2">
                  {count} companies
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No officer–company links in current graph.</p>
        )}
      </div>
    </div>
  );
};
