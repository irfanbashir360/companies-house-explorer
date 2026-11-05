import React, { useMemo, useState } from 'react';
import { Building2, ChevronDown, Eye, EyeOff, User } from 'lucide-react';
import { useGraphStore } from '../store/graphStore';
import { analyzeNetwork } from '../utils/networkAnalysis';
import { COLOR } from '../theme';
import { NodeGlyph } from './NodeGlyph';
import type { NodeType } from '../types';

type FilterKey = 'companies' | 'officers' | 'pscs';
const KEY_ROWS: Array<{ type: NodeType; filter: FilterKey; label: string }> = [
  { type: 'company', filter: 'companies', label: 'Companies' },
  { type: 'officer', filter: 'officers', label: 'Officers' },
  { type: 'psc', filter: 'pscs', label: 'People with significant control' },
];

/** Legend in the corner of the canvas. Each node type doubles as a show/hide switch. */
export const GraphKey: React.FC = () => {
  const { graphData, filters, setFilter } = useGraphStore();
  const [open, setOpen] = useState(true);

  const counts = useMemo(() => {
    const c: Partial<Record<NodeType, number>> = {};
    graphData.nodes.forEach((n) => (c[n.type] = (c[n.type] ?? 0) + 1));
    return c;
  }, [graphData]);

  return (
    <div className="hidden md:block absolute bottom-4 right-4 w-64 bg-white/95 backdrop-blur rounded-lg border border-line shadow-[0_8px_24px_-12px_rgba(0,23,46,0.3)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-bold text-ink"
      >
        Key
        <ChevronDown className={`w-4 h-4 text-muted transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>

      {open && (
        <div className="px-3.5 pb-3.5 space-y-3.5">
          <div>
            <ul className="-mx-1.5">
              {KEY_ROWS.map(({ type, filter, label }) => {
                const shown = filters[filter];
                return (
                  <li key={type}>
                    <button
                      type="button"
                      aria-pressed={shown}
                      onClick={() => setFilter(filter, !shown)}
                      title={shown ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
                      className={`w-full flex items-center gap-2.5 px-1.5 py-1 rounded text-left text-xs hover:bg-canvas transition-opacity ${
                        shown ? '' : 'opacity-45'
                      }`}
                    >
                      <NodeGlyph type={type} />
                      <span className="flex-1 text-ink leading-tight">{label}</span>
                      <span className="tabular text-muted">{counts[type] ?? 0}</span>
                      {shown ? <Eye className="w-3.5 h-3.5 text-muted" /> : <EyeOff className="w-3.5 h-3.5 text-muted" />}
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="text-[11px] text-muted mt-1">Click a type to hide or show it.</p>
          </div>

          <div className="border-t border-line pt-3 space-y-1.5 text-xs text-ink">
            <div className="flex items-center gap-2.5">
              <NodeGlyph type="company" risk="high" />
              High shell-company risk
            </div>
            <div className="flex items-center gap-2.5">
              <NodeGlyph type="company" risk="medium" />
              Medium shell-company risk
            </div>
            <div className="flex items-center gap-2.5">
              <svg width="14" height="14" aria-hidden="true" className="flex-shrink-0">
                <line x1="0" y1="7" x2="14" y2="7" stroke={COLOR.alert} strokeWidth="1.5" strokeDasharray="4 2.5" />
              </svg>
              Companies sharing an officer
            </div>
            <div className="flex items-center gap-2.5">
              <svg width="14" height="14" aria-hidden="true" className="flex-shrink-0">
                <line x1="0" y1="7" x2="14" y2="7" stroke={COLOR.nexis} strokeWidth="3" />
              </svg>
              Traced path from the start
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/** One quiet line of facts about the network, bottom-left of the canvas */
export const GraphStats: React.FC = () => {
  const { graphData } = useGraphStore();
  const stats = useMemo(() => {
    const a = analyzeNetwork(graphData);
    return {
      companies: graphData.nodes.filter((n) => n.type === 'company').length,
      people: graphData.nodes.filter((n) => n.type === 'officer' || n.type === 'psc').length,
      high: a.stats.highRiskCompanies,
    };
  }, [graphData]);

  return (
    <div className="absolute bottom-4 left-4 flex items-center gap-4 text-xs text-muted pointer-events-none bg-white/90 backdrop-blur rounded-md px-3 py-1.5">
      <span>
        <b className="tabular text-ink">{stats.companies}</b> {stats.companies === 1 ? 'company' : 'companies'}
      </span>
      <span>
        <b className="tabular text-ink">{stats.people}</b> {stats.people === 1 ? 'person' : 'people'}
      </span>
      {stats.high > 0 && (
        <span style={{ color: COLOR.alert }}>
          <b className="tabular">{stats.high}</b> high risk
        </span>
      )}
      <span className="text-muted/70">Data from Companies House</span>
    </div>
  );
};

interface EmptyStateProps {
  onSelectCompany: (companyNumber: string, companyName: string) => void;
  onSelectOfficer: (officerId: string, officerName: string) => void;
}

/** Shown on an empty canvas: what to do first, plus recent searches to reopen */
export const EmptyState: React.FC<EmptyStateProps> = ({ onSelectCompany, onSelectOfficer }) => {
  const { searchHistory } = useGraphStore();
  const recent = searchHistory.filter((h) => h.result).slice(0, 5);

  return (
    <div className="absolute inset-0 flex items-center justify-center p-8">
      <div className="max-w-md">
        <svg width="120" height="64" viewBox="0 0 120 64" aria-hidden="true" className="mb-6">
          <g stroke={COLOR.linkGrey} strokeWidth="1.5">
            <line x1="30" y1="32" x2="60" y2="14" />
            <line x1="30" y1="32" x2="60" y2="50" />
            <line x1="60" y1="14" x2="92" y2="32" />
            <line x1="60" y1="50" x2="92" y2="32" strokeDasharray="4 3" />
          </g>
          <circle cx="30" cy="32" r="11" fill={COLOR.ink} />
          <circle cx="92" cy="32" r="11" fill={COLOR.ink} />
          <circle cx="60" cy="14" r="7" fill={COLOR.nexisWash} stroke="#9CCBEB" />
          <circle cx="60" cy="50" r="7" fill={COLOR.tealWash} stroke="#8CC9C9" />
        </svg>
        <h2 className="text-2xl font-black text-ink tracking-tight leading-tight">
          Start with a company or a person
        </h2>
        <p className="mt-2 text-[15px] text-muted leading-relaxed">
          Search above to draw their network. Each company you open adds its officers and owners, and each person
          you open adds the other companies they run.
        </p>

        {recent.length > 0 && (
          <div className="mt-7">
            <h3 className="text-sm font-bold text-ink mb-1.5">Pick up where you left off</h3>
            <ul className="-mx-2">
              {recent.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() =>
                      item.type === 'company'
                        ? onSelectCompany(item.result!.id, item.result!.name)
                        : onSelectOfficer(item.result!.id, item.result!.name)
                    }
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left text-sm text-ink hover:bg-canvas"
                  >
                    {item.type === 'company' ? (
                      <Building2 className="w-4 h-4 text-muted" />
                    ) : (
                      <User className="w-4 h-4 text-muted" />
                    )}
                    {item.result!.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
