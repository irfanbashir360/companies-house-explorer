import React from 'react';
import {
  X,
  Building2,
  User,
  Shield,
  FileText,
  Link as LinkIcon,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import type { GraphNode } from '../types';

interface InfoPanelProps {
  node: GraphNode | null;
  onClose: () => void;
  onExpand: (node: GraphNode) => void;
}

export const InfoPanel: React.FC<InfoPanelProps> = ({ node, onClose, onExpand }) => {
  if (!node) return null;

  const getIcon = () => {
    const icons = {
      company: Building2,
      officer: User,
      psc: Shield,
      charge: LinkIcon,
      filing: FileText,
      establishment: MapPin,
    };
    const Icon = icons[node.type];
    return <Icon className="w-6 h-6" />;
  };

  const getIconColor = () => {
    const colors = {
      company: 'text-blue-500',
      officer: 'text-purple-500',
      psc: 'text-pink-500',
      charge: 'text-amber-500',
      filing: 'text-green-500',
      establishment: 'text-cyan-500',
    };
    return colors[node.type];
  };

  const renderCompanyInfo = () => {
    const data = node.data;
    return (
      <div className="space-y-5">
        <InfoField label="Company Number" value={data.company_number} />
        <InfoField label="Status" value={data.company_status}>
          <span
            className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full ${data.company_status === 'active'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-slate-100 text-slate-800'
              }`}
          >
            {data.company_status}
          </span>
        </InfoField>
        <InfoField label="Type" value={data.type} />
        {data.date_of_creation && (
          <InfoField label="Incorporated" value={formatDate(data.date_of_creation)} />
        )}
        {data.registered_office_address && (
          <InfoField label="Registered Office">
            <div className="text-sm text-slate-900">
              {formatAddress(data.registered_office_address)}
            </div>
          </InfoField>
        )}
        {data.sic_codes && data.sic_codes.length > 0 && (
          <InfoField label="SIC Codes">
            <div className="flex flex-wrap gap-1">
              {data.sic_codes.map((code: string) => (
                <span
                  key={code}
                  className="inline-block px-2.5 py-1 text-xs bg-slate-100 text-slate-700 rounded-md font-medium"
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
      <div className="space-y-5">
        {appointmentCount > 0 && (
          <InfoField label="Total Appointments">
            <div className="text-sm font-semibold text-slate-900">{appointmentCount}</div>
          </InfoField>
        )}
        {data.officer_role && <InfoField label="Role" value={data.officer_role} />}
        {data.appointed_on && (
          <InfoField label="Appointed" value={formatDate(data.appointed_on)} />
        )}
        {data.resigned_on && (
          <InfoField label="Resigned" value={formatDate(data.resigned_on)}>
            <span className="text-sm text-red-600">{formatDate(data.resigned_on)}</span>
          </InfoField>
        )}
        {data.nationality && <InfoField label="Nationality" value={data.nationality} />}
        {data.occupation && <InfoField label="Occupation" value={data.occupation} />}
        {data.date_of_birth && (
          <InfoField
            label="Date of Birth"
            value={`${data.date_of_birth.month}/${data.date_of_birth.year}`}
          />
        )}
        {data.address && (
          <InfoField label="Address">
            <div className="text-sm text-slate-900">{formatAddress(data.address)}</div>
          </InfoField>
        )}
      </div>
    );
  };

  const renderPSCInfo = () => {
    const data = node.data;
    return (
      <div className="space-y-5">
        <InfoField label="Kind" value={data.kind} />
        {data.nationality && <InfoField label="Nationality" value={data.nationality} />}
        {data.country_of_residence && (
          <InfoField label="Country of Residence" value={data.country_of_residence} />
        )}
        {data.natures_of_control && data.natures_of_control.length > 0 && (
          <InfoField label="Nature of Control">
            <div className="space-y-1">
              {data.natures_of_control.map((nature: string, index: number) => (
                <div key={index} className="text-sm text-slate-900">
                  • {nature.replace(/-/g, ' ')}
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
            <span className="text-sm text-red-600">{formatDate(data.ceased_on)}</span>
          </InfoField>
        )}
        {data.address && (
          <InfoField label="Address">
            <div className="text-sm text-slate-900">{formatAddress(data.address)}</div>
          </InfoField>
        )}
      </div>
    );
  };

  const renderChargeInfo = () => {
    const data = node.data;
    return (
      <div className="space-y-5">
        {data.charge_number && (
          <InfoField label="Charge Number" value={data.charge_number} />
        )}
        {data.status && (
          <InfoField label="Status">
            <span
              className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full ${data.status === 'outstanding'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-800'
                }`}
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
          <InfoField label="Persons Entitled">
            <div className="space-y-1">
              {data.persons_entitled.map((person: any, index: number) => (
                <div key={index} className="text-sm text-slate-900">
                  {person.name}
                </div>
              ))}
            </div>
          </InfoField>
        )}
        {data.particulars?.description && (
          <InfoField label="Description">
            <div className="text-sm text-slate-900">{data.particulars.description}</div>
          </InfoField>
        )}
      </div>
    );
  };

  const renderFilingInfo = () => {
    const data = node.data;
    return (
      <div className="space-y-5">
        <InfoField label="Type" value={data.type} />
        <InfoField label="Category" value={data.category} />
        {data.description && <InfoField label="Description" value={data.description} />}
        {data.date && <InfoField label="Date" value={formatDate(data.date)} />}
        {data.action_date && (
          <InfoField label="Action Date" value={formatDate(data.action_date)} />
        )}
      </div>
    );
  };

  const renderEstablishmentInfo = () => {
    const data = node.data;
    return (
      <div className="space-y-5">
        <InfoField label="Company Number" value={data.company_number} />
        <InfoField label="Company Name" value={data.company_name} />
        {data.company_status && <InfoField label="Status" value={data.company_status} />}
        {data.locality && <InfoField label="Locality" value={data.locality} />}
      </div>
    );
  };

  const renderContent = () => {
    // Ensure node type is valid
    if (!node.type) {
      return (
        <div className="text-sm text-slate-500">
          <p>Node type not specified</p>
          <pre className="mt-2 text-xs bg-slate-100 p-2 rounded overflow-auto">
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
          <div className="space-y-5">
            <div className="text-sm text-slate-500">
              Unknown node type: <span className="font-semibold">{node.type}</span>
            </div>
            <InfoField label="Node ID" value={node.id} />
            <InfoField label="Node Label" value={node.label} />
            {node.data && (
              <InfoField label="Raw Data">
                <pre className="text-xs bg-slate-100 p-2 rounded overflow-auto max-h-96">
                  {JSON.stringify(node.data, null, 2)}
                </pre>
              </InfoField>
            )}
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200/60">
      {/* Header */}
      <div className="flex items-start gap-3 p-6 border-b border-slate-200/60 bg-slate-50/50">
        <div className={`${getIconColor()} mt-1`}>{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-slate-900 break-words tracking-tight">
            {node.label}
          </h2>
          <p className="text-xs text-slate-500 capitalize mt-1 font-medium uppercase tracking-wide">{node.type}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin bg-white">
        {renderContent()}
      </div>

      {/* Actions */}
      <div className="p-6 border-t border-slate-200/60 bg-slate-50/30">
        {!node.expanded && (node.type === 'company' || node.type === 'officer') && (
          <button
            onClick={() => onExpand(node)}
            className="w-full px-4 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all duration-200 font-semibold text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
          >
            <ExternalLink className="w-4 h-4" />
            Explore Connections
          </button>
        )}
        {node.expanded && (
          <div className="text-sm text-slate-500 text-center py-2">
            Node already expanded
          </div>
        )}
      </div>
    </div>
  );
};

// Helper component for info fields
const InfoField: React.FC<{
  label: string;
  value?: string | number;
  children?: React.ReactNode;
}> = ({ label, value, children }) => (
  <div>
    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
      {label}
    </div>
    {children || <div className="text-sm text-slate-900 font-medium">{value || 'N/A'}</div>}
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
