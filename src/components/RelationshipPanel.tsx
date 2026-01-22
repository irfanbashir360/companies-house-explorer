import React from 'react';
import { Building2, User, Link2 } from 'lucide-react';
import { useGraphStore } from '../store/graphStore';
import type { GraphNode } from '../types';

interface RelationshipPanelProps {
    selectedNode: GraphNode | null;
}

export const RelationshipPanel: React.FC<RelationshipPanelProps> = ({ selectedNode }) => {
    const { getPersonCompanies } = useGraphStore();

    if (!selectedNode) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5">
                <div className="flex items-center gap-2.5 mb-4">
                    <Link2 className="w-5 h-5 text-slate-700" />
                    <h3 className="font-semibold text-slate-900 tracking-tight">Relationships</h3>
                </div>
                <p className="text-sm text-slate-500">Select a node to view relationships</p>
            </div>
        );
    }

    // Get connections for the selected node
    const connections = useGraphStore.getState().getNodeConnections(selectedNode.id);

    // If it's an officer, show all their companies
    const personCompanies =
        selectedNode.type === 'officer' ? getPersonCompanies(selectedNode.label) : null;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5 space-y-5">
            <div className="flex items-center gap-2.5">
                <Link2 className="w-5 h-5 text-slate-700" />
                <h3 className="font-semibold text-slate-900 tracking-tight">Relationships</h3>
            </div>

            {/* Connection Count */}
            <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                    Connections
                </div>
                <div className="text-2xl font-bold text-slate-900">{connections.nodes.length}</div>
                <div className="text-xs text-slate-500 mt-1">
                    {connections.links.length} relationship{connections.links.length !== 1 ? 's' : ''}
                </div>
            </div>

            {/* Person-Company Relationships */}
            {personCompanies && personCompanies.companies.length > 0 && (
                <div>
                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
                        Companies ({personCompanies.companies.length})
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                        {personCompanies.companies.map((company, index) => {
                            const role = personCompanies.roles[index];
                            return (
                                <div
                                    key={company.id}
                                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100"
                                >
                                    <Building2 className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-slate-900 truncate">
                                            {company.label}
                                        </div>
                                        {role && (
                                            <div className="text-xs text-slate-600 mt-0.5">
                                                Role: <span className="font-medium">{role.role}</span>
                                            </div>
                                        )}
                                        {company.data?.company_number && (
                                            <div className="text-xs text-slate-400 font-mono mt-1">
                                                {company.data.company_number}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Direct Connections */}
            {connections.nodes.length > 0 && (
                <div>
                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
                        Connected Nodes
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                        {connections.nodes.slice(0, 20).map((node) => {
                            const link = connections.links.find(
                                (l) =>
                                    (typeof l.source === 'string' ? l.source : l.source.id) === node.id ||
                                    (typeof l.target === 'string' ? l.target : l.target.id) === node.id
                            );

                            const getIcon = () => {
                                switch (node.type) {
                                    case 'company':
                                        return <Building2 className="w-4 h-4 text-slate-600" />;
                                    case 'officer':
                                        return <User className="w-4 h-4 text-slate-600" />;
                                    default:
                                        return <Link2 className="w-4 h-4 text-slate-600" />;
                                }
                            };

                            return (
                                <div
                                    key={node.id}
                                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100"
                                >
                                    <div className="mt-0.5 flex-shrink-0">{getIcon()}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-slate-900 truncate">
                                            {node.label}
                                        </div>
                                        <div className="text-xs text-slate-500 capitalize mt-0.5">{node.type}</div>
                                        {link?.label && (
                                            <div className="text-xs text-slate-600 mt-1">
                                                Relationship: <span className="font-medium">{link.label}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {connections.nodes.length > 20 && (
                        <div className="text-xs text-slate-500 mt-2 text-center">
                            +{connections.nodes.length - 20} more connections
                        </div>
                    )}
                </div>
            )}

            {connections.nodes.length === 0 && (
                <div className="text-sm text-slate-500 text-center py-4">
                    No connections found
                </div>
            )}
        </div>
    );
};
