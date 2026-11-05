import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import type { GraphNode } from '../types';
import { useGraphStore } from '../store/graphStore';
import { analyzeShellCompanyRisk } from '../utils/networkAnalysis';
import { COLOR, NODE_TYPE_LABEL } from '../theme';
import { NodeGlyph } from './NodeGlyph';

interface DossierProps {
  node: GraphNode | null;
  onClose: () => void;
  onExpand: (node: GraphNode) => void;
}

// Plain-English names for the commonest Companies House company types
const COMPANY_TYPE: Record<string, string> = {
  ltd: 'Private limited company',
  plc: 'Public limited company',
  llp: 'Limited liability partnership',
  'private-unlimited': 'Private unlimited company',
  'private-limited-guarant-nsc': 'Limited by guarantee',
  'private-limited-guarant-nsc-limited-exemption': 'Limited by guarantee',
  'limited-partnership': 'Limited partnership',
  'scottish-partnership': 'Scottish partnership',
  'registered-society-non-jurisdictional': 'Registered society',
};

const linkEnd = (end: string | GraphNode) => (typeof end === 'string' ? end : end.id);

/** Right-hand panel: everything known about the selected company or person */
export const Dossier: React.FC<DossierProps> = ({ node: selected, onClose, onExpand }) => {
  const { graphData, setSelectedNode } = useGraphStore();
  // Use the live copy from the graph so "expanded" etc. stay current
  const node = selected ? graphData.nodes.find((n) => n.id === selected.id) ?? selected : null;

  const risk = useMemo(
    () => (node?.type === 'company' ? analyzeShellCompanyRisk(node, graphData) : null),
    [node, graphData]
  );

  const connections = useMemo(() => {
    if (!node) return [];
    const byId = new Map(graphData.nodes.map((n) => [n.id, n]));
    return graphData.links
      .map((l) => {
        const s = linkEnd(l.source);
        const t = linkEnd(l.target);
        const other = s === node.id ? t : t === node.id ? s : null;
        return other && byId.get(other) ? { node: byId.get(other)!, role: l.label } : null;
      })
      .filter((c): c is { node: GraphNode; role: string | undefined } => Boolean(c))
      // One row per connected node, even if older saved networks hold duplicate links
      .filter((c, i, all) => all.findIndex((o) => o.node.id === c.node.id) === i);
  }, [node, graphData]);

  if (!node) return null;

  const renderCompanyInfo = () => {
    const data = node.data;
    return (
      <div className="space-y-4">
        <InfoField label="Status" value={data.company_status}>
          <span
            className={`text-sm font-bold capitalize ${data.company_status === 'active' ? 'text-teal' : 'text-muted'}`}
          >
            {data.company_status}
          </span>
        </InfoField>
        <InfoField label="Type" value={COMPANY_TYPE[data.type] ?? data.type?.replace(/-/g, ' ')} />
        {data.date_of_creation && (
          <InfoField label="Incorporated" value={formatDate(data.date_of_creation)} />
        )}
        {data.registered_office_address && (
          <InfoField label="Registered office">
            <div className="text-sm text-ink">
              {formatAddress(data.registered_office_address)}
            </div>
          </InfoField>
        )}
        {data.sic_codes && data.sic_codes.length > 0 && (
          <InfoField label="Industry (SIC) codes">
            <div className="flex flex-wrap gap-1">
              {data.sic_codes.map((code: string) => (
                <span
                  key={code}
                  className="inline-block px-2 py-0.5 text-xs bg-canvas text-ink rounded tabular"
                >
                  {code}
                </span>
              ))}
            </div>
          </InfoField>
        )}
      </div>
    );
  };

  const renderOfficerInfo = () => {
    const data = node.data;
    const appointmentCount = data.appointment_count || (data.appointments?.length || 0);

    return (
      <div className="space-y-4">
        {appointmentCount > 0 && (
          <InfoField label="Appointments">
            <div className="text-sm font-semibold text-ink">{appointmentCount}</div>
          </InfoField>
        )}
        {data.officer_role && <InfoField label="Role" value={data.officer_role} />}
        {data.appointed_on && (
          <InfoField label="Appointed" value={formatDate(data.appointed_on)} />
        )}
        {data.resigned_on && (
          <InfoField label="Resigned" value={formatDate(data.resigned_on)}>
            <span className="text-sm text-alert">{formatDate(data.resigned_on)}</span>
          </InfoField>
        )}
        {data.nationality && <InfoField label="Nationality" value={data.nationality} />}
        {data.occupation && <InfoField label="Occupation" value={data.occupation} />}
        {data.date_of_birth && (
          <InfoField
            label="Born"
            value={`${data.date_of_birth.month}/${data.date_of_birth.year}`}
          />
        )}
        {data.address && (
          <InfoField label="Address">
            <div className="text-sm text-ink">{formatAddress(data.address)}</div>
          </InfoField>
        )}
      </div>
    );
  };

  const renderPSCInfo = () => {
    const data = node.data;
    return (
      <div className="space-y-4">
        <InfoField label="Kind" value={data.kind?.replace(/-/g, ' ')} />
        {data.nationality && <InfoField label="Nationality" value={data.nationality} />}
        {data.country_of_residence && (
          <InfoField label="Lives in" value={data.country_of_residence} />
        )}
        {data.natures_of_control && data.natures_of_control.length > 0 && (
          <InfoField label="Control">
            <div className="space-y-1">
              {data.natures_of_control.map((nature: string, index: number) => (
                <div key={index} className="text-sm text-ink">
                  {nature.replace(/-/g, ' ')}
                </div>
              ))}
            </div>
          </InfoField>
        )}
        {data.notified_on && (
          <InfoField label="Notified" value={formatDate(data.notified_on)} />
        )}
        {data.ceased_on && (
          <InfoField label="Ceased" value={formatDate(data.ceased_on)}>
            <span className="text-sm text-alert">{formatDate(data.ceased_on)}</span>
          </InfoField>
        )}
        {data.address && (
          <InfoField label="Address">
            <div className="text-sm text-ink">{formatAddress(data.address)}</div>
          </InfoField>
        )}
      </div>
    );
  };

  const renderChargeInfo = () => {
    const data = node.data;
    return (
      <div className="space-y-4">
        {data.charge_number && (
          <InfoField label="Charge number" value={data.charge_number} />
        )}
        {data.status && (
          <InfoField label="Status">
            <span
              className={`text-sm font-bold capitalize ${data.status === 'outstanding' ? 'text-amber' : 'text-teal'}`}
            >
              {data.status}
            </span>
          </InfoField>
        )}
        {data.classification && (
          <InfoField label="Classification" value={data.classification.description} />
        )}
        {data.created_on && (
          <InfoField label="Created" value={formatDate(data.created_on)} />
        )}
        {data.persons_entitled && data.persons_entitled.length > 0 && (
          <InfoField label="Lenders">
            <div className="space-y-1">
              {data.persons_entitled.map((person: any, index: number) => (
                <div key={index} className="text-sm text-ink">
                  {person.name}
                </div>
              ))}
            </div>
          </InfoField>
        )}
        {data.particulars?.description && (
          <InfoField label="Description">
            <div className="text-sm text-ink">{data.particulars.description}</div>
          </InfoField>
        )}
      </div>
    );
  };

  const renderFilingInfo = () => {
    const data = node.data;
    return (
      <div className="space-y-4">
        <InfoField label="Type" value={data.type} />
        <InfoField label="Category" value={data.category} />
        {data.description && <InfoField label="Description" value={data.description} />}
        {data.date && <InfoField label="Date" value={formatDate(data.date)} />}
        {data.action_date && (
          <InfoField label="Action date" value={formatDate(data.action_date)} />
        )}
      </div>
    );
  };

  const renderEstablishmentInfo = () => {
    const data = node.data;
    return (
      <div className="space-y-4">
        <InfoField label="Company number" value={data.company_number} />
        <InfoField label="Company name" value={data.company_name} />
        {data.company_status && <InfoField label="Status" value={data.company_status} />}
        {data.locality && <InfoField label="Locality" value={data.locality} />}
      </div>
    );
  };

  const renderContent = () => {
    // Ensure node type is valid
    if (!node.type) {
      return (
        <div className="text-sm text-muted">
          <p>This item has no type, so its details can't be shown.</p>
          <pre className="mt-2 text-xs bg-canvas p-2 rounded overflow-auto">
            {JSON.stringify(node, null, 2)}
          </pre>
        </div>
      );
    }

    switch (node.type) {
      case 'company':
        return renderCompanyInfo();
      case 'officer':
        return renderOfficerInfo();
      case 'psc':
        return renderPSCInfo();
      case 'charge':
        return renderChargeInfo();
      case 'filing':
        return renderFilingInfo();
      case 'establishment':
        return renderEstablishmentInfo();
      default:
        return (
          <div className="space-y-4">
            <div className="text-sm text-muted">
              Unrecognised type: <span className="font-semibold">{node.type}</span>
            </div>
            <InfoField label="ID" value={node.id} />
            <InfoField label="Name" value={node.label} />
            {node.data && (
              <InfoField label="Raw data">
                <pre className="text-xs bg-canvas p-2 rounded overflow-auto max-h-96">
                  {JSON.stringify(node.data, null, 2)}
                </pre>
              </InfoField>
            )}
          </div>
        );
    }
  };

  const canExpand = node.type === 'company' || node.type === 'officer';
  const number = node.type === 'company' ? node.data?.company_number : null;

  return (
    <aside className="absolute inset-y-0 right-0 z-20 w-full sm:w-96 lg:static lg:z-auto flex-shrink-0 h-full flex flex-col bg-white border-l border-line shadow-xl lg:shadow-none" aria-label="Details">
      <header className="px-6 pt-5 pb-4 border-b border-line">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs font-bold text-muted">
            <NodeGlyph type={node.type} risk={risk?.riskLevel} />
            {NODE_TYPE_LABEL[node.type] ?? node.type}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="p-1.5 -mr-1.5 rounded-md text-muted hover:text-ink hover:bg-canvas"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <h2 className="mt-2 text-xl font-black text-ink leading-tight tracking-tight break-words">{node.label}</h2>
        {number && <p className="mt-1 text-sm text-muted tabular">Company no. {number}</p>}
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {risk && risk.riskLevel !== 'low' && (
          <section
            className="mx-6 mt-5 pl-3.5 py-0.5 border-l-[3px]"
            style={{ borderColor: risk.riskLevel === 'high' ? COLOR.alert : COLOR.amber }}
          >
            <h3 className="text-sm font-bold" style={{ color: risk.riskLevel === 'high' ? COLOR.alert : COLOR.amber }}>
              {risk.riskLevel === 'high' ? 'High' : 'Medium'} shell-company risk
            </h3>
            <ul className="mt-1 space-y-0.5 text-sm text-ink">
              {risk.flags.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </section>
        )}

        <div className="px-6 py-5">{renderContent()}</div>

        {connections.length > 0 && (
          <section className="px-6 pb-6">
            <h3 className="text-sm font-bold text-ink mb-1.5">
              Connected to <span className="tabular">{connections.length}</span>
            </h3>
            <ul className="-mx-2">
              {connections.slice(0, 40).map(({ node: other, role }) => (
                <li key={other.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedNode(other)}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left hover:bg-canvas"
                  >
                    <NodeGlyph type={other.type} />
                    <span className="flex-1 min-w-0 text-sm text-ink truncate">{other.label}</span>
                    {role && <span className="text-xs text-muted capitalize shrink-0">{role}</span>}
                  </button>
                </li>
              ))}
            </ul>
            {connections.length > 40 && (
              <p className="text-xs text-muted mt-1">and {connections.length - 40} more on the graph</p>
            )}
          </section>
        )}
      </div>

      {canExpand && (
        <footer className="px-6 py-4 border-t border-line">
          {node.expanded ? (
            <p className="text-sm text-muted text-center py-2">
              {node.type === 'company' ? 'Officers and owners are on the graph' : 'Their companies are on the graph'}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => onExpand(node)}
              className="w-full h-10 rounded-md bg-nexis hover:bg-nexis-dark text-white text-sm font-bold transition-colors"
            >
              {node.type === 'company' ? 'Show officers and owners' : 'Show their companies'}
            </button>
          )}
        </footer>
      )}
    </aside>
  );
};

// One labelled fact in the dossier
const InfoField: React.FC<{
  label: string;
  value?: string | number;
  children?: React.ReactNode;
}> = ({ label, value, children }) => (
  <div>
    <div className="text-xs text-muted mb-0.5">{label}</div>
    {children || <div className="text-sm text-ink">{value || 'Not listed'}</div>}
  </div>
);

// Helper functions
const formatDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

const formatAddress = (address: any): string => {
  const parts = [
    address.address_line_1,
    address.address_line_2,
    address.locality,
    address.region,
    address.postal_code,
    address.country,
  ].filter(Boolean);
  return parts.join(', ');
};
