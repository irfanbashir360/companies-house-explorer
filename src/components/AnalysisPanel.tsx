import React from 'react';
import { BarChart3, Users, Building2, Link2, TrendingUp } from 'lucide-react';
import { useGraphStore } from '../store/graphStore';

export const AnalysisPanel: React.FC = () => {
    const { graphData } = useGraphStore();

    // Calculate statistics
    const stats = {
        totalNodes: graphData.nodes.length,
        totalLinks: graphData.links.length,
        companies: graphData.nodes.filter((n) => n.type === 'company').length,
        officers: graphData.nodes.filter((n) => n.type === 'officer').length,
        pscs: graphData.nodes.filter((n) => n.type === 'psc').length,
        charges: graphData.nodes.filter((n) => n.type === 'charge').length,
        filings: graphData.nodes.filter((n) => n.type === 'filing').length,
        establishments: graphData.nodes.filter((n) => n.type === 'establishment').length,
    };

    // Find most connected nodes
    const getNodeConnectionCount = (nodeId: string) => {
        return graphData.links.filter((link) => {
            const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
            const targetId = typeof link.target === 'string' ? link.target : link.target.id;
            return sourceId === nodeId || targetId === nodeId;
        }).length;
    };

    const mostConnectedNodes = graphData.nodes
        .map((node) => ({
            node,
            connections: getNodeConnectionCount(node.id),
        }))
        .sort((a, b) => b.connections - a.connections)
        .slice(0, 5);

    // Calculate average connections per node
    const avgConnections =
        graphData.nodes.length > 0
            ? (graphData.links.length * 2) / graphData.nodes.length
            : 0;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5 space-y-5">
            <div className="flex items-center gap-2.5">
                <BarChart3 className="w-5 h-5 text-slate-700" />
                <h3 className="font-semibold text-slate-900 tracking-tight">Network Analysis</h3>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                        Nodes
                    </div>
                    <div className="text-xl font-bold text-slate-900">{stats.totalNodes}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                        Links
                    </div>
                    <div className="text-xl font-bold text-slate-900">{stats.totalLinks}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                        Avg Connections
                    </div>
                    <div className="text-xl font-bold text-slate-900">
                        {avgConnections.toFixed(1)}
                    </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                        Density
                    </div>
                    <div className="text-xl font-bold text-slate-900">
                        {stats.totalNodes > 0
                            ? ((stats.totalLinks / (stats.totalNodes * (stats.totalNodes - 1))) * 100).toFixed(2)
                            : '0'}
                        %
                    </div>
                </div>
            </div>

            {/* Node Type Breakdown */}
            <div>
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
                    Node Types
                </div>
                <div className="space-y-2">
                    {[
                        { type: 'Companies', count: stats.companies, icon: Building2 },
                        { type: 'Officers', count: stats.officers, icon: Users },
                        { type: 'PSCs', count: stats.pscs, icon: Users },
                        { type: 'Charges', count: stats.charges, icon: Link2 },
                        { type: 'Filings', count: stats.filings, icon: Link2 },
                        { type: 'Establishments', count: stats.establishments, icon: Building2 },
                    ]
                        .filter((item) => item.count > 0)
                        .map(({ type, count, icon: Icon }) => (
                            <div key={type} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                                <div className="flex items-center gap-2.5">
                                    <Icon className="w-4 h-4 text-slate-600" />
                                    <span className="text-sm font-medium text-slate-700">{type}</span>
                                </div>
                                <span className="text-sm font-semibold text-slate-900">{count}</span>
                            </div>
                        ))}
                </div>
            </div>

            {/* Most Connected Nodes */}
            {mostConnectedNodes.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-slate-600" />
                        <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            Most Connected
                        </div>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                        {mostConnectedNodes.map(({ node, connections }, index) => (
                            <div
                                key={node.id}
                                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-slate-900 truncate">
                                        {index + 1}. {node.label}
                                    </div>
                                    <div className="text-xs text-slate-500 capitalize mt-0.5">{node.type}</div>
                                </div>
                                <div className="text-sm font-bold text-slate-900 ml-3">
                                    {connections}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {stats.totalNodes === 0 && (
                <div className="text-sm text-slate-500 text-center py-4">
                    No data to analyze. Start exploring to see statistics.
                </div>
            )}
        </div>
    );
};
